import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import LANGUAGES, SOURCES, STATUS_NEW, STATUS_REJECTED, STATUS_SIMPLE_MAP, STATUS_SIMPLE_STEPS
from app.core.errors import AppError
from app.core.ratelimit import enforce_stt_limit, enforce_submit_limits, enforce_track_limit
from app.database import get_db
from app.i18n.messages import qabul_text
from app.models.category import Category
from app.models.citizen import Citizen
from app.models.complaint import Complaint
from app.models.complaint_event import ComplaintEvent
from app.models.complaint_file import ComplaintFile
from app.models.neighborhood import Neighborhood
from app.models.qr_code import QrCode
from app.models.stt_job import SttJob
from app.schemas.public import (
    PHONE_PATTERN,
    CategoryBrief,
    CategoryOut,
    ComplaintSubmitOut,
    NeighborhoodOut,
    QrLandingOut,
    SttJobCreatedOut,
    SttJobStatusOut,
    TimelineStep,
    TrackOut,
)
from app.services.ai.classifier import classify
from app.services.captcha import verify_captcha
from app.services.notifications import notify_citizen
from app.services.queue import enqueue
from app.services.storage import upload_file, validate_file
from app.services.tickets import next_ticket_number

router = APIRouter(prefix="/api/public", tags=["public"])


