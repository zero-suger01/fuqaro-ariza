"""In-app notifications. SMS (Eskiz) and Telegram delivery are B4.1/B4.2 —
only the channel/status columns are wired up here so those can slot in later
without a schema change.
"""
import uuid

from sqlalchemy.orm import Session

from app.models.citizen import Citizen
from app.models.notification import Notification
from app.models.user import User


def notify_citizen(db: Session, citizen: Citizen, message: str, complaint_id: uuid.UUID | None = None) -> Notification:
    notification = Notification(citizen_id=citizen.id, complaint_id=complaint_id, channel="in_app", message=message)
    db.add(notification)
    db.flush()
    return notification


def notify_staff(db: Session, user: User, message: str, complaint_id: uuid.UUID | None = None) -> Notification:
    notification = Notification(user_id=user.id, complaint_id=complaint_id, channel="in_app", message=message)
    db.add(notification)
    db.flush()
    return notification
