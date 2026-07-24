"""In-app notifications, with an optional SMS (Eskiz, B4.1) side channel.
Telegram delivery (B4.2) isn't wired up yet.
"""
import uuid

from sqlalchemy.orm import Session

from app.models.citizen import Citizen
from app.models.complaint_event import ComplaintEvent
from app.models.notification import Notification
from app.models.user import User
from app.services.sms import send_sms


def notify_citizen(
    db: Session,
    citizen: Citizen,
    message: str,
    complaint_id: uuid.UUID | None = None,
    *,
    sms_text: str | None = None,
) -> Notification:
    notification = Notification(citizen_id=citizen.id, complaint_id=complaint_id, channel="in_app", message=message)
    db.add(notification)
    db.flush()

    if sms_text and citizen.phone:
        sent = send_sms(citizen.phone, sms_text)
        db.add(
            Notification(
                citizen_id=citizen.id,
                complaint_id=complaint_id,
                channel="sms",
                status="sent" if sent else "failed",
                message=sms_text,
            )
        )
        if complaint_id is not None:
            db.add(
                ComplaintEvent(
                    complaint_id=complaint_id,
                    event_type="sms_sent",
                    actor_type="system",
                    payload={"status": "sent" if sent else "failed"},
                )
            )
        db.flush()

    return notification


def notify_staff(db: Session, user: User, message: str, complaint_id: uuid.UUID | None = None) -> Notification:
    notification = Notification(user_id=user.id, complaint_id=complaint_id, channel="in_app", message=message)
    db.add(notification)
    db.flush()
    return notification
