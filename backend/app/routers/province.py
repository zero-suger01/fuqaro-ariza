import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, cast, Date, func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_province
from app.core.errors import AppError
from app.database import get_db
from app.models.complaint import Complaint
from app.models.district import District
from app.models.region import Region
from app.models.neighborhood import Neighborhood
from app.models.user import User
from app.schemas.province import DistrictDetailSummary, DistrictSummary, NeighborhoodSummary, ProvinceOverview, TrendPoint

router = APIRouter(prefix="/api/province", tags=["province"])
TERMINAL = ("resolved", "rejected", "closed", "archived")


def _district_filter(user: User):
    if user.role == "system_admin":
        return None
    if user.region_id is None:
        raise AppError(403, "forbidden", "Viloyat scope biriktirilmagan")
    return District.region_id == user.region_id


def _region_name(db: Session, user: User) -> tuple[Any, str]:
    if user.role == "system_admin" and user.region_id is None:
        return None, "Barcha hududlar"
    region = db.get(Region, user.region_id)
    if region is None:
        raise AppError(403, "forbidden", "Viloyat topilmadi")
    return region.id, (region.names or {}).get("uz", region.code)


@router.get("/overview", response_model=ProvinceOverview)
def overview(user: User = Depends(get_current_province), db: Session = Depends(get_db)):
    region_id, region_name = _region_name(db, user)
    district_filter = _district_filter(user)
    district_rows = db.execute(
        select(
            District.id,
            District.code,
            District.names,
            District.parent_district_id,
            func.count(Complaint.id).label("total"),
            func.count(case((~Complaint.status.in_(TERMINAL), 1))).label("open"),
            func.count(case((Complaint.status == "resolved", 1))).label("resolved"),
            func.count(case((Complaint.deadline_at < func.now(), 1))).label("overdue"),
        )
        .outerjoin(Complaint, Complaint.district_id == District.id)
        .where(District.is_active.is_(True), *( [district_filter] if district_filter is not None else [] ))
        .group_by(District.id, District.code)
        .order_by(District.code)
    ).all()
    districts = [DistrictSummary(district_id=r.id, code=r.code, name=(r.names or {}).get("uz", r.code), parent_district_id=r.parent_district_id, total=r.total or 0, open=r.open or 0, resolved=r.resolved or 0, overdue=r.overdue or 0) for r in district_rows]
    return ProvinceOverview(region_id=region_id, region_name=region_name, total=sum(x.total for x in districts), open=sum(x.open for x in districts), resolved=sum(x.resolved for x in districts), overdue=sum(x.overdue for x in districts), districts=districts)


@router.get("/districts", response_model=list[DistrictSummary])
def districts(user: User = Depends(get_current_province), db: Session = Depends(get_db)):
    return overview(user, db).districts


@router.get("/districts/{district_id}/summary", response_model=DistrictDetailSummary)
def district_summary(district_id: uuid.UUID, user: User = Depends(get_current_province), db: Session = Depends(get_db)):
    district = db.get(District, district_id)
    if district is None or not district.is_active:
        raise AppError(404, "not_found", "Tuman topilmadi")
    allowed = _district_filter(user)
    if allowed is not None and district.region_id != user.region_id:
        raise AppError(403, "forbidden", "Bu hudud sizning viloyat scope'ingizda emas")
    rows = db.execute(
        select(Complaint.status, func.count(Complaint.id))
        .where(Complaint.district_id == district.id)
        .group_by(Complaint.status)
    ).all()
    status_counts = {status: count for status, count in rows}
    overdue = db.scalar(select(func.count(Complaint.id)).where(Complaint.district_id == district.id, Complaint.deadline_at < func.now(), ~Complaint.status.in_(TERMINAL))) or 0
    neighborhood_rows = db.execute(
        select(Neighborhood.id, Neighborhood.name, func.count(Complaint.id).label("total"), func.count(case((~Complaint.status.in_(TERMINAL), 1))).label("open"), func.count(case((Complaint.status == "resolved", 1))).label("resolved"))
        .outerjoin(Complaint, Complaint.neighborhood_id == Neighborhood.id)
        .where(Neighborhood.district_id == district.id, Neighborhood.is_active.is_(True))
        .group_by(Neighborhood.id, Neighborhood.name)
        .order_by(func.count(Complaint.id).desc(), Neighborhood.name)
    ).all()
    summary = DistrictSummary(district_id=district.id, code=district.code, name=(district.names or {}).get("uz", district.code), parent_district_id=district.parent_district_id, total=sum(status_counts.values()), open=sum(v for k, v in status_counts.items() if k not in TERMINAL), resolved=status_counts.get("resolved", 0), overdue=overdue)
    return DistrictDetailSummary(district=summary, by_status=status_counts, neighborhoods=[NeighborhoodSummary(neighborhood_id=r.id, name=r.name, total=r.total or 0, open=r.open or 0, resolved=r.resolved or 0) for r in neighborhood_rows])


@router.get("/trends", response_model=list[TrendPoint])
def trends(days: int = Query(default=30, ge=1, le=365), user: User = Depends(get_current_province), db: Session = Depends(get_db)):
    district_filter = _district_filter(user)
    since = datetime.now(timezone.utc) - timedelta(days=days - 1)
    stmt = select(cast(Complaint.created_at, Date).label("day"), func.count(Complaint.id).label("total"), func.count(case((Complaint.status == "resolved", 1))).label("resolved")).join(District, District.id == Complaint.district_id).where(Complaint.created_at >= since, *( [district_filter] if district_filter is not None else [] )).group_by(cast(Complaint.created_at, Date)).order_by(cast(Complaint.created_at, Date))
    return [TrendPoint(day=r.day, total=r.total, resolved=r.resolved) for r in db.execute(stmt).all()]
