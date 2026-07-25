"""Fuqaro qo'shimcha ma'lumot qaytarishi — uchala kanal uchun yagona yadro
(docs/03-kontraktlar.md §3.5, §6, §5).

Nima uchun bitta funksiya: `need_info` sikli web (`/holat` formasi),
Telegram bot va manual (xodim telefonda eshitganini yozib qo'yishi)
orqali yopilishi mumkin. Uchalasi ham bir xil yon effektlarni berishi
kerak — `citizen_messages` yozuvi, `info_provided` eventi, fayllar,
bo'limga bildirishnoma. Router'larda takrorlansa, ular vaqt o'tib
bir-biridan uzoqlashardi.

Farq faqat bitta: **web va Telegram** murojaatni avtomatik
`in_progress` ga qaytaradi (fuqaro javob berganiga tizimning o'zi
guvoh), **manual** esa qaytarmaydi — fuqaro rostdan javob berganini
faqat xodim biladi, shuning uchun statusni ham xodim o'zi qaytaradi.
"""
import uuid
from datetime import datetime, timezone

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import (
    AUTO_RESUME_INFO_SOURCES,
    CITIZEN_INFO_SOURCES,
    STATUS_ARCHIVED,
    STATUS_CLOSED,
    STATUS_IN_PROGRESS,
    STATUS_NEED_INFO,
    STATUS_REJECTED,
    STATUS_RESOLVED,
)
from app.core.errors import AppError
from app.models.citizen_message import CitizenMessage
from app.models.complaint import Complaint
from app.models.complaint_event import ComplaintEvent
from app.models.complaint_file import ComplaintFile
from app.models.user import User
from app.services import workflow
from app.services.notifications import notify_staff
from app.services.storage import upload_file, validate_file

MAX_INFO_IMAGES = 5

# Yopilgan murojaatga ma'lumot qo'shishning ma'nosi yo'q — fuqaroga
# e'tiroz kanali (feedback, [03] §3.6) taklif qilinadi.
_CLOSED_TO_INFO = {STATUS_REJECTED, STATUS_ARCHIVED}


def _notify_owners(db: Session, complaint: Complaint, message: str) -> int:
    """Bildirishnoma mas'ul xodimga, bo'lsa; aks holda butun bo'limga;
    bo'lim ham yo'q bo'lsa adminlarga (escalation.py bilan bir xil
    fallback zanjiri — egasiz murojaat hech kimga ko'rinmay qolmasin)."""
    if complaint.assigned_user_id is not None:
        owner = db.get(User, complaint.assigned_user_id)
        if owner is not None and owner.is_active:
            notify_staff(db, owner, message, complaint_id=complaint.id)
            return 1

    query = select(User).where(User.is_active.is_(True))
    if complaint.assigned_department_id is not None:
        query = query.where(
            User.role == "department_staff",
            User.department_id == complaint.assigned_department_id,
        )
    else:
        query = query.where(User.role == "admin")

    staff = db.execute(query).scalars().all()
    for user in staff:
        notify_staff(db, user, message, complaint_id=complaint.id)
    return len(staff)


