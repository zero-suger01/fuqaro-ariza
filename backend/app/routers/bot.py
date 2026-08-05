"""docs/03-kontraktlar.md §6 — Bot API. `X-Bot-Token` header bilan
autentifikatsiya (JWT emas) — `bot/` alohida, ishonchli protsess, oxirgi
foydalanuvchi sessiyasi emas.
"""
import uuid

from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.constants import (
    LANGUAGES,
    STATUS_CLOSED,
    STATUS_NEED_INFO,
    STATUS_RESOLVED,
    STATUS_SIMPLE_MAP,
)
from app.core.errors import AppError
from app.core.ratelimit import enforce_bot_submit_limit
from app.database import get_db
from app.models.citizen import Citizen
from app.models.complaint import Complaint
from app.schemas.bot import (
    BotCitizenInfoOut,
    BotComplaintListItem,
    BotFeedbackIn,
    BotFeedbackOut,
    CitizenLinkIn,
    CitizenLinkOut,
)
from app.schemas.public import PHONE_PATTERN, ComplaintSubmitOut
from app.services.citizen_info import record_citizen_info, record_feedback
from app.services.complaint_intake import create_complaint

settings = get_settings()
router = APIRouter(prefix="/api/bot", tags=["bot"])


def verify_bot_token(x_bot_token: str = Header(...)) -> None:
    if not settings.bot_api_token or x_bot_token != settings.bot_api_token:
        raise AppError(401, "unauthorized", "Noto'g'ri bot token")


@router.post("/citizens/link", response_model=CitizenLinkOut, dependencies=[Depends(verify_bot_token)])
def link_citizen(payload: CitizenLinkIn, db: Session = Depends(get_db)):
    """Kontakt ulashilganda (T1.2) chaqiriladi — telefon Telegram tomonidan
    tasdiqlangan keladi, shu sabab `is_phone_verified=True`."""
    citizen = db.execute(select(Citizen).where(Citizen.phone == payload.phone)).scalar_one_or_none()
    if citizen is None:
        citizen = Citizen(
            phone=payload.phone,
            first_name=payload.first_name,
            language=payload.language,
            telegram_chat_id=payload.telegram_chat_id,
            is_phone_verified=True,
        )
        db.add(citizen)
    else:
        citizen.telegram_chat_id = payload.telegram_chat_id
        citizen.first_name = payload.first_name or citizen.first_name
        citizen.language = payload.language
        citizen.is_phone_verified = True

    db.commit()
    db.refresh(citizen)
    return CitizenLinkOut(id=citizen.id, phone=citizen.phone, language=citizen.language)


