"""M14 - staff avatar (kontrakt v1.7)

Xodim profili funksiyasi uchun: `users.avatar_url` — S3/MinIO'dagi profil
rasmi URL'i (deterministik kalit `avatars/{user_id}.{ext}`, qayta yuklash
eskisini almashtiradi — orfan fayl qolmaydi, [04](../../../docs/04-database.md)
§2). Parolni tiklash kodi jadvalga tushmaydi (Redis'da vaqtinchalik).

Revision ID: m14_staff_avatar
Revises: m13_random_ticket_numbers
Create Date: 2026-07-26 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'm14_staff_avatar'
down_revision = 'm13_random_ticket_numbers'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'avatar_url')
