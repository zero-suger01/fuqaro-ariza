"""Eskalatsiya (B4.5, docs/05-backend-tasklar.md): muddati (`deadline_at`)
o'tgan murojaatlar avval bo'lim menejerlariga, 24 soat davomida hamon
hal qilinmasa admin'larga xabar qilinadi. Har bosqich `complaint_events`ga
`escalated` (payload `level`: `manager`|`admin`) yozib qo'yiladi — shu
yozuv bosqichni bir marta bajarish uchun belgi vazifasini o'taydi (cron
har 30 daqiqada ishga tushadi, qayta-qayta xabar yubormasligi kerak).
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import TERMINAL_STATUSES
from app.models.complaint import Complaint
from app.models.complaint_event import ComplaintEvent
from app.models.user import User
from app.services.notifications import notify_staff

ADMIN_ESCALATION_DELAY = timedelta(hours=24)


def _escalation_events(complaint: Complaint) -> tuple[ComplaintEvent | None, ComplaintEvent | None]:
    manager_event = None
    admin_event = None
    for event in complaint.events:
        if event.event_type != "escalated" or not event.payload:
            continue
        if event.payload.get("level") == "manager":
            manager_event = event
        elif event.payload.get("level") == "admin":
            admin_event = event
    return manager_event, admin_event


def _escalate(db: Session, complaint: Complaint, *, level: str, staff: list[User], message: str) -> None:
    for user in staff:
        notify_staff(db, user, message, complaint_id=complaint.id)
    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="escalated",
            actor_type="system",
            payload={"level": level, "notified": len(staff)},
        )
    )


def escalate_overdue(db: Session) -> dict[str, int]:
    """Bitta cron o'tishida ishlaydi. Qaytaradi: {"to_manager": N, "to_admin": M}."""
    now = datetime.now(timezone.utc)
    overdue = (
        db.execute(
            select(Complaint).where(
                Complaint.deadline_at.isnot(None),
                Complaint.deadline_at < now,
                Complaint.status.notin_(TERMINAL_STATUSES),
            )
        )
        .scalars()
        .all()
    )

    counts = {"to_manager": 0, "to_admin": 0}
    for complaint in overdue:
        manager_event, admin_event = _escalation_events(complaint)

        if manager_event is None:
            query = select(User).where(User.role == "department_staff", User.is_active.is_(True))
            if complaint.assigned_department_id is not None:
                query = query.where(User.department_id == complaint.assigned_department_id)
            managers = db.execute(query).scalars().all()
            _escalate(
                db,
                complaint,
                level="manager",
                staff=managers,
                message=f"Muddati o'tgan ariza: {complaint.ticket_number}",
            )
            counts["to_manager"] += 1
        elif admin_event is None and now - manager_event.created_at >= ADMIN_ESCALATION_DELAY:
            admins = db.execute(select(User).where(User.role == "admin", User.is_active.is_(True))).scalars().all()
            _escalate(
                db,
                complaint,
                level="admin",
                staff=admins,
                message=f"24 soatdan beri javobsiz, muddati o'tgan ariza: {complaint.ticket_number}",
            )
            counts["to_admin"] += 1

    db.commit()
    return counts
