"""Operatsion navbat shartlari — bitta joyda (docs/03-kontraktlar.md §5,
docs/10-ui-ux.md §10.1).

Nima uchun alohida modul: bosh ekrandagi karta raqami (`stats/queues`) va
karta bosilganda ochiladigan ro'yxat (`GET /complaints?queue=...`) AYNAN
bir xil shartdan chiqishi kerak. Ikkalasi ikki joyda yozilsa, vaqt o'tib
biri ikkinchisidan farq qila boshlaydi va admin «56 ta yozilgan edi,
ro'yxatda 54 ta» degan holatga tushadi — bunday panelga ishonch qolmaydi.

Har funksiya SQLAlchemy shartlari ro'yxatini qaytaradi (`.filter(*...)`
bilan qo'llash uchun).
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_
from sqlalchemy.sql.elements import ColumnElement

from app.core.constants import STATUS_NEED_INFO, STATUS_NEW, TERMINAL_STATUSES
from app.models.complaint import Complaint
from app.services.escalation import SLA_WARNING_RATIO

# `status='new'` da shuncha turgan murojaat LLM javob bermaganini
# bildiradi: normal holatda tahlil bir necha daqiqada tugaydi, sweeper
# esa har 15 daqiqada uradi (docs/07 §2).
STUCK_AI_AFTER = timedelta(hours=1)

# `need_info` da shuncha javobsiz turgan murojaat — fuqaroga qayta
# murojaat qilish (follow-up) vaqti kelgani.
AWAITING_INFO_AFTER_HOURS = 24


def _active() -> ColumnElement[bool]:
    return Complaint.status.notin_(TERMINAL_STATUSES)


def unassigned() -> list[ColumnElement[bool]]:
    """Dispetcherga tushmagan: bo'limi yoki mas'ul xodimi yo'q."""
    return [
        _active(),
        or_(Complaint.assigned_department_id.is_(None), Complaint.assigned_user_id.is_(None)),
    ]


def ai_exceptions() -> list[ColumnElement[bool]]:
    """AI past ishonch bilan qaror qilgan — nazorat talab qiladi."""
    return [_active(), Complaint.needs_review.is_(True)]


def sla_risk(now: datetime | None = None) -> list[ColumnElement[bool]]:
    """Muddatning ≥75% i o'tgan, lekin hali o'tib ketmagan.

    `escalation.py` dagi `sla_warning` bilan bir xil chegara — ogohlantirish
    yuborilgan ish aynan shu navbatda turishi kerak, aks holda xodim
    xabar oladi-yu, ro'yxatda topa olmaydi.
    """
    now = now or datetime.now(timezone.utc)
    elapsed = now - Complaint.created_at
    total = Complaint.deadline_at - Complaint.created_at
    return [
        _active(),
        Complaint.deadline_at.isnot(None),
        Complaint.deadline_at > now,
        elapsed >= total * SLA_WARNING_RATIO,
    ]


def overdue(now: datetime | None = None) -> list[ColumnElement[bool]]:
    now = now or datetime.now(timezone.utc)
    return [_active(), Complaint.deadline_at.isnot(None), Complaint.deadline_at < now]


def awaiting_info(hours: int = AWAITING_INFO_AFTER_HOURS, now: datetime | None = None) -> list[ColumnElement[bool]]:
    """`need_info` da `hours` soatdan ko'p javobsiz turganlar."""
    now = now or datetime.now(timezone.utc)
    return [
        Complaint.status == STATUS_NEED_INFO,
        Complaint.info_requested_at.isnot(None),
        Complaint.info_requested_at < now - timedelta(hours=hours),
    ]


def stuck_ai(now: datetime | None = None) -> list[ColumnElement[bool]]:
    """LLM javob bermagan — AI manual fallback navbati (docs/07 §2.3)."""
    now = now or datetime.now(timezone.utc)
    return [Complaint.status == STATUS_NEW, Complaint.created_at < now - STUCK_AI_AFTER]
