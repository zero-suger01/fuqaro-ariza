"""Status state-machine — every status change must go through here so the
allowed-transition rules (docs/03-kontraktlar.md §2.1) and the event/
notification side effects can't be skipped by a router writing
`complaint.status = ...` directly.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.constants import (
    CITIZEN_ONLY_TRANSITIONS,
    STATUS_ACCEPTED,
    STATUS_AI_PROCESSED,
    STATUS_ASSIGNED,
    STATUS_NEED_INFO,
    STATUS_NEW,
    STATUS_REJECTED,
    STATUS_RESOLVED,
    STATUS_TRANSITIONS,
    TERMINAL_STATUSES,
)
from app.core.errors import AppError
from app.i18n.messages import info_request_text
from app.i18n.messages import status_text as sms_status_text
from app.models.complaint import Complaint
from app.models.complaint_event import ComplaintEvent
from app.models.user import User
from app.services.notifications import notify_citizen
from app.services.telegram import status_keyboard

_STATUS_MESSAGE = {
    "ai_processed": "Murojaatingiz ko'rib chiqilmoqda",
    "assigned": "Murojaatingiz mas'ul bo'limga yo'naltirildi",
    "accepted": "Murojaatingiz bo'lim tomonidan qabul qilindi",
    "in_progress": "Murojaatingiz ijroga qo'yildi",
    "need_info": "Murojaatingiz bo'yicha qo'shimcha ma'lumot kerak",
    "resolved": "Murojaatingiz hal qilindi",
    "rejected": "Murojaatingiz rad etildi",
    "closed": "Murojaatingiz yopildi",
}

# `_SENTINEL` — `assign()` da "tegilmasin" ni "None ga o'rnat" dan ajratish
# uchun. Ikkalasini `None` bilan ifodalash mumkin emas edi, va aynan shu
# sabab AI routing/review adminning qo'lda tayinlagan xodimini o'chirib
# yuborardi ([03] §5 «Egalik qoidasi»).
_SENTINEL = object()


def change_status(
    db: Session,
    complaint: Complaint,
    new_status: str,
    *,
    actor_type: str,
    actor_id: uuid.UUID | None = None,
    note: str | None = None,
) -> Complaint:
    allowed = STATUS_TRANSITIONS.get(complaint.status, set())
    if new_status not in allowed:
        raise AppError(422, "invalid_transition", f"'{complaint.status}' holatidan '{new_status}' ga o'tish mumkin emas")
    if (complaint.status, new_status) in CITIZEN_ONLY_TRANSITIONS and actor_type != "citizen":
        raise AppError(
            422,
            "invalid_transition",
            "Yopilgan murojaatni faqat fuqaro e'tirozi qayta ochadi",
        )
    if new_status == STATUS_REJECTED and not note:
        raise AppError(422, "validation_error", "Rad etish sababi (note) majburiy")
    # v1.4: fuqaro «qanday ma'lumot kerak» degan savolga javob ololmasa
    # murojaat shu ustunda cheksiz qolib ketardi — savol matni majburiy.
    if new_status == STATUS_NEED_INFO and not (note or "").strip():
        raise AppError(422, "validation_error", "Qanday ma'lumot kerakligini yozing (note majburiy)")

    now = datetime.now(timezone.utc)
    old_status = complaint.status
    complaint.status = new_status
    if new_status == STATUS_REJECTED:
        complaint.rejected_reason = note
    if new_status == STATUS_RESOLVED:
        complaint.resolved_at = now
    if new_status == STATUS_NEED_INFO:
        complaint.info_requested_at = now
    if old_status == STATUS_NEED_INFO:
        complaint.info_provided_at = now

    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="status_changed",
            actor_type=actor_type,
            actor_id=actor_id,
            payload={"from": old_status, "to": new_status, "note": note},
        )
    )
    if new_status == STATUS_NEED_INFO:
        db.add(
            ComplaintEvent(
                complaint_id=complaint.id,
                event_type="info_requested",
                actor_type=actor_type,
                actor_id=actor_id,
                payload={"text": note},
            )
        )
    db.flush()

    message = _STATUS_MESSAGE.get(new_status)
    if message:
        language = complaint.citizen.language or "uz"
        if new_status == STATUS_NEED_INFO:
            # Savolning o'zi SMS'ga tushadi — umumiy "ma'lumot kerak"
            # jumlasi fuqaroga nima kerakligini aytmasdi.
            sms = info_request_text(language, complaint.ticket_number, note or "")
            message = f"{message}: {note}"
        else:
            sms = sms_status_text(new_status, language, complaint.ticket_number)
        notify_citizen(
            db,
            complaint.citizen,
            message,
            complaint_id=complaint.id,
            sms_text=sms,
            telegram_markup=status_keyboard(new_status, complaint.ticket_number),
        )

    return complaint


def assign(
    db: Session,
    complaint: Complaint,
    department_id: uuid.UUID,
    assigned_user_id: uuid.UUID | None | object = _SENTINEL,
    *,
    actor_id: uuid.UUID | None = None,
    actor_type: str = "staff",
) -> Complaint:
    """`actor_type="ai"` (`actor_id=None`) — avto-routing: `analyze_complaint`
    worker murojaatni kategoriyaning bo'limiga o'zi biriktiradi.
    `actor_type="staff"` — admin qo'lda biriktirgan/qayta yo'naltirgan holat.

    **Egalik (v1.4, [03] §5):** `assigned_user_id` berilmasa (`_SENTINEL`)
    egasi **bo'lim o'zgarmasa saqlanadi**, bo'lim o'zgarsa tozalanadi —
    yangi bo'limda o'sha xodim ishlamaydi. Avval AI routing va `review`
    har safar `None` yozib, adminning qo'lda tayinlagan xodimini
    yo'qotardi.
    """
    if complaint.status in TERMINAL_STATUSES:
        raise AppError(422, "invalid_transition", f"'{complaint.status}' holatida biriktirish mumkin emas")

    department_changed = complaint.assigned_department_id != department_id
    complaint.assigned_department_id = department_id
    if assigned_user_id is not _SENTINEL:
        complaint.assigned_user_id = assigned_user_id
    elif department_changed:
        complaint.assigned_user_id = None
        complaint.accepted_at = None

    # Qayta yo'naltirish `STATUS_TRANSITIONS` orqali o'tmaydi: u xodimning
    # oldinga siljishini boshqaradi, bu esa **admin amali**. Boshqa
    # bo'limga o'tkazilgan murojaat yangi bo'lim uchun yana «qabul
    # qilinmagan ish» — shuning uchun `assigned` ga qaytadi va yangi
    # bo'lim uni o'zi qabul qiladi. Avval bu shart `accepted` holatda
    # 422 berardi, ya'ni bo'lim murojaatni bir ochsa admin uni boshqa
    # bo'limga umuman yo'naltira olmasdi (AI xatosini tuzatish yo'li
    # yopiq edi).
    should_reset = department_changed or complaint.status in (STATUS_NEW, STATUS_AI_PROCESSED)
    if should_reset and complaint.status != STATUS_ASSIGNED:
        complaint.status = STATUS_ASSIGNED
        sms = sms_status_text(STATUS_ASSIGNED, complaint.citizen.language or "uz", complaint.ticket_number)
        notify_citizen(db, complaint.citizen, _STATUS_MESSAGE["assigned"], complaint_id=complaint.id, sms_text=sms)

    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="assigned",
            actor_type=actor_type,
            actor_id=actor_id,
            payload={
                "department_id": str(department_id),
                "user_id": str(complaint.assigned_user_id) if complaint.assigned_user_id else None,
            },
        )
    )
    db.flush()
    return complaint


def claim(db: Session, complaint: Complaint, user: User) -> Complaint:
    """«Qabul qilaman» (v1.4, [03] §2.1) — egalik shu yerda tug'iladi.

    Avval `accepted` ni FE tafsilot sahifasi ochilganda avtomatik
    qo'yardi. Bu «ko'rdim» ni «qabul qildim» bilan tenglashtirardi:
    SLA va birinchi-harakat ko'rsatkichi sun'iy yaxshi chiqardi, mas'ul
    xodim esa aniqlanmasdi, va API'ni to'g'ridan-to'g'ri ishlatgan
    klient bu bosqichni butunlay o'tkazib yuborardi.
    """
    if complaint.assigned_department_id is None or user.department_id != complaint.assigned_department_id:
        # Adminning boshqa bo'lim ishini o'ziga olishi ham mantiqsiz —
        # u biriktiradi, bajarmaydi.
        raise AppError(403, "forbidden", "Bu murojaat sizning bo'limingizga tegishli emas")
    if complaint.assigned_user_id is not None and complaint.assigned_user_id != user.id:
        raise AppError(409, "already_claimed", "Murojaatni boshqa xodim allaqachon qabul qilgan")

    complaint.assigned_user_id = user.id
    if complaint.accepted_at is None:
        complaint.accepted_at = datetime.now(timezone.utc)

    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="claimed",
            actor_type="staff",
            actor_id=user.id,
            payload={"user_id": str(user.id)},
        )
    )
    db.flush()

    # `assigned` bo'lsa `accepted` ga o'tamiz; xodim allaqachon ishni
    # boshlab yuborgan bo'lsa (in_progress/need_info) status tegilmaydi —
    # qabul qilish ishni orqaga surmasligi kerak.
    if STATUS_ACCEPTED in STATUS_TRANSITIONS.get(complaint.status, set()):
        change_status(db, complaint, STATUS_ACCEPTED, actor_type="staff", actor_id=user.id)
    return complaint
