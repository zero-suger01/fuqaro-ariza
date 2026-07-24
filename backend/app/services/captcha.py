"""Cloudflare Turnstile verifikatsiyasi (B4.7).

`TURNSTILE_SECRET_KEY` sozlanmagan bo'lsa captcha butunlay o'chirilgan
hisoblanadi — bu hozircha odatiy holat: frontendda hali Turnstile widget
ulanmagan (real site key yo'q), shu sabab bu backend qismi kalitlar
kelgunga qadar shaffof tarzda o'tkazib yuboradi.
"""
import logging

import httpx

from app.config import get_settings
from app.core.errors import AppError

logger = logging.getLogger(__name__)
settings = get_settings()

_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_captcha(token: str | None, remote_ip: str | None) -> None:
    if not settings.turnstile_secret_key:
        return
    if not token:
        raise AppError(422, "captcha_failed", "Captcha tekshiruvi o'tmadi")
    try:
        resp = httpx.post(
            _VERIFY_URL,
            data={"secret": settings.turnstile_secret_key, "response": token, "remoteip": remote_ip or ""},
            timeout=5,
        )
        resp.raise_for_status()
        result = resp.json()
    except httpx.HTTPError as exc:
        # Cloudflare tomon vaqtincha ishlamasa fuqaroni bloklamaymiz.
        logger.warning("Turnstile verifikatsiyasi o'tkazib yuborildi: %s", exc)
        return
    if not result.get("success"):
        raise AppError(422, "captcha_failed", "Captcha tekshiruvi o'tmadi")
