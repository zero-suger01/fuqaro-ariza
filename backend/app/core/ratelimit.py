"""Redis-backed fixed-window rate limiting (B4.3, docs/03-kontraktlar.md §3).

Limits per docs/03 §3.1/§3.3: submit 5/soat/telefon + 20/kun/IP, STT
10/soat/IP. `track` isn't given an explicit number in the contract, but it's
an enumeration-guessing surface (ticket + phone) so it gets a conservative
IP limit too.
"""
import redis
from fastapi import Request

from app.config import get_settings
from app.core.errors import AppError

settings = get_settings()
_redis = redis.Redis.from_url(settings.redis_url, decode_responses=True)

_RATE_LIMIT_MESSAGE = "So'rovlar soni chegaradan oshdi. Birozdan keyin qayta urinib ko'ring."


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _hit(key: str, limit: int, window_seconds: int) -> None:
    count = _redis.incr(key)
    if count == 1:
        _redis.expire(key, window_seconds)
    if count > limit:
        raise AppError(429, "rate_limited", _RATE_LIMIT_MESSAGE)


def enforce_submit_limits(request: Request, phone: str) -> None:
    _hit(f"rl:submit:phone:{phone}", 5, 3600)
    _hit(f"rl:submit:ip:{_client_ip(request)}", 20, 86400)


def enforce_bot_submit_limit(phone: str) -> None:
    """Bot (X-Bot-Token bilan autentifikatsiya qilingan, IP asossiz — Telegram
    server IP'lari umumiy) uchun faqat telefon bo'yicha, lekin xuddi shu
    Redis kaliti bilan (`rl:submit:phone:{phone}`) — shu sabab bitta fuqaro
    web orqali 5 marta yuborib, keyin botga o'tib yana 5 marta yubora
    olmaydi, ikkalasi bitta umumiy limitga tushadi."""
    _hit(f"rl:submit:phone:{phone}", 5, 3600)


def enforce_stt_limit(request: Request) -> None:
    _hit(f"rl:stt:ip:{_client_ip(request)}", 10, 3600)


def enforce_track_limit(request: Request) -> None:
    _hit(f"rl:track:ip:{_client_ip(request)}", 30, 3600)
