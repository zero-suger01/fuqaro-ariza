import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_staff
from app.core.errors import AppError
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: uuid.UUID
    message: str
    is_read: bool
    complaint_id: uuid.UUID | None
    created_at: datetime  # R0 (docs/03 §5.1) — qo'ng'iroq dropdown'ida vaqt

    class Config:
        from_attributes = True


@router.get("", response_model=list[NotificationOut])
def list_notifications(db: Session = Depends(get_db), staff: User = Depends(get_current_staff)):
    # R0 (docs/03 §5.1): oxirgi 50 ta — qo'ng'iroq dropdown uchun yetarli,
    # cheksiz ro'yxat vaqt o'tishi bilan og'irlashib ketardi.
    return (
        db.query(Notification)
        .filter(Notification.user_id == staff.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), staff: User = Depends(get_current_staff)):
    """R0 (docs/03 §5.1) — qo'ng'iroqdagi «hammasini o'qildi» tugmasi."""
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == staff.id, Notification.is_read.is_(False))
        .update({Notification.is_read: True}, synchronize_session=False)
    )
    db.commit()
    return {"ok": True, "updated": updated}


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: uuid.UUID, db: Session = Depends(get_db), staff: User = Depends(get_current_staff)):
    notification = db.get(Notification, notification_id)
    if not notification or notification.user_id != staff.id:
        raise AppError(404, "not_found", "Bildirishnoma topilmadi")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification
