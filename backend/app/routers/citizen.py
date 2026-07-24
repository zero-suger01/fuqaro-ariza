from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import STATUS_SIMPLE_MAP
from app.core.deps import get_current_citizen
from app.database import get_db
from app.models.citizen import Citizen
from app.models.complaint import Complaint
from app.schemas.citizen import CitizenComplaintOut
from app.schemas.public import CategoryBrief

router = APIRouter(prefix="/api/citizen", tags=["citizen"])


@router.get("/complaints", response_model=list[CitizenComplaintOut])
def my_complaints(db: Session = Depends(get_db), citizen: Citizen = Depends(get_current_citizen)):
    rows = db.execute(
        select(Complaint).where(Complaint.citizen_id == citizen.id).order_by(Complaint.created_at.desc())
    ).scalars().all()
    return [
        CitizenComplaintOut(
            id=c.id,
            ticket_number=c.ticket_number,
            status_simple=STATUS_SIMPLE_MAP[c.status],
            category=CategoryBrief(code=c.category.code, name=c.category.name(citizen.language)),
            created_at=c.created_at,
            deadline_at=c.deadline_at,
        )
        for c in rows
    ]