def record_citizen_info(
    db: Session,
    complaint: Complaint,
    text: str,
    *,
    source: str,
    recorded_by: uuid.UUID | None = None,
    images: list[UploadFile] | None = None,
) -> bool:
    """Fuqaro javobini yozadi. Murojaat avtomatik `in_progress` ga
    qaytgan bo'lsa `True` qaytaradi ([03] §3.5 `accepted` maydoni)."""
    if source not in CITIZEN_INFO_SOURCES:
        raise AppError(422, "validation_error", "Noto'g'ri kanal")

    text = text.strip()
    if not text:
        raise AppError(422, "validation_error", "Javob matni bo'sh bo'lishi mumkin emas")

    if complaint.status in _CLOSED_TO_INFO:
        raise AppError(422, "validation_error", "Bu murojaat yopilgan — qo'shimcha ma'lumot qabul qilinmaydi")

    real_images = [img for img in (images or []) if img.filename]
    if len(real_images) > MAX_INFO_IMAGES:
        raise AppError(422, "invalid_file", f"Ko'pi bilan {MAX_INFO_IMAGES} ta rasm yuklash mumkin")

    db.add(
        CitizenMessage(
            complaint_id=complaint.id,
            text=text,
            source=source,
            recorded_by=recorded_by,
        )
    )

    # Fayllar murojaatning umumiy galereyasiga tushadi — `complaint_files`
    # allaqachon `complaint_id` ga bog'langan, alohida jadval kerak emas.
    for image in real_images:
        data, mime = validate_file(image, "image")
        url = upload_file(data, mime, "image")
        db.add(ComplaintFile(complaint_id=complaint.id, kind="image", url=url, mime=mime, size_bytes=len(data)))

    actor_type = "staff" if source == "manual" else "citizen"
    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="info_provided",
            actor_type=actor_type,
            actor_id=recorded_by if source == "manual" else complaint.citizen_id,
            payload={"source": source, "text": text, "images": len(real_images)},
        )
    )
    db.flush()

    resumed = False
    if complaint.status == STATUS_NEED_INFO and source in AUTO_RESUME_INFO_SOURCES:
        # `change_status` o'zi `info_provided_at` ni ham qo'yadi.
        workflow.change_status(db, complaint, STATUS_IN_PROGRESS, actor_type="citizen", actor_id=complaint.citizen_id)
        resumed = True
    else:
        # Status o'zgarmagan hollarda ham "oxirgi ma'lumot kelgan vaqt"
        # yangilanadi — «javobsiz turgan» navbati shu ustunga tayanadi.
        complaint.info_provided_at = datetime.now(timezone.utc)

    _notify_owners(
        db,
        complaint,
        f"Fuqaro qo'shimcha ma'lumot yubordi: {complaint.ticket_number}",
    )
    db.flush()
    return resumed


def record_feedback(db: Session, complaint: Complaint, *, satisfied: bool, comment: str | None = None) -> bool:
    """Fuqaro bahosi va qayta ochish ([03] §3.6).

    Norozi bo'lsa murojaat `in_progress` ga qaytadi — bu fuqaroning
    yagona e'tiroz kanali. Aks holda «hal qilindi» degan yorliq oxirgi
    so'z bo'lib qolardi va fuqaroda qayta murojaat yozishdan boshqa
    yo'l qolmasdi (yangi ticket, uzilgan tarix).

    `True` — murojaat qayta ochildi.
    """
    # Tartib muhim: takroriy bahoga har doim 409 qaytadi. Aks holda
    # norozi baho murojaatni `in_progress` ga qaytargandan keyin ikkinchi
    # bosish «faqat hal qilingan murojaatga» degan chalg'ituvchi 422
    # olardi — fuqaro nima bo'lganini tushunmasdi.
    if complaint.satisfaction is not None:
        raise AppError(409, "already_submitted", "Bu murojaatga baho allaqachon berilgan")
    if complaint.status not in (STATUS_RESOLVED, STATUS_CLOSED):
        raise AppError(422, "validation_error", "Baho faqat hal qilingan murojaatga beriladi")

    complaint.satisfaction = satisfied
    comment = (comment or "").strip() or None

    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="feedback_received",
            actor_type="citizen",
            actor_id=complaint.citizen_id,
            payload={"satisfied": satisfied, "comment": comment},
        )
    )
    db.flush()

    if satisfied:
        # Rozi bo'lsa 7 kunlik avto-yopish croni kutilmaydi ([03] §3.6).
        if complaint.status == STATUS_RESOLVED:
            workflow.change_status(
                db, complaint, STATUS_CLOSED, actor_type="citizen", actor_id=complaint.citizen_id
            )
        return False

    complaint.reopened_count += 1
    workflow.change_status(
        db,
        complaint,
        STATUS_IN_PROGRESS,
        actor_type="citizen",
        actor_id=complaint.citizen_id,
        note=comment,
    )
    db.add(
        ComplaintEvent(
            complaint_id=complaint.id,
            event_type="reopened",
            actor_type="citizen",
            actor_id=complaint.citizen_id,
            payload={"comment": comment, "count": complaint.reopened_count},
        )
    )
    _notify_owners(
        db,
        complaint,
        f"Fuqaro javobdan norozi — murojaat qayta ochildi: {complaint.ticket_number}",
    )
    db.flush()
    return True
