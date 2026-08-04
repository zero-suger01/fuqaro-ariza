import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_system_admin
from app.core.errors import AppError
from app.database import get_db
from app.models.district import District
from app.models.neighborhood import Neighborhood
from app.models.region import Region
from app.schemas.system import ActivePatch, DistrictIn, DistrictOut, NeighborhoodIn, NeighborhoodOut, RegionIn, RegionOut

router = APIRouter(prefix="/api/system", tags=["system-admin"], dependencies=[Depends(get_current_system_admin)])


def _district_out(d: District) -> DistrictOut:
    return DistrictOut(id=d.id, region_id=d.region_id, parent_district_id=d.parent_district_id, code=d.code, names=d.names or {}, is_active=d.is_active, neighborhoods=[NeighborhoodOut(id=n.id, district_id=n.district_id, name=n.name, is_active=n.is_active) for n in sorted(getattr(d, "neighborhoods", []), key=lambda x: x.name)])


@router.get("/regions", response_model=list[RegionOut])
def list_regions(db: Session = Depends(get_db)):
    return db.execute(select(Region).order_by(Region.code)).scalars().all()


@router.post("/regions", response_model=RegionOut, status_code=201)
def create_region(payload: RegionIn, db: Session = Depends(get_db)):
    region = Region(code=payload.code.upper(), names=payload.names)
    db.add(region)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError(409, "already_exists", "Bu viloyat kodi allaqachon mavjud")
    db.refresh(region)
    return region


@router.patch("/regions/{region_id}", response_model=RegionOut)
def toggle_region(region_id: uuid.UUID, payload: ActivePatch, db: Session = Depends(get_db)):
    region = db.get(Region, region_id)
    if region is None:
        raise AppError(404, "not_found", "Viloyat topilmadi")
    region.is_active = payload.is_active
    db.commit()
    db.refresh(region)
    return region


@router.get("/districts", response_model=list[DistrictOut])
def list_districts(region_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    stmt = select(District).order_by(District.code)
    if region_id:
        stmt = stmt.where(District.region_id == region_id)
    return db.execute(stmt).scalars().all()


@router.post("/districts", response_model=DistrictOut, status_code=201)
def create_district(payload: DistrictIn, db: Session = Depends(get_db)):
    if db.get(Region, payload.region_id) is None:
        raise AppError(404, "not_found", "Viloyat topilmadi")
    if payload.parent_district_id:
        parent = db.get(District, payload.parent_district_id)
        if parent is None or parent.region_id != payload.region_id:
            raise AppError(422, "validation_error", "Parent hudud shu viloyatga tegishli emas")
    district = District(region_id=payload.region_id, code=payload.code.upper(), names=payload.names, parent_district_id=payload.parent_district_id)
    db.add(district)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError(409, "already_exists", "Bu tuman kodi allaqachon mavjud")
    db.refresh(district)
    return district


@router.patch("/districts/{district_id}", response_model=DistrictOut)
def toggle_district(district_id: uuid.UUID, payload: ActivePatch, db: Session = Depends(get_db)):
    district = db.get(District, district_id)
    if district is None:
        raise AppError(404, "not_found", "Tuman topilmadi")
    district.is_active = payload.is_active
    db.commit()
    db.refresh(district)
    return district


@router.post("/neighborhoods", response_model=NeighborhoodOut, status_code=201)
def create_neighborhood(payload: NeighborhoodIn, db: Session = Depends(get_db)):
    if db.get(District, payload.district_id) is None:
        raise AppError(404, "not_found", "Tuman topilmadi")
    exists = db.execute(select(Neighborhood).where(Neighborhood.district_id == payload.district_id, Neighborhood.name == payload.name)).scalar_one_or_none()
    if exists:
        raise AppError(409, "already_exists", "Bu MFY allaqachon mavjud")
    neighborhood = Neighborhood(district_id=payload.district_id, name=payload.name)
    db.add(neighborhood)
    db.commit()
    db.refresh(neighborhood)
    return neighborhood


@router.patch("/neighborhoods/{neighborhood_id}", response_model=NeighborhoodOut)
def toggle_neighborhood(neighborhood_id: uuid.UUID, payload: ActivePatch, db: Session = Depends(get_db)):
    neighborhood = db.get(Neighborhood, neighborhood_id)
    if neighborhood is None:
        raise AppError(404, "not_found", "MFY topilmadi")
    neighborhood.is_active = payload.is_active
    db.commit()
    db.refresh(neighborhood)
    return neighborhood
