import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.complaint import Complaint, ComplaintCategory, ComplaintStatus
from app.models.image import ComplaintImage
from app.models.user import User, UserRole
from app.schemas.complaint import ComplaintOut
from app.services.ai.classifier import analyze
from app.services.storage import upload_image

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


@router.post("", response_model=ComplaintOut, status_code=201)
def create_complaint(
    description: str = Form(..., min_length=20, max_length=5000),
    category: ComplaintCategory | None = Form(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    address: str | None = Form(None),
    district: str | None = Form(None),
    neighborhood: str | None = Form(None),
    images: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ai_result = analyze(description)
    final_category = category or ai_result.category

    complaint = Complaint(
        user_id=current_user.id,
        description=description,
        category=final_category,
        ai_category=ai_result.category,
        confidence=ai_result.confidence,
        latitude=latitude,
        longitude=longitude,
        address=address,
        district=district,
        neighborhood=neighborhood,
        status=ComplaintStatus.YANGI,
    )
    db.add(complaint)
    db.flush()

    for image in images:
        if not image.filename:
            continue
        url = upload_image(image)
        db.add(ComplaintImage(complaint_id=complaint.id, image_url=url))

    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("/me", response_model=list[ComplaintOut])
def my_complaints(
    status: ComplaintStatus | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Complaint).filter(Complaint.user_id == current_user.id)
    if status:
        query = query.filter(Complaint.status == status)
    return query.order_by(Complaint.created_at.desc()).all()


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(
    complaint_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")
    if complaint.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan")
    return complaint
