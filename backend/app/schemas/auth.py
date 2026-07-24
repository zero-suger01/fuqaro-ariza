import uuid

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=7, max_length=32)
    email: EmailStr | None = None
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    login: str  # phone or email
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    fullname: str
    phone: str
    email: str | None
    role: UserRole

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
