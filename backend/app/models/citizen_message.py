import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CitizenMessage(Base):
    """Fuqarodan xodimga yo'nalish — `Reply` ning teskarisi.

    `need_info` sikli shu jadval orqali yopiladi ([03] §3.5). `source`
    fuqaro qaysi kanaldan javob berganini saqlaydi: `web` va `telegram`
    murojaatni avtomatik `in_progress` ga qaytaradi, `manual` esa xodim
    telefonda eshitganini yozib qo'ygani — statusni o'zgartirmaydi,
    chunki fuqaro rostdan javob berganini faqat xodim biladi.
    """

    __tablename__ = "citizen_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(10))
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    complaint: Mapped["Complaint"] = relationship(back_populates="citizen_messages")
    recorder: Mapped["User | None"] = relationship(foreign_keys=[recorded_by])
