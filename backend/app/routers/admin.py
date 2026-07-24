import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.constants import STATUS_ASSIGNED, STATUS_IN_PROGRESS, STATUS_RESOLVED
from app.core.deps import get_current_admin, get_current_operator_up
from app.core.errors import AppError
from app.database import get_db
from app.models.category import Category
from app.models.citizen import Citizen
from app.models.complaint import Complaint
from app.models.department import Department
from app.models.keyword import CategoryKeyword
from app.models.keyword_suggestion import KeywordSuggestion
from app.models.user import User
from app.schemas.admin import (
    AiAnalysisOut,
    AssignRequest,
    CategoryAdminOut,
    CategoryIn,
    CategoryPatch,
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
    KeywordIn,
    KeywordOut,
    ReplyOut,
    StatusUpdateRequest,
    SuggestionOut,
)
from app.schemas.common import Page
from app.schemas.public import CategoryBrief
from app.services import workflow
from app.services.ai.normalize import normalize

router = APIRouter(prefix="/api/admin", tags=["admin"])
TERMINAL_STATUSES = ["resolved", "closed", "rejected", "archived"]


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
            Complaint.status.notin_(TERMINAL_STATUSES),
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


@router.get("/categories", response_model=list[CategoryAdminOut], dependencies=[Depends(get_current_operator_up)])
def list_categories(db: Session = Depends(get_db)):
    return db.execute(select(Category).order_by(Category.sort_order)).scalars().all()


