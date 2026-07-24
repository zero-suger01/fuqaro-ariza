from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings

settings = get_settings()


def next_ticket_number(db: Session) -> str:
    """Row-locked per-year counter (docs/04-database.md ticket_counters).
    `INSERT ... ON CONFLICT DO NOTHING` then `UPDATE ... RETURNING` is
    race-safe under concurrent submits without a separate SELECT FOR UPDATE.
    """
    year = datetime.now(timezone.utc).year
    db.execute(
        text("INSERT INTO ticket_counters (year, last_value) VALUES (:year, 0) ON CONFLICT (year) DO NOTHING"),
        {"year": year},
    )
    last_value = db.execute(
        text("UPDATE ticket_counters SET last_value = last_value + 1 WHERE year = :year RETURNING last_value"),
        {"year": year},
    ).scalar_one()
    return f"{settings.ticket_prefix}-{year}-{last_value:06d}"