@router.post("/complaints", response_model=ComplaintSubmitOut, status_code=201)
def submit_complaint(
    request: Request,
    description: str = Form(..., min_length=10, max_length=5000),
    first_name: str = Form(..., min_length=1, max_length=100),
    last_name: str = Form("", max_length=100),
    phone: str = Form(..., pattern=PHONE_PATTERN),
    language: str = Form("uz"),
    source: str = Form("web"),
    category_code: str | None = Form(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    address: str | None = Form(None),
    neighborhood_id: uuid.UUID | None = Form(None),
    qr_code: str | None = Form(None),
    captcha_token: str | None = Form(None),
    images: list[UploadFile] = File(default=[]),
    video: UploadFile | None = File(None),
    audio: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    if language not in LANGUAGES:
        raise AppError(422, "validation_error", "Noto'g'ri til kodi")
    if source not in SOURCES:
        raise AppError(422, "validation_error", "Noto'g'ri manba")
    real_images = [img for img in images if img.filename]
    if len(real_images) > 5:
        raise AppError(422, "invalid_file", "Ko'pi bilan 5 ta rasm yuklash mumkin")

    verify_captcha(captcha_token, request.client.host if request.client else None)
    enforce_submit_limits(request, phone)

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
        citizen = Citizen(phone=phone, first_name=first_name, last_name=last_name or None, language=language)
        db.add(citizen)
        db.flush()
    else:
        citizen.first_name = first_name
        citizen.last_name = last_name or citizen.last_name

    if category is None:
        # STT (B2.4) isn't wired up yet, so description is required even for
        # audio submits until then — see docs/07-ai-layer.md §6.
        classification = classify(db, description)
        category = db.get(Category, classification.category_id) if classification.category_id else None
        if category is None:
            raise AppError(500, "server_error", "Kategoriya aniqlanmadi")

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

    enqueue("classify_complaint", str(complaint.id))

    return ComplaintSubmitOut(
        id=complaint.id,
        ticket_number=complaint.ticket_number,
        status=complaint.status,
        status_simple=STATUS_SIMPLE_MAP[complaint.status],
        created_at=complaint.created_at,
        track_url=f"/holat?ticket={complaint.ticket_number}",
    )


def _build_timeline(complaint: Complaint) -> list[TimelineStep]:
    tier_time: dict[str, datetime] = {STATUS_SIMPLE_MAP[STATUS_NEW]: complaint.created_at}
    for event in complaint.events:
        if event.event_type == "status_changed" and event.payload:
            simple = STATUS_SIMPLE_MAP.get(event.payload.get("to"))
        elif event.event_type == "assigned":
            # `assign()` moves status to "assigned" without a status_changed
            # event (docs/03-kontraktlar.md §8 has it as its own event type).
            simple = STATUS_SIMPLE_MAP.get("assigned")
        else:
            simple = None
        if simple and simple not in tier_time:
            tier_time[simple] = event.created_at
    return [
        TimelineStep(step=step, at=tier_time.get(step), done=step in tier_time) for step in STATUS_SIMPLE_STEPS
    ]


@router.get("/complaints/track", response_model=TrackOut)
def track_complaint(request: Request, ticket: str, phone: str, db: Session = Depends(get_db)):
    enforce_track_limit(request)
    complaint = db.execute(select(Complaint).where(Complaint.ticket_number == ticket)).scalar_one_or_none()
    if complaint is None or complaint.citizen.phone != phone:
        # Enumeration protection: never reveal whether the ticket exists.
        raise AppError(404, "not_found", "Murojaat topilmadi")

    latest_reply = complaint.replies[-1] if complaint.replies else None

    return TrackOut(
        ticket_number=complaint.ticket_number,
        status_simple=STATUS_SIMPLE_MAP[complaint.status],
        need_info=complaint.status == "need_info",
        category=CategoryBrief(code=complaint.category.code, name=complaint.category.name(complaint.language)),
        created_at=complaint.created_at,
        deadline_at=complaint.deadline_at,
        timeline=_build_timeline(complaint),
        reply_text=latest_reply.text if latest_reply else None,
        rejected_reason=complaint.rejected_reason if complaint.status == STATUS_REJECTED else None,
    )


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(lang: str = "uz", db: Session = Depends(get_db)):
    categories = (
        db.execute(select(Category).where(Category.is_active.is_(True)).order_by(Category.sort_order)).scalars().all()
    )
    return [CategoryOut(code=c.code, name=c.name(lang), icon=c.icon) for c in categories]


@router.get("/neighborhoods", response_model=list[NeighborhoodOut])
def list_neighborhoods(db: Session = Depends(get_db)):
    rows = (
        db.execute(select(Neighborhood).where(Neighborhood.is_active.is_(True)).order_by(Neighborhood.name))
        .scalars()
        .all()
    )
    return [NeighborhoodOut(id=n.id, name=n.name) for n in rows]


@router.get("/qr/{code}", response_model=QrLandingOut)
def qr_landing(code: str, db: Session = Depends(get_db)):
    qr = db.execute(select(QrCode).where(QrCode.code == code)).scalar_one_or_none()
    if qr is None:
        raise AppError(404, "not_found", "QR topilmadi")
    # docs/03-kontraktlar.md §7: scan hisoblagichi shu yerda oshadi (sahifa
    # ochilganda), oldin submit_complaint()dagi qr_code maydonida edi — bu
    # faqat ariza yuborilgan hollarni sanardi, ko'pchilik skan qilib ko'rib
    # yubormaydiganlarni yo'qotardi.
    qr.scans += 1
    db.commit()
    return QrLandingOut(
        neighborhood_id=qr.neighborhood_id,
        neighborhood_name=qr.neighborhood.name if qr.neighborhood_id else None,
    )


@router.post("/stt", response_model=SttJobCreatedOut, status_code=202)
def create_stt_job(
    request: Request,
    audio: UploadFile = File(...),
    language: str = Form("uz"),
    db: Session = Depends(get_db),
):
    if language not in LANGUAGES:
        raise AppError(422, "validation_error", "Noto'g'ri til kodi")
    enforce_stt_limit(request)
    data, mime = validate_file(audio, "audio")
    url = upload_file(data, mime, "audio")

    job = SttJob(
        status="pending",
        audio_url=url,
        language=language,
        ip=request.client.host if request.client else "unknown",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    enqueue("transcribe_audio", str(job.id))
    return SttJobCreatedOut(job_id=job.id)


@router.get("/stt/{job_id}", response_model=SttJobStatusOut)
def get_stt_job(job_id: uuid.UUID, db: Session = Depends(get_db)):
    job = db.get(SttJob, job_id)
    if job is None:
        raise AppError(404, "not_found", "Ish topilmadi")
    return SttJobStatusOut(status=job.status, text=job.text, code="stt_failed" if job.status == "failed" else None)
