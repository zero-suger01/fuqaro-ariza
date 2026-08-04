import secrets

import redis

from app.config import get_settings
from app.services.sms import send_sms

settings = get_settings()
_TTL = 10 * 60


def _redis() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


def issue(phone: str) -> bool:
    code = f"{secrets.randbelow(1_000_000):06d}"
    sent = send_sms(phone, f"e-Murojaat: tasdiqlash kodi — {code}. Kod 10 daqiqa amal qiladi.")
    # Store even when SMS provider is temporarily unavailable so the same
    # code can be retried after a provider recovery in a local test.
    _redis().set(f"citizen:otp:{phone}", code, ex=_TTL)
    return sent


def verify(phone: str, code: str) -> bool:
    key = f"citizen:otp:{phone}"
    client = _redis()
    stored = client.get(key)
    if not stored or not secrets.compare_digest(stored, code):
        return False
    client.delete(key)
    return True
