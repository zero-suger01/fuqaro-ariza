"""M4 - drop superseded columns/tables/enum types

Revision ID: m4_drop_old
Revises: m3_complaints_columns
Create Date: 2026-07-24 13:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'm4_drop_old'
down_revision = 'm3_complaints_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint('complaints_organization_id_fkey', 'complaints', type_='foreignkey')
    op.drop_constraint('complaints_user_id_fkey', 'complaints', type_='foreignkey')
    op.drop_index('ix_complaints_organization_id', table_name='complaints')
    op.drop_index('ix_complaints_user_id', table_name='complaints')
    op.drop_index('ix_complaints_district', table_name='complaints')
    op.drop_index('ix_complaints_neighborhood', table_name='complaints')
    op.drop_index('ix_complaints_status', table_name='complaints')

    op.drop_column('complaints', 'status')
    op.alter_column('complaints', 'status_new', new_column_name='status')
    op.drop_column('complaints', 'organization_id')
    op.drop_column('complaints', 'user_id')
    op.drop_column('complaints', 'district')
    op.drop_column('complaints', 'neighborhood')
    op.drop_column('complaints', 'category')
    op.drop_column('complaints', 'ai_category')
    op.drop_column('complaints', 'confidence')
    op.drop_column('complaints', 'title')

    op.drop_table('images')
    op.drop_table('organizations')

    op.execute('DROP TYPE IF EXISTS complaintstatus')
    op.execute('DROP TYPE IF EXISTS complaintcategory')


def downgrade() -> None:
    raise NotImplementedError("M4 drops data-bearing columns/tables — restore from a pg_dump backup instead")
