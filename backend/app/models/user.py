import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """Staff account. Citizens live in the `citizens` table instead."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(24), default="department_staff")
    region_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("regions.id"), nullable=True, index=True)
    district_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("districts.id"), nullable=True, index=True)
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("departments.id"), nullable=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # M9/v1.4: seed'dan yaratilgan admin standart parol bilan qolib
    # ketmasligi uchun — login javobida qaytadi, FE majburan parol
    # almashtirish sahifasiga yo'naltiradi ([04] §2 users).
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    # v1.7: profil rasmi (S3/MinIO) — [04] §2.
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    department: Mapped["Department | None"] = relationship(foreign_keys=[department_id])
    district: Mapped["District | None"] = relationship(foreign_keys=[district_id])

    @property
    def fullname(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
