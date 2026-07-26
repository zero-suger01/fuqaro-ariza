import secrets

from sqlalchemy import text
from sqlalchemy.orm import Session

_MAX_ATTEMPTS = 20


def next_ticket_number(db: Session) -> str:
    """8-digit ticket: '85' fixed prefix + 6 random digits (client
    requirement — replaces the old sequential UY-YYYY-NNNNNN scheme, which
    was also an enumeration risk now that /track looks up by ticket alone
    with no phone check).

    `secrets.randbelow` (not `random`) since this is now the sole public
    identifier for a citizen's complaint. Checked against `complaints` for
    uniqueness before use — 1e6 possible suffixes makes collisions rare at
    realistic volumes, but never assume; retry on collision instead of
    trusting non-collision.
    """
    for _ in range(_MAX_ATTEMPTS):
        candidate = f"85{secrets.randbelow(1_000_000):06d}"
        exists = db.execute(
            text("SELECT 1 FROM complaints WHERE ticket_number = :t"), {"t": candidate}
        ).scalar_one_or_none()
        if exists is None:
            return candidate
    raise RuntimeError("Ticket raqami generatsiya qilib bo'lmadi — takroriy urinishlar tugadi")
