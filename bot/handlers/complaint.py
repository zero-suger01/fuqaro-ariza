"""Murojaat FSM — docs/08-telegram-bot.md T1.3 (wizard bilan bir xil
mantiq): matn/ovoz -> rasmlar -> mahalla/lokatsiya -> tasdiq -> yuborish.
"""
import asyncio
import logging

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

import api
import keyboards as kb
import storage
from i18n import find_key_by_text, t
from states import ComplaintForm

logger = logging.getLogger(__name__)
router = Router(name="complaint")

MAX_PHOTOS = 5
STT_POLL_INTERVAL_S = 2
STT_TIMEOUT_S = 90


async def begin_complaint(message: Message, state: FSMContext, language: str, prefill_neighborhood: dict | None = None) -> None:
    await state.clear()
    await state.set_state(ComplaintForm.description)
    data = {"photos": []}
    if prefill_neighborhood:
        data["neighborhood_id"] = prefill_neighborhood["neighborhood_id"]
        data["neighborhood_name"] = prefill_neighborhood["neighborhood_name"]
        await message.answer(t(language, "qr_neighborhood_prefilled", name=prefill_neighborhood["neighborhood_name"]))
    await state.update_data(**data)
    await message.answer(t(language, "ask_description"), reply_markup=kb.cancel_keyboard(language))


@router.message(F.text.func(lambda text: find_key_by_text(text) == "menu_submit"))
async def menu_submit(message: Message, state: FSMContext) -> None:
    profile = await storage.get_profile(message.chat.id)
    if not profile or not profile.get("phone"):
        return
    await begin_complaint(message, state, profile["language"])


async def _handle_cancel(message: Message, state: FSMContext, language: str) -> bool:
    if find_key_by_text(message.text or "") == "cancel_button":
        await state.clear()
        await message.answer(t(language, "cancelled"), reply_markup=kb.main_menu_keyboard(language))
        return True
    return False


@router.message(ComplaintForm.description, F.text)
async def on_description_text(message: Message, state: FSMContext) -> None:
    profile = await storage.get_profile(message.chat.id)
    language = profile["language"]
    if await _handle_cancel(message, state, language):
        return
    key = find_key_by_text(message.text)
    if key in ("back_button",):
        await message.answer(t(language, "ask_description"), reply_markup=kb.cancel_keyboard(language))
        return

    description = message.text.strip()
    if len(description) < 10:
        await message.answer(t(language, "min_length_error"))
        return

    await state.update_data(description=description)
    await state.set_state(ComplaintForm.photos)
    await message.answer(t(language, "ask_photos"), reply_markup=kb.photos_keyboard(language))


@router.message(ComplaintForm.description, F.voice)
async def on_description_voice(message: Message, state: FSMContext, bot: Bot) -> None:
    profile = await storage.get_profile(message.chat.id)
    language = profile["language"]

    await message.answer(t(language, "voice_transcribing"))
    file = await bot.get_file(message.voice.file_id)
    buf = await bot.download_file(file.file_path)
    audio_bytes = buf.read()

    try:
        job_id = await api.stt_submit(audio=audio_bytes, filename="voice.ogg", mime="audio/ogg", language=language)
    except api.ApiError:
        await message.answer(t(language, "stt_failed"))
        return

    elapsed = 0
    result = None
    while elapsed < STT_TIMEOUT_S:
        await asyncio.sleep(STT_POLL_INTERVAL_S)
        elapsed += STT_POLL_INTERVAL_S
        try:
            result = await api.stt_status(job_id)
        except api.ApiError:
            break
        if result["status"] in ("done", "failed"):
            break

    if not result or result["status"] != "done" or not result.get("text"):
        await message.answer(t(language, "stt_failed"))
        return

    await state.update_data(description=result["text"])
    await state.set_state(ComplaintForm.confirm_voice)
    await message.answer(t(language, "voice_confirm", text=result["text"]), reply_markup=kb.voice_confirm_keyboard(language))


@router.message(ComplaintForm.confirm_voice, F.text)
async def on_confirm_voice(message: Message, state: FSMContext) -> None:
    profile = await storage.get_profile(message.chat.id)
    language = profile["language"]
    if await _handle_cancel(message, state, language):
        return

    key = find_key_by_text(message.text)
    if key == "yes":
        await state.set_state(ComplaintForm.photos)
        await message.answer(t(language, "ask_photos"), reply_markup=kb.photos_keyboard(language))
    else:
        await state.set_state(ComplaintForm.description)
        await message.answer(t(language, "ask_description"), reply_markup=kb.cancel_keyboard(language))


@router.message(ComplaintForm.photos, F.photo)
async def on_photo(message: Message, state: FSMContext, bot: Bot) -> None:
    profile = await storage.get_profile(message.chat.id)
    language = profile["language"]

    data = await state.get_data()
    photos = data.get("photos", [])
    if len(photos) >= MAX_PHOTOS:
        await message.answer(t(language, "photo_limit_reached"))
        return

    largest = message.photo[-1]
    file = await bot.get_file(largest.file_id)
    buf = await bot.download_file(file.file_path)
    photos.append({"filename": f"photo_{len(photos)}.jpg", "content": buf.read().hex(), "mime": "image/jpeg"})
    await state.update_data(photos=photos)

    if len(photos) >= MAX_PHOTOS:
        await _go_to_neighborhood_step(message, state, language)
    else:
        await message.answer(t(language, "photo_added", count=len(photos)))


