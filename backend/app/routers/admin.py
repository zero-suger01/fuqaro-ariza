import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.comment import Comment
from app.models.complaint import Complaint, ComplaintCategory, ComplaintStatus
from app.models.organization import Organization
from app.models.user import User
from app.schemas.admin import (
    CategoryPoint,
    DashboardStats,
    MonthlyPoint,
    ResolutionTimeStats,
    StatsResponse,
    TopIssue,
)
from app.schemas.complaint import (
    CommentCreate,
    CommentOut,
    ComplaintOut,
    OrgAssignRequest,
    OrganizationOut,
    StatusUpdateRequest,
)
from app.services.notifications import notify

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


STATUS_LABELS = {
    ComplaintStatus.YANGI: "Yangi",
    ComplaintStatus.KORIB_CHIQILMOQDA: "Ko'rib chiqilmoqda",
    ComplaintStatus.MASUL_TASHKILOTGA_YUBORILDI: "Mas'ul tashkilotga yuborildi",
    ComplaintStatus.JARAYONDA: "Jarayonda",
    ComplaintStatus.HAL_QILINDI: "Hal qilindi",
    ComplaintStatus.RAD_ETILDI: "Rad etildi",
}


@router.get("/complaints", response_model=list[ComplaintOut])
def list_complaints(
    status: ComplaintStatus | None = None,
    category: ComplaintCategory | None = None,
    district: str | None = None,
    neighborhood: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Complaint)
    if status:
        query = query.filter(Complaint.status == status)
    if category:
        query = query.filter(Complaint.category == category)
    if district:
        query = query.filter(Complaint.district.ilike(f"%{district}%"))
    if neighborhood:
        query = query.filter(Complaint.neighborhood.ilike(f"%{neighborhood}%"))
    if date_from:
        query = query.filter(Complaint.created_at >= date_from)
    if date_to:
        query = query.filter(Complaint.created_at < date_to + timedelta(days=1))
    if search:
        query = query.filter(Complaint.description.ilike(f"%{search}%"))
    return query.order_by(Complaint.created_at.desc()).all()


@router.get("/complaints/{complaint_id}", response_model=ComplaintOut)
def get_complaint(complaint_id: uuid.UUID, db: Session = Depends(get_db)):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")
    return complaint


@router.patch("/complaints/{complaint_id}/status", response_model=ComplaintOut)
def update_status(complaint_id: uuid.UUID, payload: StatusUpdateRequest, db: Session = Depends(get_db)):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")

    complaint.status = payload.status
    if payload.status == ComplaintStatus.HAL_QILINDI:
        complaint.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(complaint)

    notify(
        db,
        complaint.user,
        f"Murojaatingiz holati o'zgardi: {STATUS_LABELS[payload.status]}",
        complaint_id=complaint.id,
    )
    return complaint


@router.post("/complaints/{complaint_id}/assign", response_model=ComplaintOut)
def assign_organization(complaint_id: uuid.UUID, payload: OrgAssignRequest, db: Session = Depends(get_db)):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")
    organization = db.get(Organization, payload.organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Tashkilot topilmadi")

    complaint.organization_id = organization.id
    complaint.status = ComplaintStatus.MASUL_TASHKILOTGA_YUBORILDI
    db.commit()
    db.refresh(complaint)

    notify(
        db,
        complaint.user,
        f"Murojaatingiz {organization.name} tashkilotiga yuborildi",
        complaint_id=complaint.id,
    )
    return complaint


@router.post("/complaints/{complaint_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    complaint_id: uuid.UUID,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")

    comment = Comment(complaint_id=complaint_id, admin_id=admin.id, comment=payload.comment)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/organizations", response_model=list[OrganizationOut])
def list_organizations(db: Session = Depends(get_db)):
    return db.query(Organization).order_by(Organization.name).all()


@router.get("/stats/dashboard", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = datetime(now.year, now.month, 1)

    today_count = db.query(Complaint).filter(Complaint.created_at >= today_start).count()
    week_count = db.query(Complaint).filter(Complaint.created_at >= week_start).count()
    month_count = db.query(Complaint).filter(Complaint.created_at >= month_start).count()
    resolved_count = db.query(Complaint).filter(Complaint.status == ComplaintStatus.HAL_QILINDI).count()
    in_progress_count = db.query(Complaint).filter(
        Complaint.status.in_([ComplaintStatus.JARAYONDA, ComplaintStatus.MASUL_TASHKILOTGA_YUBORILDI])
    ).count()

    return DashboardStats(
        today=today_count,
        this_week=week_count,
        this_month=month_count,
        resolved=resolved_count,
        in_progress=in_progress_count,
    )


@router.get("/stats/charts", response_model=StatsResponse)
def chart_stats(db: Session = Depends(get_db)):
    twelve_months_ago = datetime.utcnow() - timedelta(days=365)
    monthly_rows = (
        db.query(func.to_char(Complaint.created_at, "YYYY-MM").label("month"), func.count().label("count"))
        .filter(Complaint.created_at >= twelve_months_ago)
        .group_by("month")
        .order_by("month")
        .all()
    )

    category_rows = (
        db.query(Complaint.category, func.count().label("count"))
        .group_by(Complaint.category)
        .order_by(func.count().desc())
        .all()
    )

    resolved = db.query(Complaint).filter(
        Complaint.status == ComplaintStatus.HAL_QILINDI, Complaint.resolved_at.isnot(None)
    ).all()
    if resolved:
        avg_seconds = sum((c.resolved_at - c.created_at).total_seconds() for c in resolved) / len(resolved)
        avg_hours = round(avg_seconds / 3600, 1)
    else:
        avg_hours = None

    return StatsResponse(
        monthly=[MonthlyPoint(month=row.month, count=row.count) for row in monthly_rows],
        by_category=[CategoryPoint(category=row.category.value, count=row.count) for row in category_rows],
        resolution_time=ResolutionTimeStats(average_hours=avg_hours, resolved_count=len(resolved)),
        top_issues=[TopIssue(category=row.category.value, count=row.count) for row in category_rows[:5]],
    )
