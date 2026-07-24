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


class TrackOut(BaseModel):
    ticket_number: str
    status_simple: str
    need_info: bool
    category: CategoryBrief
    created_at: datetime
    deadline_at: datetime | None
    timeline: list[TimelineStep]
    reply_text: str | None
    rejected_reason: str | None


class CategoryOut(BaseModel):
    code: str
    name: str
    icon: str | None


class NeighborhoodOut(BaseModel):
    id: uuid.UUID
    name: str


class QrLandingOut(BaseModel):
    neighborhood_id: uuid.UUID | None
    neighborhood_name: str | None


class SttJobCreatedOut(BaseModel):
    job_id: uuid.UUID


class SttJobStatusOut(BaseModel):
    status: str
    text: str | None
    code: str | None
