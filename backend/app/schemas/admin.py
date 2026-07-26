import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.constants import REVIEW_REASONS, STAFF_ROLES, SUBTASK_STATUSES
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
    # v1.4: bir vaqtda ola oladigan aktiv ish soni. Bloklamaydi —
    # oshgani dashboard jadvalida belgilanadi ([04] departments).
    wip_limit: int | None = None

    class Config:
        from_attributes = True


class DepartmentIn(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    names: dict = Field(min_length=1)
    phone: str | None = None
    email: str | None = None
    is_external: bool = False
    is_active: bool = True
    wip_limit: int | None = Field(default=None, ge=0)


class DepartmentPatch(BaseModel):
    names: dict | None = None
    phone: str | None = None
    email: str | None = None
    is_external: bool | None = None
    is_active: bool | None = None
    wip_limit: int | None = Field(default=None, ge=0)


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


class FileOut(BaseModel):
    id: uuid.UUID
    kind: str
    url: str
    mime: str
    size_bytes: int
    duration_s: int | None
    transcript: str | None = None

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
    role: str = "department_staff"
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


class AiListBrief(BaseModel):
    """R2: ro'yxat qatoridagi qisqa AI ma'lumoti — Navbatim sahifasidagi xulosa
    qatori va Tasdiqlash navbatidagi taklif uchun (docs/03 §5 list izohi)."""

    summary: str | None
    suggested_category: CategoryBrief | None
    confidence: float | None
    # v1.5 ko'p bo'limli murojaat ([07] §1.1) — AI yaratgan OCHIQ sub-tasklar
    # bo'lim nomlari. Tasdiqlash navbati buni ko'rsatmasa admin murojaatni
    # ochmasdan turib bo'linish bo'lganini bilmaydi.
    open_subtask_departments: list[str] = []


class ComplaintListItem(BaseModel):
    id: uuid.UUID
    ticket_number: str
    status: str
    priority: str
    category: CategoryBrief
    citizen: CitizenBrief
    neighborhood_name: str | None
    department: DepartmentBrief | None
    created_at: datetime
    deadline_at: datetime | None
    needs_review: bool
    ai: AiListBrief | None = None
    # R2: navbat sahifalarida matnni ochmasdan ko'rish uchun (birinchi 160 belgi)
    description_snippet: str = ""
    # v1.4: navbat «Mening ishlarim» / «Bo'lim navbati» ga bo'linishi uchun
    # egalik ro'yxat qatorida ham ko'rinishi kerak.
    assigned_user_id: uuid.UUID | None = None
    assigned_user_name: str | None = None
    info_requested_at: datetime | None = None

    class Config:
        from_attributes = True


class CitizenMessageOut(BaseModel):
    """Fuqarodan kelgan qo'shimcha ma'lumot ([04] citizen_messages)."""

    id: uuid.UUID
    text: str
    source: str
    recorded_by: uuid.UUID | None
    recorded_by_name: str | None
    created_at: datetime


class SubtaskOut(BaseModel):
    id: uuid.UUID
    department_id: uuid.UUID
    department_name: str
    assigned_user_id: uuid.UUID | None
    status: str
    note: str
    deadline_at: datetime | None
    created_at: datetime
    closed_at: datetime | None
    # v1.5: AI ko'p bo'limli murojaatni o'zi bo'lganda `created_by` NULL
    # bo'ladi ([04] complaint_subtasks) — UI manbani ko'rsatishi uchun.
    created_by_ai: bool = False


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
    assigned_user_name: str | None = None
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
    # v1.4 ([03] §5 detail qatori)
    accepted_at: datetime | None = None
    info_requested_at: datetime | None = None
    info_provided_at: datetime | None = None
    info_request_text: str | None = None
    citizen_messages: list[CitizenMessageOut] = []
    subtasks: list[SubtaskOut] = []
    satisfaction: bool | None = None
    reopened_count: int = 0

    class Config:
        from_attributes = True


class StatusUpdateRequest(BaseModel):
    status: str
    note: str | None = None
    # R0/Q2: faqat status=resolved bilan — server avval javob yaratadi, keyin
    # statusni o'tkazadi (docs/03 §5). resolved uchun javob majburiy.
    reply_text: str | None = Field(default=None, max_length=5000)


class ReviewRequest(BaseModel):
    """R0/Q3 — needs_review'ni bir bosishda yopish (docs/03 §5 review qatori).
    Kategoriya/bo'lim ixtiyoriy: default — AI taklifi va kategoriya bo'limi.

    v1.4: `reason` MAJBURIY. Sababsiz tuzatish AI sifatini o'lchashni
    imkonsiz qilardi — «admin nimanidir o'zgartirdi» dan boshqa hech
    narsa bilinmasdi."""

    category_code: str | None = None
    department_id: uuid.UUID | None = None
    reason: str
    reason_text: str | None = Field(default=None, max_length=500)

    @field_validator("reason")
    @classmethod
    def _known_reason(cls, value: str) -> str:
        if value not in REVIEW_REASONS:
            raise ValueError(f"reason {REVIEW_REASONS} dan biri bo'lishi kerak")
        return value

    @model_validator(mode="after")
    def _other_needs_text(self) -> "ReviewRequest":
        if self.reason == "other" and not (self.reason_text or "").strip():
            raise ValueError("reason='other' uchun reason_text majburiy")
        return self


class AssignRequest(BaseModel):
    department_id: uuid.UUID
    # Berilmasa egalik o'zgarmaydi (bo'lim ham o'zgarmagan bo'lsa) —
    # [03] §5 «Egalik qoidasi».
    assigned_user_id: uuid.UUID | None = None


class ClaimResponse(BaseModel):
    """`POST /complaints/{id}/claim` — «Qabul qilaman» (v1.4)."""

    ok: bool = True


class CitizenInfoIn(BaseModel):
    """Manual kanal: xodim fuqarodan telefonda olgan ma'lumotni yozadi."""

    text: str = Field(min_length=1, max_length=2000)


class SubtaskIn(BaseModel):
    department_id: uuid.UUID
    note: str = Field(min_length=1, max_length=2000)
    deadline_at: datetime | None = None
    assigned_user_id: uuid.UUID | None = None


class SubtaskUpdate(BaseModel):
    status: str
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("status")
    @classmethod
    def _known_status(cls, value: str) -> str:
        if value not in SUBTASK_STATUSES:
            raise ValueError(f"status {SUBTASK_STATUSES} dan biri bo'lishi kerak")
        return value


class DepartmentQueueRow(BaseModel):
    department_id: uuid.UUID
    department_name: str
    new: int
    in_progress: int
    sla_risk: int
    overdue: int
    unowned: int
    wip_limit: int | None
    over_limit: bool


class QueueStats(BaseModel):
    """Operatsion bosh ekran ([03] §5 `stats/queues`, [10] §10.1).

    Har son `GET /complaints` ning mos filtri bilan AYNAN bir xil
    shartdan chiqadi — karta bosilganda ochiladigan ro'yxat soni bilan
    mos kelmasligi ishonchni yo'qotadi."""

    unassigned: int
    ai_exceptions: int
    sla_risk: int
    overdue: int
    awaiting_info: int
    stuck_ai: int
    by_department: list[DepartmentQueueRow]


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
    ai_auto_routed_7d: int
    ai_routing_corrected_7d: int
    # R0 avtomatlashtirish KPI (docs/03 §5, docs/00 §Muvaffaqiyat #5)
    zero_touch_7d: float | None
    draft_reply_share_7d: float | None
    avg_first_action_hours_7d: float | None
    resolved_with_reply_7d: float | None


class AiHealthOut(BaseModel):
    """R0/Q4 — GET /api/admin/stats/ai-health (docs/03 §5). LLM jim o'lishi
    (premortem X5) endi dashboard'da ko'rinadigan hodisa."""

    ollama_ok: bool
    model: str
    last_llm_success_at: datetime | None
    llm_queue_depth: int
    llm_errors_1h: int
    # v1.3: hali tahlil qilinmagan (status=new) murojaatlar — LLM yagona
    # dvigatel bo'lgani uchun eng muhim signal (docs/03 §5).
    pending_analysis: int
    stt_ok: bool


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
    # v1.3: eski `llm_share` o'rniga — LLM yagona dvigatel bo'lgach u doim
    # 1.0 bo'lardi. Endi AI o'zi ikkilangan murojaatlar ulushi (docs/07 §5).
    low_confidence_share: float | None
