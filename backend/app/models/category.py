import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Category(Base):
    """Complaint category — a table, not an enum, so admins can extend it."""

    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    names: Mapped[dict] = mapped_column(JSONB)
    # LLM promptiga uzatiladigan chegara izohi (M15). `names` bilan bir xil
    # ko'p tilli shakl; NULL bo'lsa prompt faqat nom bilan ishlaydi.
    descriptions: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sla_hours: Mapped[int] = mapped_column(Integer, default=72)
    department_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    department: Mapped["Department | None"] = relationship(back_populates="categories")

    def name(self, lang: str = "uz") -> str:
        return self.names.get(lang) or self.names.get("uz") or self.code

    def description(self, lang: str = "uz") -> str | None:
        """Chegara izohi — LLM katalogi uchun (docs/07 §1.1). Yo'q bo'lsa None."""
        if not self.descriptions:
            return None
        return self.descriptions.get(lang) or self.descriptions.get("uz")
