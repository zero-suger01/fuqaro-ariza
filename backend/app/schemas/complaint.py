import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.complaint import ComplaintCategory, ComplaintStatus


class ComplaintCreate(BaseModel):
    description: str = Field(min_length=20, max_length=5000)
    category: ComplaintCategory | None = None
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
    district: str | None = None
    neighborhood: str | None = None
    image_ids: list[uuid.UUID] = Field(default_factory=list)


class ImageOut(BaseModel):
    id: uuid.UUID
    image_url: str

    class Config:
        from_attributes = True


class CommentOut(BaseModel):
    id: uuid.UUID
    admin_id: uuid.UUID
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True


class OrganizationOut(BaseModel):
    id: uuid.UUID
    name: str
    category: str

    class Config:
        from_attributes = True


class ComplaintOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str | None
    description: str
    category: ComplaintCategory
    ai_category: ComplaintCategory | None
    confidence: float | None
    latitude: float | None
    longitude: float | None
    address: str | None
    district: str | None
    neighborhood: str | None
    status: ComplaintStatus
    organization: OrganizationOut | None
    images: list[ImageOut]
    comments: list[CommentOut] = []
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None

    class Config:
        from_attributes = True


class ComplaintListItem(BaseModel):
    id: uuid.UUID
    description: str
    category: ComplaintCategory
    status: ComplaintStatus
    district: str | None
    neighborhood: str | None
    created_at: datetime
    thumbnail_url: str | None = None

    class Config:
        from_attributes = True


class StatusUpdateRequest(BaseModel):
    status: ComplaintStatus


class OrgAssignRequest(BaseModel):
    organization_id: uuid.UUID


class CommentCreate(BaseModel):
    comment: str = Field(min_length=1, max_length=2000)


class AIAnalyzeRequest(BaseModel):
    description: str = Field(min_length=1, max_length=5000)
    image_ids: list[uuid.UUID] = Field(default_factory=list)


class AIAnalyzeResponse(BaseModel):
    category: ComplaintCategory
    confidence: float
    recommended_organizations: list[str]
