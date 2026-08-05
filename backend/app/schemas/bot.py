import uuid

from pydantic import BaseModel, Field

from app.schemas.public import PHONE_PATTERN


class CitizenLinkIn(BaseModel):
    phone: str = Field(pattern=PHONE_PATTERN)
    telegram_chat_id: int
    first_name: str = Field(min_length=1, max_length=100)
    language: str = "uz"


class CitizenLinkOut(BaseModel):
    id: uuid.UUID
    phone: str
    language: str


class BotComplaintListItem(BaseModel):
    ticket_number: str
    status_simple: str
    # v1.4 — bot ro'yxatdan turib «Javob yozish» / «Hal bo'ldimi?»
    # tugmalarini ko'rsatishi uchun ([03] §6, docs/08 T2.2–T2.3).
    need_info: bool = False
    info_request_text: str | None = None
    can_give_feedback: bool = False


class BotCitizenInfoOut(BaseModel):
    status_simple: str
    accepted: bool


class BotFeedbackIn(BaseModel):
    telegram_chat_id: int
    ticket: str
    satisfied: bool
    comment: str | None = Field(default=None, max_length=2000)


class BotFeedbackOut(BaseModel):
    status_simple: str
    reopened: bool
