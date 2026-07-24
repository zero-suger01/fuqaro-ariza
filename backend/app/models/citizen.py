import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Citizen(Base):
    """A citizen who submitted at least one complaint. Password is optional —
    NULL means the person never opened a cabinet (guest submit only)."""

    __tablename__ = "citizens"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    phone: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    language: Mapped[str] = mapped_column(String(4), default="uz")
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    telegram_chat_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    complaints: Mapped[list["Complaint"]] = relationship(back_populates="citizen")

    @property
    def fullname(self) -> str:
        return f"{self.first_name or ''} {self.last_name or ''}".strip()
