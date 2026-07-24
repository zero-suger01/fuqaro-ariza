import uuid
from datetime import datetime

from pydantic import BaseModel, Field

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


class DashboardStats(BaseModel):
    today: int
    this_week: int
    this_month: int
    resolved: int
    in_progress: int


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
