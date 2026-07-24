"""M3 - complaints: new columns + backfill from old enum columns

Revision ID: m3_complaints_columns
Revises: m2_data_migration
Create Date: 2026-07-24 13:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

from app.config import get_settings

revision = 'm3_complaints_columns'
down_revision = 'm2_data_migration'
branch_labels = None
depends_on = None

STATUS_MAP = {
    "YANGI": "new",
    "KORIB_CHIQILMOQDA": "ai_processed",
    "MASUL_TASHKILOTGA_YUBORILDI": "assigned",
    "JARAYONDA": "in_progress",
    "HAL_QILINDI": "resolved",
    "RAD_ETILDI": "rejected",
}


def upgrade() -> None:
    conn = op.get_bind()
    settings = get_settings()

    op.add_column('complaints', sa.Column('ticket_number', sa.String(length=20), nullable=True))
    op.add_column('complaints', sa.Column('citizen_id', sa.Uuid(), nullable=True))
    op.add_column('complaints', sa.Column('category_id', sa.Uuid(), nullable=True))
    op.add_column('complaints', sa.Column('priority', sa.String(length=10), nullable=False, server_default='medium'))
    op.add_column('complaints', sa.Column('source', sa.String(length=10), nullable=False, server_default='web'))
    op.add_column('complaints', sa.Column('language', sa.String(length=4), nullable=False, server_default='uz'))
    op.add_column('complaints', sa.Column('neighborhood_id', sa.Uuid(), nullable=True))
    op.add_column('complaints', sa.Column('assigned_department_id', sa.Uuid(), nullable=True))
    op.add_column('complaints', sa.Column('assigned_user_id', sa.Uuid(), nullable=True))
    op.add_column('complaints', sa.Column('deadline_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('complaints', sa.Column('needs_review', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('complaints', sa.Column('ai_category_id', sa.Uuid(), nullable=True))
    op.add_column('complaints', sa.Column('ai_confidence', sa.Float(), nullable=True))
    op.add_column('complaints', sa.Column('rejected_reason', sa.Text(), nullable=True))
    op.add_column('complaints', sa.Column('status_new', sa.String(length=20), nullable=True))

    # citizen_id: users->citizens kept the same id in M2
    conn.execute(sa.text("UPDATE complaints SET citizen_id = user_id"))

    # category_id / ai_category_id: join old enum text to the new categories table
    conn.execute(
        sa.text(
            "UPDATE complaints SET category_id = categories.id "
            "FROM categories WHERE categories.code = lower(complaints.category::text)"
        )
    )
    conn.execute(
        sa.text(
            "UPDATE complaints SET ai_category_id = categories.id "
            "FROM categories WHERE categories.code = lower(complaints.ai_category::text) "
            "AND complaints.ai_category IS NOT NULL"
        )
    )

    # assigned_department_id: default department of the resolved category
    conn.execute(
        sa.text(
            "UPDATE complaints SET assigned_department_id = categories.department_id "
            "FROM categories WHERE categories.id = complaints.category_id"
        )
    )

    for old_status, new_status in STATUS_MAP.items():
        conn.execute(
            sa.text("UPDATE complaints SET status_new = :new_status WHERE status = :old_status"),
            {"new_status": new_status, "old_status": old_status},
        )

    # ticket_number: sequential per year, ordered by created_at
    conn.execute(
        sa.text(
            "WITH numbered AS ("
            "  SELECT id, EXTRACT(YEAR FROM created_at)::int AS yr,"
            "         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at) AS rn"
            "  FROM complaints"
            ") "
            "UPDATE complaints c SET ticket_number = :prefix || '-' || numbered.yr || '-' || LPAD(numbered.rn::text, 6, '0') "
            "FROM numbered WHERE c.id = numbered.id"
        ),
        {"prefix": settings.ticket_prefix},
    )

    # keep ticket_counters in sync so newly-issued tickets don't collide with backfilled ones
    conn.execute(
        sa.text(
            "INSERT INTO ticket_counters (year, last_value) "
            "SELECT EXTRACT(YEAR FROM created_at)::int, COUNT(*) FROM complaints "
            "GROUP BY EXTRACT(YEAR FROM created_at)::int "
            "ON CONFLICT (year) DO UPDATE SET last_value = GREATEST(ticket_counters.last_value, EXCLUDED.last_value)"
        )
    )

    op.alter_column('complaints', 'ticket_number', nullable=False)
    op.alter_column('complaints', 'citizen_id', nullable=False)
    op.alter_column('complaints', 'category_id', nullable=False)
    op.alter_column('complaints', 'status_new', nullable=False)

    op.create_unique_constraint('uq_complaints_ticket_number', 'complaints', ['ticket_number'])
    op.create_foreign_key('fk_complaints_citizen', 'complaints', 'citizens', ['citizen_id'], ['id'])
    op.create_foreign_key('fk_complaints_category', 'complaints', 'categories', ['category_id'], ['id'])
    op.create_foreign_key('fk_complaints_ai_category', 'complaints', 'categories', ['ai_category_id'], ['id'])
    op.create_foreign_key('fk_complaints_neighborhood', 'complaints', 'neighborhoods', ['neighborhood_id'], ['id'])
    op.create_foreign_key('fk_complaints_assigned_department', 'complaints', 'departments', ['assigned_department_id'], ['id'])
    op.create_foreign_key('fk_complaints_assigned_user', 'complaints', 'users', ['assigned_user_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_complaints_assigned_user', 'complaints', type_='foreignkey')
    op.drop_constraint('fk_complaints_assigned_department', 'complaints', type_='foreignkey')
    op.drop_constraint('fk_complaints_neighborhood', 'complaints', type_='foreignkey')
    op.drop_constraint('fk_complaints_ai_category', 'complaints', type_='foreignkey')
    op.drop_constraint('fk_complaints_category', 'complaints', type_='foreignkey')
    op.drop_constraint('fk_complaints_citizen', 'complaints', type_='foreignkey')
    op.drop_constraint('uq_complaints_ticket_number', 'complaints', type_='unique')

    for column in [
        'status_new', 'rejected_reason', 'ai_confidence', 'ai_category_id', 'needs_review',
        'deadline_at', 'assigned_user_id', 'assigned_department_id', 'neighborhood_id',
        'language', 'source', 'priority', 'category_id', 'citizen_id', 'ticket_number',
    ]:
        op.drop_column('complaints', column)
