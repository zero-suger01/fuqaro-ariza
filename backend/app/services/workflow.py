"""Status state-machine — every status change must go through here so the
allowed-transition rules (docs/03-kontraktlar.md §2.1) and the event/
notification side effects can't be skipped by a router writing
`complaint.status = ...` directly.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.constants import STATUS_ASSIGNED, STATUS_REJECTED, STATUS_RESOLVED, STATUS_TRANSITIONS
from app.core.errors import AppError
from app.i18n.messages import status_text as sms_status_text
from app.models.complaint import Complaint
from app.models.complaint_event import ComplaintEvent
from app.services.notifications import notify_citizen

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
    if new_status == STATUS_REJECTED and not note:
        raise AppError(422, "validation_error", "Rad etish sababi (note) majburiy")

    old_status = complaint.status
    complaint.status = new_status
    if new_status == STATUS_REJECTED:
        complaint.rejected_reason = note
    if new_status == STATUS_RESOLVED:
        complaint.resolved_at = datetime.now(timezone.utc)

    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="status_changed",
            actor_type=actor_type,
            actor_id=actor_id,
            payload={"from": old_status, "to": new_status, "note": note},
        )
    )
    db.flush()

    message = _STATUS_MESSAGE.get(new_status)
    if message:
        sms = sms_status_text(new_status, complaint.citizen.language or "uz", complaint.ticket_number)
        notify_citizen(db, complaint.citizen, message, complaint_id=complaint.id, sms_text=sms)

    return complaint


def assign(
    db: Session,
    complaint: Complaint,
    department_id: uuid.UUID,
    assigned_user_id: uuid.UUID | None,
    *,
    actor_id: uuid.UUID | None = None,
    actor_type: str = "staff",
) -> Complaint:
    """`actor_type="ai"` (`actor_id=None`) — B6 avto-routing: `classify_complaint`
    worker AI ishonchli bo'lganda shu funksiyani chaqirib, o'zi murojaatni
    kategoriyaning bo'limiga biriktiradi. `actor_type="staff"` — admin qo'lda
    biriktirgan/qayta yo'naltirgan holat (docs/03-kontraktlar.md §6 workflow)."""
    complaint.assigned_department_id = department_id
    complaint.assigned_user_id = assigned_user_id

    if STATUS_ASSIGNED in STATUS_TRANSITIONS.get(complaint.status, set()):
        complaint.status = STATUS_ASSIGNED
        sms = sms_status_text(STATUS_ASSIGNED, complaint.citizen.language or "uz", complaint.ticket_number)
        notify_citizen(db, complaint.citizen, _STATUS_MESSAGE["assigned"], complaint_id=complaint.id, sms_text=sms)
    elif complaint.status not in (STATUS_ASSIGNED,):
        raise AppError(422, "invalid_transition", f"'{complaint.status}' holatida biriktirish mumkin emas")

    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="assigned",
            actor_type=actor_type,
            actor_id=actor_id,
            payload={"department_id": str(department_id), "user_id": str(assigned_user_id) if assigned_user_id else None},
        )
    )
    db.flush()
    return complaint
