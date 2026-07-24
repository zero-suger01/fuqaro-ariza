import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SttJob(Base):
    __tablename__ = "stt_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    status: Mapped[str] = mapped_column(String(10), default="pending")
    audio_url: Mapped[str] = mapped_column(String(1000))
    language: Mapped[str] = mapped_column(String(4), default="uz")
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ip: Mapped[str] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
