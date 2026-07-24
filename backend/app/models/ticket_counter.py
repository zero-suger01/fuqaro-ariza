from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TicketCounter(Base):
    """One row per year; `tickets.py` increments it with a row lock."""

    __tablename__ = "ticket_counters"

    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    last_value: Mapped[int] = mapped_column(Integer, default=0)
