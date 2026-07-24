import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.core.constants import STAFF_ROLES
from app.schemas.public import CategoryBrief


class CitizenBrief(BaseModel):
    id: uuid.UUID
    phone: str
    fullname: str

    class Config:
        from_attributes = True


class DepartmentBrief(BaseModel):
    id: uuid.UUID
    code: str
    name: str

    class Config:
        from_attributes = True


class DepartmentOut(BaseModel):
    id: uuid.UUID
    code: str
    names: dict
    phone: str | None
    email: str | None
    is_external: bool
    is_active: bool

    class Config:
        from_attributes = True


class DepartmentIn(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    names: dict = Field(min_length=1)
    phone: str | None = None
    email: str | None = None
    is_external: bool = False
    is_active: bool = True


class DepartmentPatch(BaseModel):
    names: dict | None = None
    phone: str | None = None
    email: str | None = None
    is_external: bool | None = None
    is_active: bool | None = None


class CategoryAdminOut(BaseModel):
    id: uuid.UUID
    code: str
    names: dict
    icon: str | None
    sla_hours: int
    department_id: uuid.UUID | None
    sort_order: int
    is_active: bool

    class Config:
        from_attributes = True


class CategoryIn(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    names: dict = Field(min_length=1)
    icon: str | None = None
    sla_hours: int = Field(default=72, ge=1)
    department_id: uuid.UUID | None = None
    sort_order: int = 0
    is_active: bool = True


class CategoryPatch(BaseModel):
    names: dict | None = None
    icon: str | None = None
    sla_hours: int | None = None
    department_id: uuid.UUID | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class KeywordOut(BaseModel):
    id: uuid.UUID
    keyword_norm: str
    weight: int
    source: str

    class Config:
        from_attributes = True


class KeywordIn(BaseModel):
    phrase: str = Field(min_length=1, max_length=120)
    weight: int = Field(default=1, ge=1, le=5)


class SuggestionOut(BaseModel):
    id: uuid.UUID
    phrase_norm: str
    suggested_category: CategoryBrief | None
    occurrences: int
    sample_complaint_ids: list
    status: str
    created_at: datetime


class FileOut(BaseModel):
    id: uuid.UUID
    kind: str
    url: str
    mime: str
    size_bytes: int
    duration_s: int | None

    class Config:
        from_attributes = True


class EventOut(BaseModel):
    id: uuid.UUID
    event_type: str
    actor_type: str
    actor_id: uuid.UUID | None
    payload: dict | None
    created_at: datetime

    class Config:
        from_attributes = True


class AiAnalysisOut(BaseModel):
    engine: str
    suggested_category: CategoryBrief | None
    confidence: float | None
    priority: str | None
    sentiment: str | None
    summary: str | None
    suggested_reply: str | None
    tags: list | None
    created_at: datetime

    class Config:
        from_attributes = True


class ReplyOut(BaseModel):
    id: uuid.UUID
    text: str
    channels: list
    sent_at: datetime

    class Config:
        from_attributes = True


class ReplyIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class CommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class UserAdminOut(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    fullname: str
    phone: str
    email: str | None
    role: str
    department_id: uuid.UUID | None
    is_active: bool

    class Config:
        from_attributes = True


class UserIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=7, max_length=16)
    email: str | None = None
    password: str = Field(min_length=6, max_length=128)
    role: str = "operator"
    department_id: uuid.UUID | None = None

    @field_validator("role")
    @classmethod
    def _valid_role(cls, value: str) -> str:
        if value not in STAFF_ROLES:
            raise ValueError(f"role {STAFF_ROLES} dan biri bo'lishi kerak")
        return value


class UserPatch(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)
    role: str | None = None
    department_id: uuid.UUID | None = None
    is_active: bool | None = None

    @field_validator("role")
    @classmethod
    def _valid_role(cls, value: str | None) -> str | None:
        if value is not None and value not in STAFF_ROLES:
            raise ValueError(f"role {STAFF_ROLES} dan biri bo'lishi kerak")
        return value


class ComplaintListItem(BaseModel):
    id: uuid.UUID
    ticket_number: str
    status: str
    priority: str
    category: CategoryBrief
    citizen: CitizenBrief
    neighborhood_name: str | None
    created_at: datetime
    deadline_at: datetime | None
    needs_review: bool

    class Config:
        from_attributes = True


class ComplaintDetail(BaseModel):
    id: uuid.UUID
    ticket_number: str
    status: str
    priority: str
    source: str
    language: str
    description: str
    category: CategoryBrief
    citizen: CitizenBrief
    latitude: float | None
    longitude: float | None
    address: str | None
    neighborhood_name: str | None
    department: DepartmentBrief | None
    assigned_user_id: uuid.UUID | None
    deadline_at: datetime | None
    needs_review: bool
    rejected_reason: str | None
    files: list[FileOut]
    events: list[EventOut]
    replies: list[ReplyOut]
    ai: AiAnalysisOut | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None

    class Config:
        from_attributes = True


class StatusUpdateRequest(BaseModel):
    status: str
    note: str | None = None


class AssignRequest(BaseModel):
    department_id: uuid.UUID
    assigned_user_id: uuid.UUID | None = None


class NeighborhoodStat(BaseModel):
    neighborhood_id: uuid.UUID | None
    neighborhood_name: str | None
    count: int


class DashboardStats(BaseModel):
    today: int
    this_week: int
    this_month: int
    resolved: int
    in_progress: int
    overdue: int
    needs_review: int
    by_priority: dict[str, int]
    ai_accuracy_7d: float | None
    by_neighborhood: list[NeighborhoodStat]


class MonthlyPoint(BaseModel):
    month: str
    count: int


class CategoryPoint(BaseModel):
    category: str
    count: int


class ResolutionTimeStats(BaseModel):
    average_hours: float | None
    resolved_count: int


class TopIssue(BaseModel):
    category: str
    count: int


class StatsResponse(BaseModel):
    monthly: list[MonthlyPoint]
    by_category: list[CategoryPoint]
    resolution_time: ResolutionTimeStats
    top_issues: list[TopIssue]


class AuditLogOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_fullname: str | None
    action: str
    entity: str
    entity_id: uuid.UUID
    meta: dict | None
    ip: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class QrCodeIn(BaseModel):
    neighborhood_id: uuid.UUID | None = None
    note: str | None = Field(None, max_length=200)


class QrCodeOut(BaseModel):
    id: uuid.UUID
    code: str
    neighborhood_id: uuid.UUID | None
    neighborhood_name: str | None
    note: str | None
    scans: int
    created_at: datetime
    png_url: str
    pdf_url: str


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    weight: int


class MapPoint(BaseModel):
    id: uuid.UUID
    ticket_number: str
    lat: float
    lng: float
    status: str
    priority: str
    category_name: str


class KpiRow(BaseModel):
    key: str | None
    label: str
    total: int
    resolved: int
    avg_first_response_hours: float | None
    avg_resolution_hours: float | None
    sla_percent: float | None


class AiTrendPoint(BaseModel):
    date: str
    accuracy: float | None
    llm_share: float | None
