import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ComplaintEvent(Base):
    """Timeline + audit trail for a single complaint (docs/03-kontraktlar.md §8)."""

    __tablename__ = "complaint_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(30))
    actor_type: Mapped[str] = mapped_column(String(10))
    actor_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    complaint: Mapped["Complaint"] = relationship(back_populates="events")
