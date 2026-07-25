import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import oauth2_scheme
from app.core.errors import AppError
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.database import get_db
from app.models.citizen import Citizen
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, MeOut, RegisterRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _citizen_me(citizen: Citizen) -> MeOut:
    return MeOut(
        kind="citizen",
        id=citizen.id,
        first_name=citizen.first_name,
        last_name=citizen.last_name,
        fullname=citizen.fullname,
        phone=citizen.phone,
    )


def _staff_me(user: User) -> MeOut:
    return MeOut(
        kind="staff",
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        fullname=user.fullname,
        phone=user.phone,
        email=user.email,
        role=user.role,
        department_id=user.department_id,
        department_name=user.department.name("uz") if user.department else None,
        must_change_password=user.must_change_password,
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Citizen cabinet registration — staff accounts are admin-created only."""
    existing = db.execute(select(Citizen).where(Citizen.phone == payload.phone)).scalar_one_or_none()
    if existing and existing.password_hash:
        raise AppError(400, "already_exists", "Bu telefon raqami bilan kabinet allaqachon ochilgan")

    if existing is None:
        citizen = Citizen(
            phone=payload.phone,
            first_name=payload.first_name,
            last_name=payload.last_name,
            language=payload.language,
            password_hash=hash_password(payload.password),
        )
        db.add(citizen)
    else:
        citizen = existing
        citizen.first_name = payload.first_name
        citizen.last_name = payload.last_name
        citizen.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(citizen)

    token = create_access_token(str(citizen.id), extra_claims={"kind": "citizen"})
    return TokenResponse(access_token=token, user=_citizen_me(citizen))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    staff = db.execute(select(User).where((User.phone == payload.login) | (User.email == payload.login))).scalar_one_or_none()
    if staff is not None and staff.is_active and verify_password(payload.password, staff.password_hash):
        token = create_access_token(str(staff.id), extra_claims={"kind": "staff"})
        return TokenResponse(access_token=token, user=_staff_me(staff))

    citizen = db.execute(select(Citizen).where(Citizen.phone == payload.login)).scalar_one_or_none()
    if citizen is not None and citizen.password_hash and verify_password(payload.password, citizen.password_hash):
        token = create_access_token(str(citizen.id), extra_claims={"kind": "citizen"})
        return TokenResponse(access_token=token, user=_citizen_me(citizen))

    raise AppError(401, "unauthorized", "Login yoki parol noto'g'ri")


@router.post("/change-password", response_model=MeOut)
def change_password(
    payload: ChangePasswordRequest,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """v1.4 — `must_change_password` bayrog'ini yopishning yagona yo'li.

    Seed'dan yaratilgan admin birinchi kirishda majburan shu yerdan
    o'tadi: aks holda standart parolli hisob production'da ishlab
    ketaverardi."""
    claims = decode_access_token(token) if token else None
    if claims is None or claims.get("kind") != "staff":
        raise AppError(401, "unauthorized", "Tizimga kirish talab qilinadi")

    user = db.get(User, uuid.UUID(claims["sub"]))
    if user is None or not user.is_active:
        raise AppError(401, "unauthorized", "Tizimga kirish talab qilinadi")
    if not verify_password(payload.current_password, user.password_hash):
        raise AppError(400, "validation_error", "Joriy parol noto'g'ri")
    if verify_password(payload.new_password, user.password_hash):
        raise AppError(400, "validation_error", "Yangi parol eskisidan farq qilishi kerak")

    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = False
    db.commit()
    db.refresh(user)
    return _staff_me(user)


@router.get("/me", response_model=MeOut)
def me(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token) if token else None
    if payload is None:
        raise AppError(401, "unauthorized", "Tizimga kirish talab qilinadi")

    if payload.get("kind") == "staff":
        user = db.get(User, uuid.UUID(payload["sub"]))
        if user is not None and user.is_active:
            return _staff_me(user)
    elif payload.get("kind") == "citizen":
        citizen = db.get(Citizen, uuid.UUID(payload["sub"]))
        if citizen is not None:
            return _citizen_me(citizen)

    raise AppError(401, "unauthorized", "Tizimga kirish talab qilinadi")
