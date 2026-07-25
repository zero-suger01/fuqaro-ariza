"""M10 - AI yaratgan sub-tasklar (kontrakt v1.5)

`complaint_subtasks.created_by` NOT NULL -> NULL.

Sabab: ko'p bo'limli murojaatda («chiroq va suv to'xtab qoldi») idoralararo
topshiriqni endi **AI** yaratadi (`secondary_category_codes`, docs/07 §1.1),
va bunday yozuvda `users.id` ga yozadigan xodim yo'q. `NULL` = AI yaratgan.

Bu `complaint_events.actor_id` dagi mavjud naqshning aynan o'zi — AI
harakatlarida aktor id bo'lmaydi, `actor_type` esa `ai` bo'ladi.

DIQQAT (downgrade): ustunni qayta NOT NULL qilish uchun AI yaratgan
qatorlarni O'CHIRISH kerak — ular uchun to'g'ri `created_by` qiymati
mavjud emas va soxta xodim yozib qo'yish auditni buzadi. Ya'ni
`downgrade()` MA'LUMOT YO'QOTADI (faqat AI yaratgan sub-tasklar; admin
yaratganlari tegilmaydi).

Revision ID: m10_ai_subtasks
Revises: m9_ownership_and_info_loop
Create Date: 2026-07-25 19:15:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'm10_ai_subtasks'
down_revision = 'm9_ownership_and_info_loop'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        'complaint_subtasks',
        'created_by',
        existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
        nullable=True,
    )


def downgrade() -> None:
    # AI yaratgan topshiriqlar uchun `created_by` ni tiklab bo'lmaydi.
    op.execute("DELETE FROM complaint_subtasks WHERE created_by IS NULL")
    op.alter_column(
        'complaint_subtasks',
        'created_by',
        existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
        nullable=False,
    )
