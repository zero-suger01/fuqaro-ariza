"""In-app notifications, with optional SMS (Eskiz, B4.1) and Telegram
(B4.2) side channels.
"""
import uuid

from sqlalchemy.orm import Session

from app.models.citizen import Citizen
from app.models.complaint_event import ComplaintEvent
from app.models.notification import Notification
from app.models.user import User
from app.services.sms import send_sms
from app.services.telegram import send_telegram_message


def notify_citizen(
    db: Session,
    citizen: Citizen,
    message: str,
    complaint_id: uuid.UUID | None = None,
    *,
    sms_text: str | None = None,
    telegram_markup: dict | None = None,
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

    # SMS matni Telegram uchun ham yetarli — ikkala kanal uchun alohida
    # shablon kerak emas, ikkalasi ham "qisqa status xabari" darajasida.
    if sms_text and citizen.telegram_chat_id:
        # v1.4: `telegram_markup` bo'lsa inline tugmalar ham ketadi —
        # fuqaro botdan chiqmasdan javob bera oladi (docs/08 T2.2–T2.3).
        sent = send_telegram_message(citizen.telegram_chat_id, sms_text, reply_markup=telegram_markup)
        db.add(
            Notification(
                citizen_id=citizen.id,
                complaint_id=complaint_id,
                channel="telegram",
                status="sent" if sent else "failed",
                message=sms_text,
            )
        )
        if complaint_id is not None:
            db.add(
                ComplaintEvent(
                    complaint_id=complaint_id,
                    event_type="telegram_sent",
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
