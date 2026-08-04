import uuid

from pydantic import BaseModel, ConfigDict, Field


class RegionIn(BaseModel):
    code: str = Field(min_length=2, max_length=50)
    names: dict[str, str] = Field(min_length=1)


class DistrictIn(BaseModel):
    region_id: uuid.UUID
    code: str = Field(min_length=2, max_length=50)
    names: dict[str, str] = Field(min_length=1)
    parent_district_id: uuid.UUID | None = None


class NeighborhoodIn(BaseModel):
    district_id: uuid.UUID
    name: str = Field(min_length=2, max_length=150)


class ActivePatch(BaseModel):
    is_active: bool


class RegionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    names: dict
    is_active: bool


class NeighborhoodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    district_id: uuid.UUID
    name: str
    is_active: bool


class DistrictOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    region_id: uuid.UUID
    parent_district_id: uuid.UUID | None
    code: str
    names: dict
    is_active: bool
    neighborhoods: list[NeighborhoodOut]
