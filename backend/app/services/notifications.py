"""In-app notifications, with an email hook.

SMS/Telegram delivery need real provider credentials (Eskiz/Twilio, a bot
token) that aren't available here, so only the channel enum + this function
signature are provided as the integration point for later.
"""
import smtplib
import uuid
from email.message import EmailMessage

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.notification import Notification, NotificationChannel
from app.models.user import User

settings = get_settings()


def notify(db: Session, user: User, message: str, complaint_id: uuid.UUID | None = None) -> Notification:
    notification = Notification(user_id=user.id, complaint_id=complaint_id, message=message)
    db.add(notification)
    db.commit()
    db.refresh(notification)

    if user.email:
        _send_email(user.email, message)

    return notification


def _send_email(to_email: str, message: str) -> None:
    if not getattr(settings, "smtp_host", None):
        return
    try:
        email_message = EmailMessage()
        email_message["Subject"] = "Murojaatingiz bo'yicha yangilanish"
        email_message["From"] = "no-reply@ariza.uz"
        email_message["To"] = to_email
        email_message.set_content(message)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
            smtp.send_message(email_message)
    except Exception:
        pass
