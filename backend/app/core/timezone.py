"""Asia/Tashkent vaqt zonasi (B5.6, docs/03-kontraktlar.md §1).

Qoida: DB va API'da HAR DOIM UTC (ISO 8601, `Z`), lekin ODAM ko'radigan
har qanday sana/vaqt va "bugun/hafta/oy" chegaralari Toshkent vaqtida
hisoblanadi. Aks holda soat 00:00–05:00 orasida kelgan murojaatlar
"kechagi" bo'lib ko'rinadi (UTC+5 farqi).
"""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

TASHKENT = ZoneInfo("Asia/Tashkent")


def to_local(value: datetime) -> datetime:
    """UTC (yoki naive — UTC deb qabul qilinadi) → Toshkent vaqti."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(TASHKENT)


def format_local(value: datetime | None, fmt: str = "%d.%m.%Y %H:%M") -> str:
    """Odam o'qiydigan sana — doim Toshkent vaqtida."""
    return to_local(value).strftime(fmt) if value else ""


def day_bounds_utc(now: datetime | None = None) -> tuple[datetime, datetime, datetime]:
    """Dashboard uchun (bugun, shu hafta, shu oy) boshlanish nuqtalari —
    Toshkent kalendari bo'yicha hisoblanib, UTC'da qaytariladi (DB solishtiruvi
    UTC'da bo'lgani uchun)."""
    local_now = to_local(now or datetime.now(timezone.utc))
    today = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    week = today - timedelta(days=today.weekday())
    month = today.replace(day=1)
    return today.astimezone(timezone.utc), week.astimezone(timezone.utc), month.astimezone(timezone.utc)
