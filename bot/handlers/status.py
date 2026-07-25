"""docs/08-telegram-bot.md T1.4 — "Murojaatlarim" ro'yxati; T2.2–T2.3 (v1.4) —
`need_info` javobi va «Hal bo'ldimi?» bahosi.

Nima uchun tugmalar ro'yxatda ham bor: backend status o'zgarganda inline
tugmali push yuboradi (`services/telegram.py status_keyboard`), lekin
fuqaro o'sha xabarni o'chirib yuborishi yoki eski xabarga qaytmasligi
mumkin. «Murojaatlarim» esa doim qo'l ostida — sikl yopilmay qolmaydi.
"""
from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

import api
import storage
from i18n import STATUS_EMOJI, find_key_by_text, status_label, t
from states import InfoReply

router = Router(name="status")

MIN_INFO_LENGTH = 3


def _item_keyboard(language: str, item: dict) -> InlineKeyboardMarkup | None:
    """Murojaat holatiga qarab amal tugmalari."""
    rows: list[list[InlineKeyboardButton]] = []
    ticket = item["ticket_number"]
    if item.get("need_info"):
        rows.append([InlineKeyboardButton(text=t(language, "info_button"), callback_data=f"info:{ticket}")])
    if item.get("can_give_feedback"):
        rows.append(
            [
                InlineKeyboardButton(text=t(language, "feedback_yes"), callback_data=f"fb_yes:{ticket}"),
                InlineKeyboardButton(text=t(language, "feedback_no"), callback_data=f"fb_no:{ticket}"),
            ]
        )
    return InlineKeyboardMarkup(inline_keyboard=rows) if rows else None


async def _language(chat_id: int) -> str | None:
    profile = await storage.get_profile(chat_id)
    if not profile or not profile.get("phone"):
        return None
    return profile["language"]


@router.message(F.text.func(lambda text: find_key_by_text(text) == "menu_my"))
async def menu_my_complaints(message: Message) -> None:
    language = await _language(message.chat.id)
    if language is None:
        return

    try:
        complaints = await api.list_complaints(message.chat.id)
    except api.ApiError:
        await message.answer(t(language, "error_generic"))
        return

    if not complaints:
        await message.answer(t(language, "my_complaints_empty"))
        return

    await message.answer(t(language, "my_complaints_title"))
    for item in complaints:
        emoji = STATUS_EMOJI.get(item["status_simple"], "")
        lines = [f"{emoji} {item['ticket_number']} — {status_label(language, item['status_simple'])}"]
        # v1.4: xodimning savoli ro'yxatda ko'rinadi — fuqaro nima
        # kerakligini bilmasa javob ham bermaydi.
        if item.get("need_info") and item.get("info_request_text"):
            lines.append(t(language, "info_question").format(question=item["info_request_text"]))
        if item.get("can_give_feedback"):
            lines.append(t(language, "feedback_question"))
        await message.answer("\n".join(lines), reply_markup=_item_keyboard(language, item))


@router.callback_query(F.data.startswith("info:"))
async def start_info_reply(callback: CallbackQuery, state: FSMContext) -> None:
    language = await _language(callback.message.chat.id) if callback.message else None
    if language is None:
        await callback.answer()
        return

    ticket = callback.data.split(":", 1)[1]
    await state.set_state(InfoReply.waiting_info)
    await state.update_data(ticket=ticket)
    await callback.message.answer(t(language, "info_prompt"))
    await callback.answer()


@router.message(InfoReply.waiting_info)
async def receive_info_reply(message: Message, state: FSMContext) -> None:
    language = await _language(message.chat.id)
    if language is None:
        return

    text = (message.text or "").strip()
    if len(text) < MIN_INFO_LENGTH:
        await message.answer(t(language, "info_too_short"))
        return

    ticket = (await state.get_data()).get("ticket")
    try:
        result = await api.submit_info(telegram_chat_id=message.chat.id, ticket=ticket, text=text)
    except api.ApiError:
        await message.answer(t(language, "error_generic"))
        await state.clear()
        return

    await state.clear()
    # `accepted` — murojaat avtomatik ijroga qaytdi ([03] §3.5).
    await message.answer(t(language, "info_sent" if result.get("accepted") else "info_sent_no_resume"))


@router.callback_query(F.data.startswith("fb_yes:"))
async def feedback_satisfied(callback: CallbackQuery) -> None:
    language = await _language(callback.message.chat.id) if callback.message else None
    if language is None:
        await callback.answer()
        return

    ticket = callback.data.split(":", 1)[1]
    try:
        await api.submit_feedback(telegram_chat_id=callback.message.chat.id, ticket=ticket, satisfied=True)
    except api.ApiError as exc:
        message_key = "feedback_already" if exc.code == "already_submitted" else "error_generic"
        await callback.message.answer(t(language, message_key))
        await callback.answer()
        return

    await callback.message.answer(t(language, "feedback_thanks"))
    await callback.answer()


@router.callback_query(F.data.startswith("fb_no:"))
async def feedback_not_satisfied(callback: CallbackQuery, state: FSMContext) -> None:
    language = await _language(callback.message.chat.id) if callback.message else None
    if language is None:
        await callback.answer()
        return

    ticket = callback.data.split(":", 1)[1]
    await state.set_state(InfoReply.waiting_feedback_comment)
    await state.update_data(ticket=ticket)
    await callback.message.answer(t(language, "feedback_comment_prompt"))
    await callback.answer()


@router.message(InfoReply.waiting_feedback_comment)
async def receive_feedback_comment(message: Message, state: FSMContext) -> None:
    language = await _language(message.chat.id)
    if language is None:
        return

    ticket = (await state.get_data()).get("ticket")
    comment = (message.text or "").strip() or None
    try:
        result = await api.submit_feedback(
            telegram_chat_id=message.chat.id, ticket=ticket, satisfied=False, comment=comment
        )
    except api.ApiError as exc:
        message_key = "feedback_already" if exc.code == "already_submitted" else "error_generic"
        await message.answer(t(language, message_key))
        await state.clear()
        return

    await state.clear()
    await message.answer(t(language, "feedback_thanks"))
    if result.get("reopened"):
        await message.answer(t(language, "feedback_reopened"))
