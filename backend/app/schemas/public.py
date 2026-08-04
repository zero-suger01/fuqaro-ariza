import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.core.constants import LANGUAGES, SOURCES

PHONE_PATTERN = r"^\+998\d{9}$"


class ComplaintSubmitOut(BaseModel):
    id: uuid.UUID
    ticket_number: str
    status: str
    status_simple: str
    created_at: datetime
    track_url: str


class TimelineStep(BaseModel):
    step: str
    at: datetime | None
    done: bool


class CategoryBrief(BaseModel):
    code: str
    name: str


class DepartmentPublic(BaseModel):
    """R0/Q5 (docs/03 §3.2) — fuqaro «murojaatim qayerda» savoliga javob."""

    code: str
    name: str


class TrackOut(BaseModel):
    ticket_number: str
    status_simple: str
    need_info: bool
    category: CategoryBrief
    department: DepartmentPublic | None
    created_at: datetime
    deadline_at: datetime | None
    timeline: list[TimelineStep]
    reply_text: str | None
    rejected_reason: str | None
    # v1.4: xodim so'ragan savolning O'ZI — usiz fuqaro nima
    # yuborishi kerakligini bilmasdi va sikl shu yerda uzilardi.
    info_request_text: str | None = None
    # Fuqaro allaqachon nima yuborganini ko'rsin (takror yubormasin).
    info_provided: bool = False
    # Baho berish/qayta ochish tugmalarini ko'rsatish uchun ([03] §3.6).
    can_give_feedback: bool = False
    satisfaction: bool | None = None


class CitizenInfoOut(BaseModel):
    """`POST /api/public/complaints/info` javobi ([03] §3.5)."""

    status_simple: str
    need_info: bool
    # `true` — murojaat avtomatik «Ijroda» ga qaytdi.
    accepted: bool


class FeedbackIn(BaseModel):
    """`POST /api/public/complaints/feedback` ([03] §3.6)."""

    ticket: str
    satisfied: bool
    comment: str | None = Field(default=None, max_length=2000)


class FeedbackOut(BaseModel):
    status_simple: str
    reopened: bool


class CategoryOut(BaseModel):
    code: str
    name: str
    icon: str | None


class NeighborhoodOut(BaseModel):
    id: uuid.UUID
    name: str
    district_id: uuid.UUID | None = None


class SupportContactOut(BaseModel):
    phone: str | None = None
    telegram_url: str | None = None


class QrLandingOut(BaseModel):
    neighborhood_id: uuid.UUID | None
    district_id: uuid.UUID | None = None
    neighborhood_name: str | None
    # v1.7.2 — QR manzilga bog'liq (tuman/MFY/ko'cha noyob), shuning uchun
    # fuqaro `/yangi`ga shu orqali kirsa 2-qadam manzilini avtomatik
    # to'ldiramiz (mijoz so'ragan) — qayta kiritish shart emas.
    district: str | None
    mfy: str | None
    street: str | None
    address: str | None


class SttJobCreatedOut(BaseModel):
    job_id: uuid.UUID


class SttJobStatusOut(BaseModel):
    status: str
    text: str | None
    code: str | None
