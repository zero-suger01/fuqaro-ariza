import uuid
from datetime import date

from pydantic import BaseModel


class DistrictSummary(BaseModel):
    district_id: uuid.UUID
    code: str
    name: str
    parent_district_id: uuid.UUID | None = None
    total: int = 0
    open: int = 0
    resolved: int = 0
    overdue: int = 0


class ProvinceOverview(BaseModel):
    region_id: uuid.UUID | None
    region_name: str
    total: int = 0
    open: int = 0
    resolved: int = 0
    overdue: int = 0
    districts: list[DistrictSummary]


class TrendPoint(BaseModel):
    day: date
    total: int
    resolved: int


class NeighborhoodSummary(BaseModel):
    neighborhood_id: uuid.UUID
    name: str
    total: int = 0
    open: int = 0
    resolved: int = 0


class DistrictDetailSummary(BaseModel):
    district: DistrictSummary
    by_status: dict[str, int]
    neighborhoods: list[NeighborhoodSummary]