@router.message(ComplaintForm.photos, F.text)
async def on_photos_text(message: Message, state: FSMContext) -> None:
    profile = await storage.get_profile(message.chat.id)
    language = profile["language"]
    if await _handle_cancel(message, state, language):
        return

    key = find_key_by_text(message.text)
    if key == "back_button":
        await state.set_state(ComplaintForm.description)
        await message.answer(t(language, "ask_description"), reply_markup=kb.cancel_keyboard(language))
        return
    if key == "skip_button":
        await _go_to_neighborhood_step(message, state, language)
        return
    await message.answer(t(language, "ask_photos"), reply_markup=kb.photos_keyboard(language))


async def _go_to_neighborhood_step(message: Message, state: FSMContext, language: str) -> None:
    data = await state.get_data()
    if data.get("neighborhood_id"):
        await _go_to_confirm_step(message, state, language)
        return

    await state.set_state(ComplaintForm.neighborhood)
    try:
        neighborhoods = await api.get_neighborhoods()
    except api.ApiError:
        neighborhoods = []
        await message.answer(t(language, "error_generic"))
    await state.update_data(_neighborhoods=neighborhoods)
    await message.answer(t(language, "ask_neighborhood"), reply_markup=kb.location_keyboard(language))
    if neighborhoods:
        await message.answer(t(language, "or_pick_from_list"), reply_markup=kb.neighborhood_inline_keyboard(neighborhoods, 0, language))


@router.callback_query(ComplaintForm.neighborhood, F.data.startswith("nbpage:"))
async def on_neighborhood_page(callback: CallbackQuery, state: FSMContext) -> None:
    profile = await storage.get_profile(callback.message.chat.id)
    language = profile["language"]
    page = int(callback.data.split(":", 1)[1])
    data = await state.get_data()
    neighborhoods = data.get("_neighborhoods", [])
    await callback.message.edit_reply_markup(reply_markup=kb.neighborhood_inline_keyboard(neighborhoods, page, language))
    await callback.answer()


@router.callback_query(ComplaintForm.neighborhood, F.data.startswith("nb:"))
async def on_neighborhood_pick(callback: CallbackQuery, state: FSMContext) -> None:
    profile = await storage.get_profile(callback.message.chat.id)
    language = profile["language"]
    neighborhood_id = callback.data.split(":", 1)[1]
    data = await state.get_data()
    name = next((n["name"] for n in data.get("_neighborhoods", []) if n["id"] == neighborhood_id), "")
    await state.update_data(neighborhood_id=neighborhood_id, neighborhood_name=name)
    await callback.answer(t(language, "location_saved"))
    await _go_to_confirm_step(callback.message, state, language)


@router.message(ComplaintForm.neighborhood, F.location)
async def on_location(message: Message, state: FSMContext) -> None:
    profile = await storage.get_profile(message.chat.id)
    language = profile["language"]
    await state.update_data(latitude=message.location.latitude, longitude=message.location.longitude)
    await message.answer(t(language, "location_saved"))
    await _go_to_confirm_step(message, state, language)


@router.message(ComplaintForm.neighborhood, F.text)
async def on_neighborhood_text(message: Message, state: FSMContext) -> None:
    profile = await storage.get_profile(message.chat.id)
    language = profile["language"]
    if await _handle_cancel(message, state, language):
        return
    key = find_key_by_text(message.text)
    if key == "back_button":
        await state.set_state(ComplaintForm.photos)
        await message.answer(t(language, "ask_photos"), reply_markup=kb.photos_keyboard(language))


async def _go_to_confirm_step(message: Message, state: FSMContext, language: str) -> None:
    await state.set_state(ComplaintForm.confirm)
    data = await state.get_data()

    lines = [t(language, "confirm_title"), "", f"{t(language, 'confirm_description')}: {data['description']}"]
    if data.get("neighborhood_name"):
        lines.append(f"{t(language, 'confirm_neighborhood')}: {data['neighborhood_name']}")
    photos_count = len(data.get("photos", []))
    if photos_count:
        lines.append(f"{t(language, 'confirm_photos')}: {photos_count}")

    await message.answer("\n".join(lines), reply_markup=kb.confirm_keyboard(language))


@router.message(ComplaintForm.confirm, F.text)
async def on_confirm(message: Message, state: FSMContext) -> None:
    profile = await storage.get_profile(message.chat.id)
    language = profile["language"]
    if await _handle_cancel(message, state, language):
        return

    key = find_key_by_text(message.text)
    if key == "back_button":
        await _go_to_neighborhood_step(message, state, language)
        return
    if key != "confirm_submit_button":
        return

    data = await state.get_data()
    await message.answer(t(language, "submitting"), reply_markup=kb.remove_keyboard())

    images = [(p["filename"], bytes.fromhex(p["content"]), p["mime"]) for p in data.get("photos", [])]
    try:
        result = await api.submit_complaint(
            description=data["description"],
            first_name=profile["first_name"],
            phone=profile["phone"],
            language=language,
            telegram_chat_id=message.chat.id,
            neighborhood_id=data.get("neighborhood_id"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            images=images,
        )
    except api.ApiError as exc:
        logger.warning("submit_complaint failed: %s", exc)
        key = "error_rate_limited" if exc.code == "rate_limited" else "error_validation" if exc.status_code == 422 else "error_generic"
        await message.answer(t(language, key), reply_markup=kb.main_menu_keyboard(language))
        await state.clear()
        return

    await state.clear()
    await message.answer(
        t(language, "submitted_success", ticket=result["ticket_number"]), reply_markup=kb.main_menu_keyboard(language)
    )
