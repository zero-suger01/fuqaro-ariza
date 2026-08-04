import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import (
    LANGUAGES,
    SOURCES,
    STATUS_CLOSED,
    STATUS_NEED_INFO,
    STATUS_NEW,
    STATUS_REJECTED,
    STATUS_RESOLVED,
    STATUS_SIMPLE_MAP,
    STATUS_SIMPLE_STEPS,
)
from app.config import get_settings
from app.core.errors import AppError
from app.core.ratelimit import enforce_info_limit, enforce_stt_limit, enforce_submit_limits, enforce_track_limit
from app.database import get_db
from app.models.category import Category
from app.models.complaint import Complaint
from app.models.district import District
from app.models.neighborhood import Neighborhood
from app.models.qr_code import QrCode
from app.models.stt_job import SttJob
from app.schemas.public import (
    PHONE_PATTERN,
    CategoryBrief,
    CategoryOut,
    CitizenInfoOut,
    ComplaintSubmitOut,
    DepartmentPublic,
    FeedbackIn,
    FeedbackOut,
    NeighborhoodOut,
    QrLandingOut,
    SttJobCreatedOut,
    SttJobStatusOut,
    SupportContactOut,
    TimelineStep,
    TrackOut,
)
from app.services.captcha import verify_captcha
from app.services.citizen_info import record_citizen_info, record_feedback
from app.services.complaint_intake import create_complaint
from app.services.queue import enqueue
from app.services.storage import upload_file, validate_file

router = APIRouter(prefix="/api/public", tags=["public"])
settings = get_settings()


