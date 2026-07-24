import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    citizen_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("citizens.id"), nullable=True, index=True)
    complaint_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("complaints.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(10), default="in_app")
    status: Mapped[str] = mapped_column(String(10), default="sent")
    message: Mapped[str] = mapped_column(String(1000))
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User | None"] = relationship()
    citizen: Mapped["Citizen | None"] = relationship()
