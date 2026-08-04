"""M21 - district-specific citizen support phone."""

import sqlalchemy as sa
from alembic import op

revision = "m21_district_support_phone"
down_revision = "m20_namangan_mfy_source"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("districts", sa.Column("support_phone", sa.String(length=16), nullable=True))


def downgrade() -> None:
    op.drop_column("districts", "support_phone")
