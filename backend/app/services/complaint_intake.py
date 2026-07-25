"""Shared complaint-creation core (docs/03-kontraktlar.md §3.1 va §6 — "3.1
bilan bir xil maydonlar"): `app/routers/public.py` (web) va
`app/routers/bot.py` (Telegram) ikkalasi ham shu funksiyani chaqiradi, shu
sabab validatsiya/klassifikatsiya/fayl/SMS mantig'i ikki joyda drift
qilmaydi.
"""
import uuid

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import DEFAULT_CATEGORY_CODE, STATUS_NEW
from app.core.errors import AppError
from app.i18n.messages import qabul_text
from app.models.category import Category
from app.models.citizen import Citizen
from app.models.complaint import Complaint
from app.models.complaint_event import ComplaintEvent
from app.models.complaint_file import ComplaintFile
from app.models.neighborhood import Neighborhood
from app.services.notifications import notify_citizen
from app.services.queue import enqueue
from app.services.storage import upload_file, validate_file
from app.services.tickets import next_ticket_number


def create_complaint(
    db: Session,
    *,
    description: str,
    first_name: str,
    last_name: str,
    phone: str,
    language: str,
    source: str,
    category_code: str | None,
    latitude: float | None,
    longitude: float | None,
    address: str | None,
    neighborhood_id: uuid.UUID | None,
    images: list[UploadFile],
    video: UploadFile | None,
    audio: UploadFile | None,
    telegram_chat_id: int | None = None,
) -> Complaint:
    real_images = [img for img in images if img.filename]
    if len(real_images) > 5:
        raise AppError(422, "invalid_file", "Ko'pi bilan 5 ta rasm yuklash mumkin")

    category = None
    if category_code:
        category = db.execute(
            select(Category).where(Category.code == category_code, Category.is_active.is_(True))
        ).scalar_one_or_none()
        if category is None:
            raise AppError(422, "validation_error", "Noto'g'ri kategoriya kodi")

    if neighborhood_id is not None and db.get(Neighborhood, neighborhood_id) is None:
        raise AppError(422, "validation_error", "Mahalla topilmadi")

    citizen = db.execute(select(Citizen).where(Citizen.phone == phone)).scalar_one_or_none()
    if citizen is None:
        citizen = Citizen(
            phone=phone,
            first_name=first_name,
            last_name=last_name or None,
            language=language,
            telegram_chat_id=telegram_chat_id,
        )
        db.add(citizen)
        db.flush()
    else:
        citizen.first_name = first_name
        citizen.last_name = last_name or citizen.last_name
        if telegram_chat_id is not None:
            citizen.telegram_chat_id = telegram_chat_id

    if category is None:
        # v1.3: intake paytida hech qanday klassifikatsiya YO'Q — `category_id`
        # NOT NULL bo'lgani uchun vaqtinchalik `boshqa` qo'yiladi, bir necha
        # daqiqadan keyin `analyze_complaint` worker'i LLM qarori bilan
        # almashtiradi (docs/07 §1). Fuqaro o'zi tanlagan bo'lsa ham LLM
        # qayta baholaydi.
        category = db.execute(
            select(Category).where(Category.code == DEFAULT_CATEGORY_CODE)
        ).scalar_one_or_none()
        if category is None:
            raise AppError(500, "server_error", "Standart kategoriya topilmadi (seed ishga tushirilmagan?)")

    complaint = Complaint(
        ticket_number=next_ticket_number(db),
        citizen_id=citizen.id,
        category_id=category.id,
        description=description,
        status=STATUS_NEW,
        source=source,
        language=language,
        latitude=latitude,
        longitude=longitude,
        address=address,
        neighborhood_id=neighborhood_id,
    )
    db.add(complaint)
    db.flush()

    for image in real_images:
        data, mime = validate_file(image, "image")
        url = upload_file(data, mime, "image")
        db.add(ComplaintFile(complaint_id=complaint.id, kind="image", url=url, mime=mime, size_bytes=len(data)))

    if video is not None and video.filename:
        data, mime = validate_file(video, "video")
        url = upload_file(data, mime, "video")
        db.add(ComplaintFile(complaint_id=complaint.id, kind="video", url=url, mime=mime, size_bytes=len(data)))

    if audio is not None and audio.filename:
        data, mime = validate_file(audio, "audio")
        url = upload_file(data, mime, "audio")
        db.add(ComplaintFile(complaint_id=complaint.id, kind="audio", url=url, mime=mime, size_bytes=len(data)))

    db.add(
        ComplaintEvent(
            complaint_id=complaint.id, event_type="created", actor_type="citizen", actor_id=citizen.id, payload=None
        )
    )

    db.commit()
    db.refresh(complaint)

    sms = qabul_text(citizen.language or "uz", complaint.ticket_number)
    notify_citizen(db, citizen, f"Arizangiz qabul qilindi: {complaint.ticket_number}", complaint_id=complaint.id, sms_text=sms)
    db.commit()

    enqueue("analyze_complaint", str(complaint.id))
    return complaint
