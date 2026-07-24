from datetime import datetime, timedelta


def compute_deadline(created_at: datetime, sla_hours: int, priority: str) -> datetime:
    """docs/04-database.md deadline formula."""
    if priority == "critical":
        hours = min(sla_hours, 2)
    elif priority == "high":
        hours = sla_hours / 2
    else:
        hours = sla_hours
    return created_at + timedelta(hours=hours)
