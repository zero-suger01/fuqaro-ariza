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


def send_telegram_message(chat_id: int, text: str) -> bool:
    if not settings.telegram_bot_token:
        logger.info("Telegram xabar o'tkazib yuborildi (bot token sozlanmagan): chat_id=%s", chat_id)
        return False
    try:
        resp = httpx.post(
            f"{_API_BASE}/bot{settings.telegram_bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
            timeout=10,
        )
        resp.raise_for_status()
        return bool(resp.json().get("ok"))
    except httpx.HTTPError as exc:
        logger.warning("Telegram xabar yuborilmadi (chat_id=%s): %s", chat_id, exc)
        return False
