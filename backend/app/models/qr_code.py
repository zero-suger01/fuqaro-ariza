import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QrCode(Base):
    __tablename__ = "qr_codes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    neighborhood_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("neighborhoods.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    scans: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    neighborhood: Mapped["Neighborhood | None"] = relationship()
