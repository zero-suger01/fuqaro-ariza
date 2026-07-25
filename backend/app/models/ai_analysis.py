import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AiAnalysis(Base):
    """Every classifier run (keyword or llm) — kept for comparison and KPIs."""

    __tablename__ = "ai_analyses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), index=True)
    engine: Mapped[str] = mapped_column(String(10))
    suggested_category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    # R0/M7 — faqat engine=keyword yozuvlarida: threshold+margin qarori.
    # O'rganish sikli (learning.py) "keyword ojiz qolgan" murojaatlarni shu
    # belgi orqali topadi; llm yozuvlarida va eski yozuvlarda NULL.
    confident: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    priority: Mapped[str | None] = mapped_column(String(10), nullable=True)
    sentiment: Mapped[str | None] = mapped_column(String(10), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    model: Mapped[str | None] = mapped_column(String(60), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    complaint: Mapped["Complaint"] = relationship(back_populates="ai_analyses")
    suggested_category: Mapped["Category | None"] = relationship()
