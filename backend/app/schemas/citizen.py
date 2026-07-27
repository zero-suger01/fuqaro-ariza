import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.public import CategoryBrief, DepartmentPublic


class AssignedStaffPublic(BaseModel):
    """Murojaatni shaxsan olib borayotgan xodim (`Complaint.assigned_user`,
    `users` jadvali) — faqat xodim murojaatni "qabul qildim" deb belgilagach
    (`claim()`) to'ldiriladi, shu vaqtgacha `None`."""

    name: str
    phone: str


class CitizenComplaintOut(BaseModel):
    id: uuid.UUID
    ticket_number: str
    status_simple: str
    category: CategoryBrief
    department: DepartmentPublic | None
    assigned_staff: AssignedStaffPublic | None
    # Fuqaro yozgan matn; ovozli murojaatda bo'sh bo'lsa `ComplaintFile.transcript`
    # bilan to'ldiriladi (kabinet ro'yxatida ovozni ijro etib bo'lmaydi, faqat
    # matn ko'rsatiladi — app/routers/citizen.py).
    description: str
    created_at: datetime
    deadline_at: datetime | None
