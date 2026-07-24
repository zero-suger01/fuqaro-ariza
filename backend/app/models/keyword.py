import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, SmallInteger, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CategoryKeyword(Base):
    """Classifier dictionary entry — lives in the DB so it can grow without a
    deploy (seed/admin/auto, see docs/07-ai-layer.md §5)."""

    __tablename__ = "category_keywords"
    __table_args__ = (UniqueConstraint("category_id", "keyword_norm", name="uq_category_keyword"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), index=True)
    keyword_norm: Mapped[str] = mapped_column(String(120), index=True)
    weight: Mapped[int] = mapped_column(SmallInteger, default=1)
    source: Mapped[str] = mapped_column(String(10), default="seed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    category: Mapped["Category"] = relationship(back_populates="keywords")
