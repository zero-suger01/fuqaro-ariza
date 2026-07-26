"""Xodim parolini tiklash (v1.7, docs/03-kontraktlar.md §4).

Kod Redis'da vaqtinchalik saqlanadi (staff-only — xodimlar bitta tilda
ishlaydi, shuning uchun SMS matni 4 tilga bo'linmagan, `app/i18n/messages.py`
dan farqli). `sms.send_sms` hech qachon exception ko'tarmaydi, shu sabab bu
modul ham xatoni yutadi — SMS yetkazilmasa ham kod Redis'da qoladi va xodim
qayta so'rashi mumkin (rate limit shu holatni cheklaydi).
"""
import secrets

from app.core.redisdb import redis_client
from app.services.sms import send_sms

_CODE_TTL_SECONDS = 600  # 10 daqiqa
_MAX_ATTEMPTS = 5


def _code_key(phone: str) -> str:
    return f"pwreset:code:{phone}"


def _attempts_key(phone: str) -> str:
    return f"pwreset:attempts:{phone}"


def generate_and_send_code(phone: str) -> None:
    code = f"{secrets.randbelow(1_000_000):06d}"
    redis_client.set(_code_key(phone), code, ex=_CODE_TTL_SECONDS)
    redis_client.delete(_attempts_key(phone))
    send_sms(phone, f"E-murojaat: parolni tiklash kodi — {code}. Hech kimga aytmang. 10 daqiqa amal qiladi.")


def verify_and_consume(phone: str, code: str) -> bool:
    """To'g'ri bo'lsa kodni bir martalik sifatida o'chiradi va `True`
    qaytaradi. Noto'g'ri urinishlar sanaladi — `_MAX_ATTEMPTS` dan keyin
    kod bekor qilinadi (yangisini so'rash kerak bo'ladi)."""
    stored = redis_client.get(_code_key(phone))
    if stored is None:
        return False

    if stored != code:
        attempts = redis_client.incr(_attempts_key(phone))
        if attempts == 1:
            redis_client.expire(_attempts_key(phone), _CODE_TTL_SECONDS)
        if attempts >= _MAX_ATTEMPTS:
            redis_client.delete(_code_key(phone), _attempts_key(phone))
        return False

    redis_client.delete(_code_key(phone), _attempts_key(phone))
    return True
