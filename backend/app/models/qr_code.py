import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QrCode(Base):
    __tablename__ = "qr_codes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    district_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("districts.id"), nullable=True, index=True)
    neighborhood_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("neighborhoods.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # M16/v1.7.2 — QR har bir tuman/MFY/ko'cha uchun noyob (mijoz so'ragan):
    # ushbu manzil bo'laklari fuqaro `/yangi`ga QR orqali kirganda 2-qadam
    # manzilini avtomatik to'ldirish uchun, plakat sarlavhasi uchun va
    # admin ro'yxatida ko'rsatish uchun saqlanadi. `contact_name` — shu
    # joy uchun mas'ul shaxs (masalan mahalla faoli), agar bo'lsa.
    district: Mapped[str | None] = mapped_column(String(150), nullable=True)
    mfy: Mapped[str | None] = mapped_column(String(150), nullable=True)
    street: Mapped[str | None] = mapped_column(String(150), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    scans: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    neighborhood: Mapped["Neighborhood | None"] = relationship()
