"""R0/Q4 lifecycle avtomatlari (docs/03-kontraktlar.md §2.1):

- `resolved` + 7 kun sukut -> `closed` (fuqaro e'tiroz bildirmadi deb yopiladi;
  status SMS shabloni workflow.change_status ichida yuboriladi).
- `closed` + 30 kun -> `archived` (SMS yo'q — archived xabar shablonida emas).

Ikkalasi ham workflow.change_status orqali — event/bildirishnoma yon effektlari
va o'tish qoidalari chetlab o'tilmaydi. Kunlik cron (worker.lifecycle_job).
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import STATUS_ARCHIVED, STATUS_CLOSED, STATUS_RESOLVED
from app.models.complaint import Complaint
from app.services import workflow

AUTO_CLOSE_AFTER = timedelta(days=7)
AUTO_ARCHIVE_AFTER = timedelta(days=30)


def auto_close_resolved(db: Session) -> int:
    cutoff = datetime.now(timezone.utc) - AUTO_CLOSE_AFTER
    rows = (
        db.execute(
            select(Complaint).where(
                Complaint.status == STATUS_RESOLVED,
                Complaint.resolved_at.isnot(None),
                Complaint.resolved_at < cutoff,
            )
        )
        .scalars()
        .all()
    )
    for complaint in rows:
        workflow.change_status(db, complaint, STATUS_CLOSED, actor_type="system")
    db.commit()
    return len(rows)


def auto_archive_closed(db: Session) -> int:
    # closed_at alohida saqlanmaydi — oxirgi o'zgarish vaqti (updated_at)
    # yetarli yaqinlashuv: closed holatdagi yozuvga boshqa hech kim tegmaydi.
    cutoff = datetime.now(timezone.utc) - AUTO_ARCHIVE_AFTER
    rows = (
        db.execute(
            select(Complaint).where(
                Complaint.status == STATUS_CLOSED,
                Complaint.updated_at < cutoff,
            )
        )
        .scalars()
        .all()
    )
    for complaint in rows:
        workflow.change_status(db, complaint, STATUS_ARCHIVED, actor_type="system")
    db.commit()
    return len(rows)
