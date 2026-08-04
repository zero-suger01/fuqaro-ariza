"""Best-effort Expo push delivery for citizen mobile devices."""

import logging

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.citizen import Citizen
from app.models.push_token import PushToken

logger = logging.getLogger(__name__)
_EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push(db: Session, citizen: Citizen, message: str, complaint_id: str | None = None) -> bool:
    tokens = db.execute(select(PushToken).where(PushToken.citizen_id == citizen.id)).scalars().all()
    if not tokens:
        return False
    ok = True
    for token in tokens:
        try:
            response = httpx.post(_EXPO_PUSH_URL, json={"to": token.token, "title": "e-Murojaat", "body": message, "data": {"complaint_id": complaint_id}}, timeout=10)
            response.raise_for_status()
            if response.json().get("data", {}).get("status") == "error":
                ok = False
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Push yuborilmadi: %s", exc)
            ok = False
    return ok
