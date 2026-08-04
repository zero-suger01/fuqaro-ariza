import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DistrictDepartment(Base):
    __tablename__ = "district_departments"
    __table_args__ = (UniqueConstraint("district_id", "department_id", name="uq_district_department"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    district_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("districts.id"), index=True)
    department_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("departments.id"), index=True)
    phone: Mapped[str | None] = mapped_column(String(16), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    wip_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
