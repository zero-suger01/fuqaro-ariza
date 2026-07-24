import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.constants import STATUS_ASSIGNED, STATUS_IN_PROGRESS, STATUS_RESOLVED
from app.core.deps import get_current_admin, get_current_operator_up
from app.core.errors import AppError
from app.database import get_db
from app.models.category import Category
from app.models.citizen import Citizen
from app.models.complaint import Complaint
from app.models.department import Department
from app.models.user import User
from app.schemas.admin import (
    AiAnalysisOut,
    AssignRequest,
    CitizenBrief,
    ComplaintDetail,
    ComplaintListItem,
    DashboardStats,
    DepartmentBrief,
    DepartmentIn,
    DepartmentOut,
    DepartmentPatch,
    EventOut,
    FileOut,
    ReplyOut,
    StatusUpdateRequest,
)
from app.schemas.common import Page
from app.schemas.public import CategoryBrief
from app.services import workflow

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _category_brief(category: Category) -> CategoryBrief:
    return CategoryBrief(code=category.code, name=category.name("uz"))


def _department_brief(department: Department) -> DepartmentBrief:
    return DepartmentBrief(id=department.id, code=department.code, name=department.name("uz"))


def _complaint_to_detail(complaint: Complaint) -> ComplaintDetail:
    latest_ai = complaint.ai_analyses[-1] if complaint.ai_analyses else None
    ai_out = None
    if latest_ai is not None:
        ai_out = AiAnalysisOut(
            engine=latest_ai.engine,
            suggested_category=_category_brief(latest_ai.suggested_category) if latest_ai.suggested_category else None,
            confidence=latest_ai.confidence,
            priority=latest_ai.priority,
            sentiment=latest_ai.sentiment,
            summary=latest_ai.summary,
            suggested_reply=latest_ai.suggested_reply,
            tags=latest_ai.tags,
            created_at=latest_ai.created_at,
        )

    return ComplaintDetail(
        id=complaint.id,
        ticket_number=complaint.ticket_number,
        status=complaint.status,
        priority=complaint.priority,
        source=complaint.source,
        language=complaint.language,
        description=complaint.description,
        category=_category_brief(complaint.category),
        citizen=CitizenBrief.model_validate(complaint.citizen),
        latitude=complaint.latitude,
        longitude=complaint.longitude,
        address=complaint.address,
        neighborhood_name=complaint.neighborhood.name if complaint.neighborhood else None,
        department=_department_brief(complaint.assigned_department) if complaint.assigned_department else None,
        assigned_user_id=complaint.assigned_user_id,
        deadline_at=complaint.deadline_at,
        needs_review=complaint.needs_review,
        rejected_reason=complaint.rejected_reason,
        files=[FileOut.model_validate(f) for f in complaint.files],
        events=[EventOut.model_validate(e) for e in complaint.events],
        replies=[ReplyOut.model_validate(r) for r in complaint.replies],
        ai=ai_out,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        resolved_at=complaint.resolved_at,
    )


