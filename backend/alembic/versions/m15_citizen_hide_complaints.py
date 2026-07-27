"""M15 - citizen "Tozalash" (kabinet ro'yxatidan yashirish)

Fuqaro "Tozalash" tugmasini bosganda o'z murojaatlarini "Murojaatlarim"
ro'yxatidan olib tashlaydi. Bu SOFT-yashirish — yozuv, admin panel,
audit/SLA kuzatuvi butunlay saqlanib qoladi ([03]/[04] hisobdorlik
talabi); faqat fuqaroning shaxsiy ro'yxatida ko'rinmay qoladi
(`Complaint.hidden_by_citizen`).

Revision ID: m15_citizen_hide_complaints
Revises: m14_staff_avatar
Create Date: 2026-07-27 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'm15_citizen_hide_complaints'
down_revision = 'm14_staff_avatar'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'complaints',
        sa.Column('hidden_by_citizen', sa.Boolean(), nullable=False, server_default='false'),
    )


def downgrade() -> None:
    op.drop_column('complaints', 'hidden_by_citizen')