@router.post("/categories", response_model=CategoryAdminOut, status_code=201, dependencies=[Depends(get_current_admin)])
def create_category(payload: CategoryIn, db: Session = Depends(get_db)):
    if db.execute(select(Category).where(Category.code == payload.code)).scalar_one_or_none():
        raise AppError(400, "already_exists", "Bu kategoriya kodi band")
    if payload.department_id and db.get(Department, payload.department_id) is None:
        raise AppError(404, "not_found", "Bo'lim topilmadi")
    category = Category(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/categories/{category_id}", response_model=CategoryAdminOut, dependencies=[Depends(get_current_admin)])
def update_category(category_id: uuid.UUID, payload: CategoryPatch, db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if category is None:
        raise AppError(404, "not_found", "Kategoriya topilmadi")
    if payload.department_id and db.get(Department, payload.department_id) is None:
        raise AppError(404, "not_found", "Bo'lim topilmadi")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


@router.get(
    "/categories/{category_id}/keywords",
    response_model=list[KeywordOut],
    dependencies=[Depends(get_current_operator_up)],
)
def list_keywords(category_id: uuid.UUID, db: Session = Depends(get_db)):
    if db.get(Category, category_id) is None:
        raise AppError(404, "not_found", "Kategoriya topilmadi")
    return (
        db.execute(select(CategoryKeyword).where(CategoryKeyword.category_id == category_id).order_by(CategoryKeyword.keyword_norm))
        .scalars()
        .all()
    )


@router.post(
    "/categories/{category_id}/keywords",
    response_model=KeywordOut,
    status_code=201,
    dependencies=[Depends(get_current_admin)],
)
def add_keyword(category_id: uuid.UUID, payload: KeywordIn, db: Session = Depends(get_db)):
    if db.get(Category, category_id) is None:
        raise AppError(404, "not_found", "Kategoriya topilmadi")
    keyword_norm = normalize(payload.phrase)
    if not keyword_norm:
        raise AppError(422, "validation_error", "Kalit so'z bo'sh bo'lishi mumkin emas")
    exists = db.execute(
        select(CategoryKeyword).where(
            CategoryKeyword.category_id == category_id, CategoryKeyword.keyword_norm == keyword_norm
        )
    ).scalar_one_or_none()
    if exists:
        raise AppError(400, "already_exists", "Bu kalit so'z allaqachon qo'shilgan")
    keyword = CategoryKeyword(category_id=category_id, keyword_norm=keyword_norm, weight=payload.weight, source="admin")
    db.add(keyword)
    db.commit()
    db.refresh(keyword)
    return keyword


@router.delete(
    "/categories/{category_id}/keywords/{keyword_id}", status_code=204, dependencies=[Depends(get_current_admin)]
)
def delete_keyword(category_id: uuid.UUID, keyword_id: uuid.UUID, db: Session = Depends(get_db)):
    keyword = db.get(CategoryKeyword, keyword_id)
    if keyword is None or keyword.category_id != category_id:
        raise AppError(404, "not_found", "Kalit so'z topilmadi")
    db.delete(keyword)
    db.commit()


@router.get(
    "/keyword-suggestions", response_model=list[SuggestionOut], dependencies=[Depends(get_current_admin)]
)
def list_keyword_suggestions(status: str = "pending", db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(KeywordSuggestion)
            .where(KeywordSuggestion.status == status)
            .order_by(KeywordSuggestion.occurrences.desc())
        )
        .scalars()
        .all()
    )
    return [
        SuggestionOut(
            id=s.id,
            phrase_norm=s.phrase_norm,
            suggested_category=_category_brief(s.suggested_category) if s.suggested_category else None,
            occurrences=s.occurrences,
            sample_complaint_ids=s.sample_complaint_ids,
            status=s.status,
            created_at=s.created_at,
        )
        for s in rows
    ]


@router.post(
    "/keyword-suggestions/{suggestion_id}/approve", response_model=SuggestionOut, dependencies=[Depends(get_current_admin)]
)
def approve_keyword_suggestion(
    suggestion_id: uuid.UUID, db: Session = Depends(get_db), staff: User = Depends(get_current_admin)
):
    suggestion = db.get(KeywordSuggestion, suggestion_id)
    if suggestion is None:
        raise AppError(404, "not_found", "Taklif topilmadi")
    if suggestion.status != "pending":
        raise AppError(400, "already_reviewed", "Bu taklif allaqachon ko'rib chiqilgan")
    if suggestion.suggested_category_id is None:
        raise AppError(422, "validation_error", "Taklifda kategoriya yo'q")

    existing = db.execute(
        select(CategoryKeyword).where(
            CategoryKeyword.category_id == suggestion.suggested_category_id,
            CategoryKeyword.keyword_norm == suggestion.phrase_norm,
        )
    ).scalar_one_or_none()
    if existing is None:
        weight = 2 if " " in suggestion.phrase_norm else 1
        db.add(
            CategoryKeyword(
                category_id=suggestion.suggested_category_id,
                keyword_norm=suggestion.phrase_norm,
                weight=weight,
                source="auto",
            )
        )

    suggestion.status = "approved"
    suggestion.reviewed_by = staff.id
    suggestion.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(suggestion)
    return SuggestionOut(
        id=suggestion.id,
        phrase_norm=suggestion.phrase_norm,
        suggested_category=_category_brief(suggestion.suggested_category) if suggestion.suggested_category else None,
        occurrences=suggestion.occurrences,
        sample_complaint_ids=suggestion.sample_complaint_ids,
        status=suggestion.status,
        created_at=suggestion.created_at,
    )


@router.post(
    "/keyword-suggestions/{suggestion_id}/reject", response_model=SuggestionOut, dependencies=[Depends(get_current_admin)]
)
def reject_keyword_suggestion(
    suggestion_id: uuid.UUID, db: Session = Depends(get_db), staff: User = Depends(get_current_admin)
):
    suggestion = db.get(KeywordSuggestion, suggestion_id)
    if suggestion is None:
        raise AppError(404, "not_found", "Taklif topilmadi")
    if suggestion.status != "pending":
        raise AppError(400, "already_reviewed", "Bu taklif allaqachon ko'rib chiqilgan")

    suggestion.status = "rejected"
    suggestion.reviewed_by = staff.id
    suggestion.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(suggestion)
    return SuggestionOut(
        id=suggestion.id,
        phrase_norm=suggestion.phrase_norm,
        suggested_category=_category_brief(suggestion.suggested_category) if suggestion.suggested_category else None,
        occurrences=suggestion.occurrences,
        sample_complaint_ids=suggestion.sample_complaint_ids,
        status=suggestion.status,
        created_at=suggestion.created_at,
    )


@router.get("/stats/dashboard", response_model=DashboardStats, dependencies=[Depends(get_current_operator_up)])
def dashboard_stats(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    priority_rows = db.query(Complaint.priority, func.count()).group_by(Complaint.priority).all()

    ai_scored = (
        db.query(Complaint)
        .filter(Complaint.created_at >= seven_days_ago, Complaint.ai_category_id.isnot(None))
        .all()
    )
    ai_accuracy_7d = (
        round(sum(1 for c in ai_scored if c.ai_category_id == c.category_id) / len(ai_scored), 2)
        if ai_scored
        else None
    )

    return DashboardStats(
        today=db.query(Complaint).filter(Complaint.created_at >= today_start).count(),
        this_week=db.query(Complaint).filter(Complaint.created_at >= week_start).count(),
        this_month=db.query(Complaint).filter(Complaint.created_at >= month_start).count(),
        resolved=db.query(Complaint).filter(Complaint.status == STATUS_RESOLVED).count(),
        in_progress=db.query(Complaint).filter(Complaint.status.in_([STATUS_IN_PROGRESS, STATUS_ASSIGNED])).count(),
        overdue=db.query(Complaint)
        .filter(Complaint.deadline_at < now, Complaint.status.notin_(TERMINAL_STATUSES))
        .count(),
        needs_review=db.query(Complaint).filter(Complaint.needs_review.is_(True)).count(),
        by_priority={priority: count for priority, count in priority_rows},
        ai_accuracy_7d=ai_accuracy_7d,
    )
