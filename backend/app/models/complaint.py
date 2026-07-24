import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ComplaintCategory(str, enum.Enum):
    CHIQINDI = "chiqindi"
    YOL = "yol"
    ELEKTR = "elektr"
    GAZ = "gaz"
    SUV = "suv"
    DARAXT = "daraxt"
    EKOLOGIYA = "ekologiya"
    QURILISH = "qurilish"
    OBODONLASHTIRISH = "obodonlashtirish"
    BOSHQA = "boshqa"


class ComplaintStatus(str, enum.Enum):
    YANGI = "yangi"
    KORIB_CHIQILMOQDA = "korib_chiqilmoqda"
    MASUL_TASHKILOTGA_YUBORILDI = "masul_tashkilotga_yuborildi"
    JARAYONDA = "jarayonda"
    HAL_QILINDI = "hal_qilindi"
    RAD_ETILDI = "rad_etildi"


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("organizations.id"), nullable=True, index=True
    )

    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text)

    category: Mapped[ComplaintCategory] = mapped_column(Enum(ComplaintCategory))
    ai_category: Mapped[ComplaintCategory | None] = mapped_column(Enum(ComplaintCategory), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    district: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    neighborhood: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)

    status: Mapped[ComplaintStatus] = mapped_column(Enum(ComplaintStatus), default=ComplaintStatus.YANGI, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="complaints")
    organization: Mapped["Organization | None"] = relationship(back_populates="complaints")
    images: Mapped[list["ComplaintImage"]] = relationship(back_populates="complaint", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship(back_populates="complaint", cascade="all, delete-orphan")
