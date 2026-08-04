"""Eskiz SMS provayderi (B4.1). Token Redis'da keshlanadi (barcha worker/API
jarayonlari o'rtasida umumiy) — Eskiz tokeni ~30 kun amal qiladi.

`send_sms` hech qachon exception ko'tarmaydi: xato bo'lsa `False` qaytaradi,
chaqiruvchi (`notifications.notify_citizen`) buni `notifications.status`ga
`failed` sifatida yozadi. Fuqaroning asosiy oqimi (ariza yuborish, status
o'zgarishi) SMS yetkazib berilmagani uchun to'xtab qolmasligi kerak.
"""
import logging

import httpx
import redis

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_ESKIZ_BASE = "https://notify.eskiz.uz/api"
_TOKEN_KEY = "eskiz:token"
_TOKEN_TTL_SECONDS = 25 * 24 * 3600  # Eskiz tokeni ~30 kun; bir oz erta yangilaymiz
_SMS_FROM = "4546"  # Eskiz test/standart nickname


def _redis() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


def _fetch_token() -> str:
    if not settings.eskiz_email or not settings.eskiz_password:
        raise RuntimeError("ESKIZ_TOKEN yoki ESKIZ_EMAIL/ESKIZ_PASSWORD sozlanmagan")
    resp = httpx.post(
        f"{_ESKIZ_BASE}/auth/login",
        data={"email": settings.eskiz_email, "password": settings.eskiz_password},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["data"]["token"]


def _get_token(*, force_refresh: bool = False) -> str:
    if settings.eskiz_token and not force_refresh:
        return settings.eskiz_token
    r = _redis()
    if not force_refresh:
        cached = r.get(_TOKEN_KEY)
        if cached:
            return cached
    token = _fetch_token()
    r.set(_TOKEN_KEY, token, ex=_TOKEN_TTL_SECONDS)
    return token


def send_sms(phone: str, message: str) -> bool:
    """Best-effort SMS yuborish. Eskiz sozlanmagan bo'lsa jimgina o'tkazib
    yuboriladi (dev muhitida odatiy holat)."""
    if not settings.eskiz_token and (not settings.eskiz_email or not settings.eskiz_password):
        logger.info("SMS o'tkazib yuborildi (Eskiz sozlanmagan): %s", phone)
        return False

    digits = phone.lstrip("+")
    try:
        token = _get_token()
        resp = httpx.post(
            f"{_ESKIZ_BASE}/message/sms/send",
            headers={"Authorization": f"Bearer {token}"},
            data={"mobile_phone": digits, "message": message, "from": _SMS_FROM},
            timeout=10,
        )
        if resp.status_code == 401:
            if settings.eskiz_token and not settings.eskiz_email:
                logger.warning("Eskiz token muddati tugagan (%s)", phone)
                return False
            token = _get_token(force_refresh=True)
            resp = httpx.post(
                f"{_ESKIZ_BASE}/message/sms/send",
                headers={"Authorization": f"Bearer {token}"},
                data={"mobile_phone": digits, "message": message, "from": _SMS_FROM},
                timeout=10,
            )
        resp.raise_for_status()
        return True
    except httpx.HTTPError as exc:
        logger.warning("SMS yuborilmadi (%s): %s", phone, exc)
        return False
