import uuid

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Neighborhood(Base):
    __tablename__ = "neighborhoods"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