@router.get("/complaints", response_model=Page[ComplaintListItem], dependencies=[Depends(get_current_operator_up)])
def list_complaints(
    status: str | None = None,
    category: str | None = None,
    department_id: uuid.UUID | None = None,
    assigned_user_id: uuid.UUID | None = None,
    source: str | None = None,
    priority: str | None = None,
    overdue: bool = False,
    needs_review: bool = False,
    q: str | None = Query(None),
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Complaint).join(Citizen, Complaint.citizen_id == Citizen.id).join(
        Category, Complaint.category_id == Category.id
    )
    if status:
        query = query.filter(Complaint.status == status)
    if category:
        query = query.filter(Category.code == category)
    if department_id:
        query = query.filter(Complaint.assigned_department_id == department_id)
    if assigned_user_id:
        query = query.filter(Complaint.assigned_user_id == assigned_user_id)
    if source:
        query = query.filter(Complaint.source == source)
    if priority:
        query = query.filter(Complaint.priority == priority)
    if overdue:
        query = query.filter(
            Complaint.deadline_at < datetime.now(timezone.utc),
            Complaint.status.notin_(["resolved", "closed", "rejected", "archived"]),
        )
    if needs_review:
        query = query.filter(Complaint.needs_review.is_(True))
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(Complaint.ticket_number.ilike(like), Citizen.phone.ilike(like), Complaint.description.ilike(like))
        )
    if date_from:
        query = query.filter(Complaint.created_at >= date_from)
    if date_to:
        query = query.filter(Complaint.created_at < date_to + timedelta(days=1))

    total = query.count()
    rows = (
        query.order_by(Complaint.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    )

    items = [
        ComplaintListItem(
            id=c.id,
            ticket_number=c.ticket_number,
            status=c.status,
            priority=c.priority,
            category=_category_brief(c.category),
            citizen=CitizenBrief.model_validate(c.citizen),
            neighborhood_name=c.neighborhood.name if c.neighborhood else None,
            created_at=c.created_at,
            deadline_at=c.deadline_at,
            needs_review=c.needs_review,
        )
        for c in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/complaints/{complaint_id}", response_model=ComplaintDetail, dependencies=[Depends(get_current_operator_up)])
def get_complaint(complaint_id: uuid.UUID, db: Session = Depends(get_db)):
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    return _complaint_to_detail(complaint)


@router.patch("/complaints/{complaint_id}/status", response_model=ComplaintDetail)
def update_status(
    complaint_id: uuid.UUID,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_operator_up),
):
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    workflow.change_status(db, complaint, payload.status, actor_type="staff", actor_id=staff.id, note=payload.note)
    db.commit()
    db.refresh(complaint)
    return _complaint_to_detail(complaint)


@router.post("/complaints/{complaint_id}/assign", response_model=ComplaintDetail)
def assign_complaint(
    complaint_id: uuid.UUID,
    payload: AssignRequest,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_operator_up),
):
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise AppError(404, "not_found", "Murojaat topilmadi")
    if db.get(Department, payload.department_id) is None:
        raise AppError(404, "not_found", "Bo'lim topilmadi")

    workflow.assign(db, complaint, payload.department_id, payload.assigned_user_id, actor_id=staff.id)
    db.commit()
    db.refresh(complaint)
    return _complaint_to_detail(complaint)


@router.get("/departments", response_model=list[DepartmentOut], dependencies=[Depends(get_current_operator_up)])
def list_departments(db: Session = Depends(get_db)):
    return db.execute(select(Department).order_by(Department.code)).scalars().all()


@router.post("/departments", response_model=DepartmentOut, status_code=201, dependencies=[Depends(get_current_admin)])
def create_department(payload: DepartmentIn, db: Session = Depends(get_db)):
    if db.execute(select(Department).where(Department.code == payload.code)).scalar_one_or_none():
        raise AppError(400, "already_exists", "Bu kod band")
    department = Department(**payload.model_dump())
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


@router.patch("/departments/{department_id}", response_model=DepartmentOut, dependencies=[Depends(get_current_admin)])
def update_department(department_id: uuid.UUID, payload: DepartmentPatch, db: Session = Depends(get_db)):
    department = db.get(Department, department_id)
    if department is None:
        raise AppError(404, "not_found", "Bo'lim topilmadi")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(department, field, value)
    db.commit()
    db.refresh(department)
    return department


@router.get("/stats/dashboard", response_model=DashboardStats, dependencies=[Depends(get_current_operator_up)])
def dashboard_stats(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    return DashboardStats(
        today=db.query(Complaint).filter(Complaint.created_at >= today_start).count(),
        this_week=db.query(Complaint).filter(Complaint.created_at >= week_start).count(),
        this_month=db.query(Complaint).filter(Complaint.created_at >= month_start).count(),
        resolved=db.query(Complaint).filter(Complaint.status == STATUS_RESOLVED).count(),
        in_progress=db.query(Complaint).filter(Complaint.status.in_([STATUS_IN_PROGRESS, STATUS_ASSIGNED])).count(),
    )
