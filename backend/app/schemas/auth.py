import uuid

from pydantic import BaseModel, Field

from app.schemas.public import PHONE_PATTERN


class RegisterRequest(BaseModel):
    """Citizen cabinet registration (docs/03-kontraktlar.md §4). Staff accounts
    are created by an admin only, never through this endpoint."""

    first_name: str = Field(min_length=1, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    phone: str = Field(pattern=PHONE_PATTERN)
    password: str = Field(min_length=6, max_length=128)
    language: str = "uz"


class LoginRequest(BaseModel):
    login: str  # phone (citizen or staff) or email (staff)
    password: str


class MeOut(BaseModel):
    kind: str  # "citizen" | "staff"
    id: uuid.UUID
    first_name: str | None
    last_name: str | None
    fullname: str
    phone: str
    email: str | None = None
    role: str | None = None
    department_id: uuid.UUID | None = None
    department_name: str | None = None
    # v1.4: seed'dan yaratilgan xodim standart parol bilan ishlab
    # ketmasligi uchun — `true` bo'lsa FE parol almashtirish sahifasiga
    # majburan yo'naltiradi ([04] §2 users).
    must_change_password: bool = False

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: MeOut


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)
