"""M17 - qr_codes: district/mfy/street/contact_name (kontrakt v1.7.2)

QR har bir tuman/MFY/ko'cha uchun noyob bo'lishi kerak (mijoz so'ragan) —
bu maydonlar fuqaro QR orqali kirganda manzilni avtomatik to'ldirish,
plakat sarlavhasi va admin ro'yxati uchun.

Revision ID: m17_qr_address_fields
Revises: m16_category_descriptions
Create Date: 2026-07-27 14:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'm17_qr_address_fields'
down_revision = 'm16_category_descriptions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('qr_codes', sa.Column('district', sa.String(length=150), nullable=True))
    op.add_column('qr_codes', sa.Column('mfy', sa.String(length=150), nullable=True))
    op.add_column('qr_codes', sa.Column('street', sa.String(length=150), nullable=True))
    op.add_column('qr_codes', sa.Column('contact_name', sa.String(length=150), nullable=True))


def downgrade() -> None:
    op.drop_column('qr_codes', 'contact_name')
    op.drop_column('qr_codes', 'street')
    op.drop_column('qr_codes', 'mfy')
    op.drop_column('qr_codes', 'district')
