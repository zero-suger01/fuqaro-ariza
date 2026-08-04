import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class District(Base):
    __tablename__ = "districts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    region_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("regions.id"), index=True)
    parent_district_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("districts.id"), nullable=True, index=True)
    code: Mapped[str] = mapped_column(String(50))
    names: Mapped[dict] = mapped_column(JSONB, default=dict)
    support_phone: Mapped[str | None] = mapped_column(String(16), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    neighborhoods: Mapped[list["Neighborhood"]] = relationship(
        foreign_keys="Neighborhood.district_id", viewonly=True
    )
