import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    citizen_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("citizens.id"), index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"), index=True)

    description: Mapped[str] = mapped_column(Text)

    status: Mapped[str] = mapped_column(String(20), default="new", index=True)
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    source: Mapped[str] = mapped_column(String(10), default="web")
    language: Mapped[str] = mapped_column(String(4), default="uz")

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    neighborhood_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("neighborhoods.id"), nullable=True, index=True
    )

    assigned_department_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("departments.id"), nullable=True, index=True
    )
    assigned_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False)

    ai_category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    rejected_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    citizen: Mapped["Citizen"] = relationship(back_populates="complaints")
    category: Mapped["Category"] = relationship(foreign_keys=[category_id])
    ai_category: Mapped["Category | None"] = relationship(foreign_keys=[ai_category_id])
    neighborhood: Mapped["Neighborhood | None"] = relationship()
    assigned_department: Mapped["Department | None"] = relationship(foreign_keys=[assigned_department_id])
    assigned_user: Mapped["User | None"] = relationship(foreign_keys=[assigned_user_id])

    files: Mapped[list["ComplaintFile"]] = relationship(back_populates="complaint", cascade="all, delete-orphan")
    events: Mapped[list["ComplaintEvent"]] = relationship(
        back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintEvent.created_at"
    )
    replies: Mapped[list["Reply"]] = relationship(back_populates="complaint", cascade="all, delete-orphan")
    ai_analyses: Mapped[list["AiAnalysis"]] = relationship(back_populates="complaint", cascade="all, delete-orphan")