@router.post("/complaints", response_model=ComplaintSubmitOut, status_code=201)
def submit_complaint(
    request: Request,
    description: str = Form("", max_length=5000),
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
    # A voice message stands on its own (transcribed + analyzed in the
    # background) — only require typed text to meet the length floor when
    # there's no audio attached to fall back on.
    has_audio = audio is not None and bool(audio.filename)
    if len(description.strip()) < 10 and not has_audio:
        raise AppError(422, "validation_error", "Kamida 10 ta belgi yozing yoki ovozli xabar yuboring")

    verify_captcha(captcha_token, request.client.host if request.client else None)
    enforce_submit_limits(request, phone)

    complaint = create_complaint(
        db,
        description=description,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        language=language,
        source=source,
        category_code=category_code,
        latitude=latitude,
        longitude=longitude,
        address=address,
        neighborhood_id=neighborhood_id,
        images=images,
        video=video,
        audio=audio,
    )

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


def _find_by_ticket(db: Session, ticket: str) -> Complaint:
    """Fuqaroni FAQAT ticket raqami bo'yicha aniqlash — track, info va
    feedback uchun yagona qoida ([03] §3.2/§3.5/§3.6).

    DIQQAT: ticket raqamlari ketma-ket (UY-2026-000123), shuning uchun
    telefon tekshiruvisiz istalgan kishi raqamni taxmin qilib boshqa
    fuqaroning murojaat tafsilotlarini (manzil, javoblar) ko'rishi va
    hatto ma'lumot/feedback yuborishi mumkin. Bu ongli tanlov (mahsulot
    egasi so'ragan) — telefon bilan tasdiqlash olib tashlandi.
    """
    complaint = db.execute(select(Complaint).where(Complaint.ticket_number == ticket)).scalar_one_or_none()
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    return complaint


def _info_request_text(complaint: Complaint) -> str | None:
    """Xodim `need_info` da so'ragan savol — oxirgi `info_requested`
    eventidan. Admin paneldagi matn bilan bir xil manba."""
    for event in reversed(complaint.events):
        if event.event_type == "info_requested" and event.payload:
            return event.payload.get("text")
    return None


@router.get("/complaints/track", response_model=TrackOut)
def track_complaint(request: Request, ticket: str, db: Session = Depends(get_db)):
    enforce_track_limit(request)
    complaint = _find_by_ticket(db, ticket)

    latest_reply = complaint.replies[-1] if complaint.replies else None

    return TrackOut(
        ticket_number=complaint.ticket_number,
        status_simple=STATUS_SIMPLE_MAP[complaint.status],
        need_info=complaint.status == "need_info",
        category=CategoryBrief(code=complaint.category.code, name=complaint.category.name(complaint.language)),
        # R0/Q5 (docs/03 §3.2): mas'ul bo'lim — kategoriya bilan bir xil til qoidasida
        department=(
            DepartmentPublic(
                code=complaint.assigned_department.code,
                name=complaint.assigned_department.name(complaint.language),
            )
            if complaint.assigned_department
            else None
        ),
        created_at=complaint.created_at,
        deadline_at=complaint.deadline_at,
        timeline=_build_timeline(complaint),
        reply_text=latest_reply.text if latest_reply else None,
        rejected_reason=complaint.rejected_reason if complaint.status == STATUS_REJECTED else None,
        info_request_text=_info_request_text(complaint) if complaint.status == STATUS_NEED_INFO else None,
        info_provided=bool(complaint.citizen_messages),
        can_give_feedback=complaint.status in (STATUS_RESOLVED, STATUS_CLOSED) and complaint.satisfaction is None,
        satisfaction=complaint.satisfaction,
    )


@router.post("/complaints/info", response_model=CitizenInfoOut)
def submit_citizen_info(
    request: Request,
    ticket: str = Form(...),
    text: str = Form(..., min_length=1, max_length=2000),
    images: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    """Fuqaro qo'shimcha ma'lumot yuboradi ([03] §3.5).

    Avval `need_info` bir tomonlama edi: xodim «ma'lumot kutilmoqda»
    deb qo'yardi, fuqaro esa `/holat` da faqat banner ko'rardi va javob
    qaytarish yo'li umuman yo'q edi — murojaat shu ustunda cheksiz
    qolib ketishi mumkin edi.
    """
    enforce_info_limit(request)
    complaint = _find_by_ticket(db, ticket)

    resumed = record_citizen_info(db, complaint, text, source="web", images=images)
    db.commit()
    db.refresh(complaint)

    return CitizenInfoOut(
        status_simple=STATUS_SIMPLE_MAP[complaint.status],
        need_info=complaint.status == STATUS_NEED_INFO,
        accepted=resumed,
    )


@router.post("/complaints/feedback", response_model=FeedbackOut)
def submit_feedback(request: Request, payload: FeedbackIn, db: Session = Depends(get_db)):
    """Fuqaro bahosi va qayta ochish ([03] §3.6) — fuqaroning yagona
    e'tiroz kanali. Usiz «hal qilindi» yorlig'i oxirgi so'z bo'lib
    qolar, norozi fuqaroga esa yangi murojaat yozishdan boshqa yo'l
    qolmasdi (yangi ticket, uzilgan tarix)."""
    enforce_info_limit(request)
    complaint = _find_by_ticket(db, payload.ticket)

    reopened = record_feedback(db, complaint, satisfied=payload.satisfied, comment=payload.comment)
    db.commit()
    db.refresh(complaint)

    return FeedbackOut(status_simple=STATUS_SIMPLE_MAP[complaint.status], reopened=reopened)


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(lang: str = "uz", db: Session = Depends(get_db)):
    categories = (
        db.execute(select(Category).where(Category.is_active.is_(True)).order_by(Category.sort_order)).scalars().all()
    )
    return [CategoryOut(code=c.code, name=c.name(lang), icon=c.icon) for c in categories]


@router.get("/neighborhoods", response_model=list[NeighborhoodOut])
def list_neighborhoods(district_id: uuid.UUID | None = Query(None), db: Session = Depends(get_db)):
    rows = (
        db.execute(select(Neighborhood).where(Neighborhood.is_active.is_(True), *( [Neighborhood.district_id == district_id] if district_id else [] )).order_by(Neighborhood.name))
        .scalars()
        .all()
    )
    return [NeighborhoodOut(id=n.id, name=n.name, district_id=n.district_id) for n in rows]


@router.get("/support", response_model=SupportContactOut)
def support_contact(district_id: uuid.UUID | None = Query(None), db: Session = Depends(get_db)):
    phone = settings.public_support_phone
    if district_id is not None:
        district = db.get(District, district_id)
        if district is not None and district.is_active:
            phone = district.support_phone or settings.public_support_phone
    telegram_url = f"https://t.me/{settings.telegram_bot_username}" if settings.telegram_bot_username else None
    return SupportContactOut(phone=phone, telegram_url=telegram_url)


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
    address_parts = [qr.street, qr.mfy, qr.district]
    address = ", ".join(p for p in address_parts if p) or None
    return QrLandingOut(
        neighborhood_id=qr.neighborhood_id,
        district_id=qr.district_id,
        neighborhood_name=qr.neighborhood.name if qr.neighborhood_id else None,
        district=qr.district,
        mfy=qr.mfy,
        street=qr.street,
        address=address,
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
