import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ComplaintFile(Base):
    __tablename__ = "complaint_files"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(10))
    url: Mapped[str] = mapped_column(String(1000))
    mime: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    duration_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # kind="audio" only — filled in by worker.py::transcribe_complaint_audio
    # after intake, so staff can read a voice message without playing it.
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    complaint: Mapped["Complaint"] = relationship(back_populates="files")
