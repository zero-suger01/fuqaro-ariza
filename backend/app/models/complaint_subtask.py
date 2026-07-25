import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ComplaintSubtask(Base):
    """Idoralararo topshiriq ([03] §5, [04] §2).

    Bitta murojaat bir necha bo'limga tegishli bo'lishi mumkin (yo'l
    buzilishi + drenaj + chiqindi). Har bo'lim o'z qismini bajaradi,
    lekin fuqaroga javob BITTA va umumiy bo'ladi — shuning uchun
    sub-tasklar `track` javobida ko'rinmaydi. Ota murojaat ochiq
    sub-task bilan `resolved` ga o'ta olmaydi.
    """

    __tablename__ = "complaint_subtasks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), index=True)
    department_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("departments.id"), index=True)
    assigned_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(10), default="open")
    note: Mapped[str] = mapped_column(Text)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # v1.5: NULL = AI yaratgan ([07] §1.1). `complaint_events.actor_id`
    # bilan bir xil naqsh — AI harakatida xodim bo'lmaydi.
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    complaint: Mapped["Complaint"] = relationship(back_populates="subtasks")
    department: Mapped["Department"] = relationship()
    assigned_user: Mapped["User | None"] = relationship(foreign_keys=[assigned_user_id])
    creator: Mapped["User | None"] = relationship(foreign_keys=[created_by])
