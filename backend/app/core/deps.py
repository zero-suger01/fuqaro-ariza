import uuid

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import decode_access_token
from app.database import get_db
from app.models.citizen import Citizen
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _unauthorized() -> AppError:
    return AppError(401, "unauthorized", "Tizimga kirish talab qilinadi")


def get_current_staff(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(token) if token else None
    if payload is None or payload.get("kind") != "staff":
        raise _unauthorized()
    user = db.get(User, uuid.UUID(payload["sub"]))
    if user is None or not user.is_active:
        raise _unauthorized()
    return user


def get_current_citizen(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Citizen:
    payload = decode_access_token(token) if token else None
    if payload is None or payload.get("kind") != "citizen":
        raise _unauthorized()
    citizen = db.get(Citizen, uuid.UUID(payload["sub"]))
    if citizen is None:
        raise _unauthorized()
    return citizen


def require_roles(*roles: str):
    """RBAC dependency factory (docs/03-kontraktlar.md §5 matrix)."""

    def _dep(user: User = Depends(get_current_staff)) -> User:
        if user.role not in roles:
            raise AppError(403, "forbidden", "Bu amal uchun huquqingiz yetarli emas")
        return user

    return _dep


get_current_admin = require_roles("admin")
get_current_operator_up = require_roles("operator", "employee", "manager", "admin")
get_current_employee_up = require_roles("employee", "manager", "admin")
get_current_manager_up = require_roles("manager", "admin")
