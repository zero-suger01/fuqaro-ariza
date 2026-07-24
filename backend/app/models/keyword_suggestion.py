import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class KeywordSuggestion(Base):
    """Learning-loop inbox: candidate keywords mined from LLM-resolved
    complaints (docs/07-ai-layer.md §5)."""

    __tablename__ = "keyword_suggestions"
    __table_args__ = (UniqueConstraint("phrase_norm", "suggested_category_id", name="uq_keyword_suggestion"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    phrase_norm: Mapped[str] = mapped_column(String(120))
    suggested_category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    occurrences: Mapped[int] = mapped_column(Integer, default=1)
    sample_complaint_ids: Mapped[list] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(String(10), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    suggested_category: Mapped["Category | None"] = relationship()
