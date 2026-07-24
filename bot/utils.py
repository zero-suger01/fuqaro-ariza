import re

PHONE_RE = re.compile(r"^\+998\d{9}$")


def normalize_phone(raw: str) -> str | None:
    raw = raw.strip().replace(" ", "").replace("-", "")
    if not raw.startswith("+"):
        raw = "+" + raw
    return raw if PHONE_RE.match(raw) else None
