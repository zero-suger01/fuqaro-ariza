import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Reply(Base):
    __tablename__ = "replies"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), index=True)
    ai_draft: Mapped[str | None] = mapped_column(Text, nullable=True)
    text: Mapped[str] = mapped_column(Text)
    sent_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    channels: Mapped[list] = mapped_column(JSONB, default=list)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    complaint: Mapped["Complaint"] = relationship(back_populates="replies")
