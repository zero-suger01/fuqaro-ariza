"""docs/08-telegram-bot.md T1.1/T1.2/T1.5 — /start, til tanlash, kontakt
bog'lash, QR deep-link."""
import logging

from aiogram import F, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

import api
import keyboards as kb
import storage
from handlers.complaint import begin_complaint
from i18n import LANGUAGES, find_key_by_text, t
from states import Onboarding
from utils import normalize_phone

logger = logging.getLogger(__name__)
router = Router(name="start")


async def _resolve_qr_prefill(args: str | None) -> dict | None:
    if not args or not args.startswith("qr_"):
        return None
    code = args.removeprefix("qr_")
    try:
        return await api.get_qr(code)
    except api.ApiError:
        return None


@router.message(CommandStart())
async def cmd_start(message: Message, command: CommandObject, state: FSMContext) -> None:
    prefill = await _resolve_qr_prefill(command.args)
    profile = await storage.get_profile(message.chat.id)

    if profile and profile.get("phone"):
        if prefill:
            await begin_complaint(message, state, profile["language"], prefill_neighborhood=prefill)
        else:
            await message.answer(t(profile["language"], "welcome"), reply_markup=kb.main_menu_keyboard(profile["language"]))
        return

    await state.clear()
    if prefill:
        await state.update_data(qr_prefill=prefill)
    await state.set_state(Onboarding.choosing_language)
    await message.answer(t("uz", "choose_language"), reply_markup=kb.language_inline_keyboard())


@router.callback_query(Onboarding.choosing_language, F.data.startswith("lang:"))
async def on_language_chosen(callback: CallbackQuery, state: FSMContext) -> None:
    language = callback.data.split(":", 1)[1]
    if language not in LANGUAGES:
        language = "uz"

    await storage.save_profile(callback.message.chat.id, language=language)
    await state.set_state(Onboarding.waiting_contact)

    await callback.message.delete()
    await callback.message.answer(t(language, "ask_contact"), reply_markup=kb.contact_keyboard(language))
    await callback.answer()


@router.message(Onboarding.waiting_contact, F.contact)
async def on_contact_shared(message: Message, state: FSMContext) -> None:
    profile = await storage.get_profile(message.chat.id)
    language = profile["language"]

    phone = normalize_phone(message.contact.phone_number)
    if not phone:
        await message.answer(t(language, "error_validation"))
        return

    first_name = message.contact.first_name or message.from_user.first_name or "Fuqaro"
    try:
        await api.link_citizen(phone=phone, telegram_chat_id=message.chat.id, first_name=first_name, language=language)
    except api.ApiError:
        await message.answer(t(language, "error_generic"))
        return

    await storage.save_profile(message.chat.id, phone=phone, first_name=first_name)
    await message.answer(t(language, "contact_saved"), reply_markup=kb.main_menu_keyboard(language))

    data = await state.get_data()
    prefill = data.get("qr_prefill")
    await state.clear()
    if prefill:
        await begin_complaint(message, state, language, prefill_neighborhood=prefill)


@router.message(Onboarding.waiting_contact, F.text)
async def on_contact_step_text(message: Message, state: FSMContext) -> None:
    profile = await storage.get_profile(message.chat.id)
    language = profile["language"]
    if find_key_by_text(message.text) == "cancel_button":
        await message.answer(t(language, "contact_required"), reply_markup=kb.contact_keyboard(language))
        return
    await message.answer(t(language, "ask_contact"), reply_markup=kb.contact_keyboard(language))


@router.message(Command("help"))
@router.message(F.text.func(lambda text: find_key_by_text(text) == "menu_help"))
async def cmd_help(message: Message) -> None:
    profile = await storage.get_profile(message.chat.id)
    language = profile["language"] if profile else "uz"
    await message.answer(t(language, "help_text"))
