"""docs/08-telegram-bot.md T1.4 — "Murojaatlarim" ro'yxati."""
from aiogram import F, Router
from aiogram.types import Message

import api
import storage
from i18n import STATUS_EMOJI, find_key_by_text, status_label, t

router = Router(name="status")


@router.message(F.text.func(lambda text: find_key_by_text(text) == "menu_my"))
async def menu_my_complaints(message: Message) -> None:
    profile = await storage.get_profile(message.chat.id)
    if not profile or not profile.get("phone"):
        return
    language = profile["language"]

    try:
        complaints = await api.list_complaints(message.chat.id)
    except api.ApiError:
        await message.answer(t(language, "error_generic"))
        return

    if not complaints:
        await message.answer(t(language, "my_complaints_empty"))
        return

    lines = [t(language, "my_complaints_title"), ""]
    for item in complaints:
        emoji = STATUS_EMOJI.get(item["status_simple"], "")
        lines.append(f"{emoji} {item['ticket_number']} — {status_label(language, item['status_simple'])}")

    await message.answer("\n".join(lines))
