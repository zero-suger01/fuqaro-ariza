"""Audit log middleware (B4.5, docs/03-kontraktlar.md §5 — `GET
/api/admin/audit-logs`, admin-only). Har bir muvaffaqiyatli admin
mutatsiyasi (`POST`/`PATCH`/`PUT`/`DELETE` `/api/admin/*`) avtomatik
yoziladi — endpointlarning har biriga alohida audit chaqiruvi qo'shish
shart emas, shu bilan kelajakda yangi admin endpoint qo'shilsa ham
unutilmaydi.

`entity`/`entity_id`/`action` URL yo'lidan chiqariladi:
- yo'lda oxirgi UUID segment topilsa: `entity_id` = o'sha, `entity` = undan
  oldingi segment, `action` = undan keyingi segment bo'lsa o'sha
  (`status`, `assign`, `replies`, `approve`, `reject`, `keywords`...),
  aks holda HTTP metodidan (`update`/`delete`).
- UUID umuman bo'lmasa (resurs yaratish, masalan `POST /departments`):
  `entity` = birinchi segment, `entity_id` esa javob tanasidagi `id`
  maydonidan olinadi (topilmasa yozuv o'tkazib yuboriladi — `entity_id`
  DB'da NOT NULL).

Xato (4xx/5xx) javoblar yozilmaydi — audit faqat haqiqatan sodir bo'lgan
o'zgarishlarni aks ettiradi.
"""
import json
import uuid

from starlette.requests import Request
from starlette.responses import Response

from app.core.security import decode_access_token
from app.database import SessionLocal
from app.models.audit_log import AuditLog

_MUTATION_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
_METHOD_ACTION = {"POST": "create", "PATCH": "update", "PUT": "update", "DELETE": "delete"}


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def _resolve_entity(method: str, segments: list[str], response_body: bytes) -> tuple[str, str, str] | None:
    uuid_indices = [i for i, seg in enumerate(segments) if _is_uuid(seg)]

    if uuid_indices:
        last = uuid_indices[-1]
        entity_id = segments[last]
        entity = segments[last - 1] if last > 0 else segments[0]
        tail = segments[last + 1 :]
        action = tail[0] if tail else _METHOD_ACTION.get(method, method.lower())
        return entity, entity_id, action

    entity = segments[0] if segments else "unknown"
    try:
        body = json.loads(response_body) if response_body else {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        body = {}
    entity_id = body.get("id") if isinstance(body, dict) else None
    if not entity_id or not _is_uuid(str(entity_id)):
        return None
    return entity, str(entity_id), _METHOD_ACTION.get(method, method.lower())


async def audit_log_middleware(request: Request, call_next):
    path = request.url.path
    if request.method not in _MUTATION_METHODS or not path.startswith("/api/admin"):
        return await call_next(request)

    # Starlette caches the body internally — reading it here doesn't stop
    # the endpoint's own Depends(...) from reading it again later.
    try:
        request_body = await request.body()
    except Exception:  # noqa: BLE001 - body read is best-effort for meta
        request_body = b""

    response = await call_next(request)

    if response.status_code >= 400:
        return response

    response_body = b""
    async for chunk in response.body_iterator:
        response_body += chunk
    new_response = Response(
        content=response_body,
        status_code=response.status_code,
        headers=dict(response.headers),
        media_type=response.media_type,
    )

    segments = [s for s in path.removeprefix("/api/admin").split("/") if s]
    resolved = _resolve_entity(request.method, segments, response_body)
    if resolved is None:
        return new_response

    entity, entity_id, action = resolved

    payload = decode_access_token(request.headers.get("authorization", "").removeprefix("Bearer ").strip())
    if payload is None or payload.get("kind") != "staff":
        return new_response

    try:
        meta = json.loads(request_body) if request_body else None
    except (json.JSONDecodeError, UnicodeDecodeError):
        meta = None

    db = SessionLocal()
    try:
        db.add(
            AuditLog(
                user_id=uuid.UUID(payload["sub"]),
                action=action,
                entity=entity,
                entity_id=uuid.UUID(entity_id),
                meta=meta,
                ip=request.client.host if request.client else None,
            )
        )
        db.commit()
    finally:
        db.close()

    return new_response
