from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import STATUS_SIMPLE_MAP
from app.core.deps import get_current_citizen
from app.database import get_db
from app.models.citizen import Citizen
from app.models.complaint import Complaint
from app.schemas.citizen import AssignedStaffPublic, CitizenComplaintOut
from app.schemas.public import CategoryBrief, DepartmentPublic

router = APIRouter(prefix="/api/citizen", tags=["citizen"])


def _description_or_transcript(c: Complaint) -> str:
    """Kabinet ro'yxatida ovozli fayl ijro etilmaydi (faqat matn) — yozma
    matn bo'lmasa (faqat ovozli murojaat), transkriptsiya bilan almashtiramiz."""
    if c.description.strip():
        return c.description
    transcripts = [f.transcript for f in c.files if f.kind == "audio" and f.transcript]
    return " ".join(transcripts)


@router.get("/complaints", response_model=list[CitizenComplaintOut])
def my_complaints(db: Session = Depends(get_db), citizen: Citizen = Depends(get_current_citizen)):
    rows = db.execute(
        select(Complaint)
        .where(Complaint.citizen_id == citizen.id, Complaint.hidden_by_citizen.is_(False))
        .order_by(Complaint.created_at.desc())
    ).scalars().all()
    return [
        CitizenComplaintOut(
            id=c.id,
            ticket_number=c.ticket_number,
            status_simple=STATUS_SIMPLE_MAP[c.status],
            category=CategoryBrief(code=c.category.code, name=c.category.name(citizen.language)),
            department=(
                DepartmentPublic(code=c.assigned_department.code, name=c.assigned_department.name(citizen.language))
                if c.assigned_department
                else None
            ),
            assigned_staff=(
                AssignedStaffPublic(
                    name=f"{c.assigned_user.first_name} {c.assigned_user.last_name}".strip(),
                    phone=c.assigned_user.phone,
                )
                if c.assigned_user
                else None
            ),
            description=_description_or_transcript(c),
            created_at=c.created_at,
            deadline_at=c.deadline_at,
        )
        for c in rows
    ]


@router.delete("/complaints", status_code=status.HTTP_204_NO_CONTENT)
def clear_my_complaints(db: Session = Depends(get_db), citizen: Citizen = Depends(get_current_citizen)):
    """"Tozalash" (mijoz so'ragan) — fuqaroning "Murojaatlarim" ro'yxatini
    bo'shatadi. Yozuvlar bazada, admin panelda va SLA/audit kuzatuvida
    to'liq saqlanadi (docs/03/04 hisobdorlik talabi) — faqat shu fuqaro
    uchun ro'yxatdan yashiriladi (`hidden_by_citizen`), qaytarib bo'lmaydi."""
    db.execute(
        Complaint.__table__.update()
        .where(Complaint.citizen_id == citizen.id)
        .values(hidden_by_citizen=True)
    )
    db.commit()
