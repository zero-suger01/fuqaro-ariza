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
