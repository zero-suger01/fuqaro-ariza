"""Telegram Bot API orqali bildirishnoma (B4.2, docs/03-kontraktlar.md §6):
"backend worker statusi o'zgarganda citizens.telegram_chat_id bo'lsa
Telegram Bot API orqali xabar yuboradi (bot protsessi shart emas)" — ya'ni
bu yerdagi HTTP chaqiruv `bot/` jarayonidan mustaqil ishlaydi.

`send_telegram_message` hech qachon exception ko'tarmaydi (sms.py bilan
bir xil naqsh) — xato bo'lsa `False` qaytaradi, chaqiruvchi buni
`notifications.status`ga `failed` deb yozadi.
"""
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_API_BASE = "https://api.telegram.org"


def send_telegram_message(chat_id: int, text: str, *, reply_markup: dict | None = None) -> bool:
    """`reply_markup` (v1.4) — inline tugmalar (docs/08 T2.2/T2.3).

    Tugmalar backenddan yuboriladi, lekin bosilganini `bot/` jarayoni
    qayta ishlaydi: `callback_data` shu yerda yaratiladi va bot uni
    tahlil qiladi. Bot ishlamayotgan bo'lsa xabar matni baribir yetadi —
    fuqaro `/holat` sahifasidan foydalanishi mumkin.
    """
    if not settings.telegram_bot_token:
        logger.info("Telegram xabar o'tkazib yuborildi (bot token sozlanmagan): chat_id=%s", chat_id)
        return False
    payload: dict = {"chat_id": chat_id, "text": text}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        resp = httpx.post(
            f"{_API_BASE}/bot{settings.telegram_bot_token}/sendMessage",
            json=payload,
            timeout=10,
        )
        resp.raise_for_status()
        return bool(resp.json().get("ok"))
    except httpx.HTTPError as exc:
        logger.warning("Telegram xabar yuborilmadi (chat_id=%s): %s", chat_id, exc)
        return False


def status_keyboard(status: str, ticket: str) -> dict | None:
    """Statusga mos inline tugmalar ([03] §6, docs/08 T2.2–T2.3).

    `callback_data` 64 baytdan oshmasligi kerak (Telegram cheklovi) —
    ticket raqami ~15 belgi, prefiks bilan xavfsiz sig'adi.
    """
    if status == "need_info":
        return {"inline_keyboard": [[{"text": "✍️ Javob yozish", "callback_data": f"info:{ticket}"}]]}
    if status == "resolved":
        return {
            "inline_keyboard": [
                [
                    {"text": "✅ Ha, hal bo'ldi", "callback_data": f"fb_yes:{ticket}"},
                    {"text": "❌ Yo'q", "callback_data": f"fb_no:{ticket}"},
                ]
            ]
        }
    return None