@router.post(
    "/complaints", response_model=ComplaintSubmitOut, status_code=201, dependencies=[Depends(verify_bot_token)]
)
def bot_submit_complaint(
    description: str = Form(..., min_length=10, max_length=5000),
    first_name: str = Form(..., min_length=1, max_length=100),
    last_name: str = Form("", max_length=100),
    phone: str = Form(..., pattern=PHONE_PATTERN),
    language: str = Form("uz"),
    category_code: str | None = Form(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    address: str | None = Form(None),
    neighborhood_id: uuid.UUID | None = Form(None),
    telegram_chat_id: int = Form(...),
    images: list[UploadFile] = File(default=[]),
    video: UploadFile | None = File(None),
    audio: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    """docs/03 §6: "3.1 bilan bir xil maydonlar + telegram_chat_id;
    source=telegram". Captcha/IP rate-limit qo'llanmaydi (bot X-Bot-Token
    bilan ishonchli), lekin telefon bo'yicha limit web bilan BIRGA (bir xil
    Redis kaliti) hisoblanadi."""
    if language not in LANGUAGES:
        raise AppError(422, "validation_error", "Noto'g'ri til kodi")

    enforce_bot_submit_limit(phone)

    complaint = create_complaint(
        db,
        description=description,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        language=language,
        source="telegram",
        category_code=category_code,
        latitude=latitude,
        longitude=longitude,
        address=address,
        neighborhood_id=neighborhood_id,
        images=images,
        video=video,
        audio=audio,
        telegram_chat_id=telegram_chat_id,
    )

    return ComplaintSubmitOut(
        id=complaint.id,
        ticket_number=complaint.ticket_number,
        status=complaint.status,
        status_simple=STATUS_SIMPLE_MAP[complaint.status],
        created_at=complaint.created_at,
        track_url=f"/holat?ticket={complaint.ticket_number}",
    )


@router.get("/complaints", response_model=list[BotComplaintListItem], dependencies=[Depends(verify_bot_token)])
def bot_list_complaints(telegram_chat_id: int, db: Session = Depends(get_db)):
    citizen = db.execute(select(Citizen).where(Citizen.telegram_chat_id == telegram_chat_id)).scalar_one_or_none()
    if citizen is None:
        return []
    rows = (
        db.execute(select(Complaint).where(Complaint.citizen_id == citizen.id).order_by(Complaint.created_at.desc()))
        .scalars()
        .all()
    )
    return [
        BotComplaintListItem(
            ticket_number=c.ticket_number,
            status_simple=STATUS_SIMPLE_MAP[c.status],
            need_info=c.status == STATUS_NEED_INFO,
            info_request_text=_info_request_text(c) if c.status == STATUS_NEED_INFO else None,
            can_give_feedback=c.status in (STATUS_RESOLVED, STATUS_CLOSED) and c.satisfaction is None,
        )
        for c in rows
    ]


def _info_request_text(complaint: Complaint) -> str | None:
    for event in reversed(complaint.events):
        if event.event_type == "info_requested" and event.payload:
            return event.payload.get("text")
    return None


def _owned_complaint(db: Session, telegram_chat_id: int, ticket: str) -> Complaint:
    """Telegram tomonidagi identifikatsiya: ticket murojaatining fuqarosi
    AYNAN shu chat'ga bog'langan bo'lishi shart. Bo'lmasa 404 — web
    kanalidagi kabi, murojaat mavjudligi oshkor qilinmaydi ([03] §6)."""
    citizen = db.execute(select(Citizen).where(Citizen.telegram_chat_id == telegram_chat_id)).scalar_one_or_none()
    if citizen is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    complaint = db.execute(
        select(Complaint).where(Complaint.ticket_number == ticket, Complaint.citizen_id == citizen.id)
    ).scalar_one_or_none()
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    return complaint


@router.post("/complaints/info", response_model=BotCitizenInfoOut, dependencies=[Depends(verify_bot_token)])
def bot_submit_info(
    telegram_chat_id: int = Form(...),
    ticket: str = Form(...),
    text: str = Form(..., min_length=1, max_length=2000),
    images: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    """`need_info` javobining Telegram kanali ([03] §6, docs/08 T2.2).

    Web varianti (§3.5) bilan bir xil yadroni chaqiradi — yon effektlar
    ikki kanalda drift qilmasin.

    JSON emas, multipart: xodim ko'pincha HUJJAT so'raydi va Telegram —
    fuqaro uchun eng qulay kanal. Avval bu endpoint faqat matn qabul
    qilardi, ya'ni bot rasmni umuman uzata olmasdi va foydalanuvchi
    to'g'ri ish qilib turib «javob juda qisqa» degan xabar olardi."""
    complaint = _owned_complaint(db, telegram_chat_id, ticket)
    resumed = record_citizen_info(db, complaint, text, source="telegram", images=images)
    db.commit()
    db.refresh(complaint)
    return BotCitizenInfoOut(status_simple=STATUS_SIMPLE_MAP[complaint.status], accepted=resumed)


@router.post("/complaints/feedback", response_model=BotFeedbackOut, dependencies=[Depends(verify_bot_token)])
def bot_submit_feedback(payload: BotFeedbackIn, db: Session = Depends(get_db)):
    """«Hal bo'ldimi? Ha/Yo'q» inline tugmalari ([03] §3.6/§6, docs/08 T2.3)."""
    complaint = _owned_complaint(db, payload.telegram_chat_id, payload.ticket)
    reopened = record_feedback(db, complaint, satisfied=payload.satisfied, comment=payload.comment)
    db.commit()
    db.refresh(complaint)
    return BotFeedbackOut(status_simple=STATUS_SIMPLE_MAP[complaint.status], reopened=reopened)
