import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.public import CategoryBrief


class CitizenComplaintOut(BaseModel):
    id: uuid.UUID
    ticket_number: str
    status_simple: str
    category: CategoryBrief
    created_at: datetime
    deadline_at: datetime | None
