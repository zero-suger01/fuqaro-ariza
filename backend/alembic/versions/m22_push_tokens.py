"""M22 - Expo push tokens for citizen mobile devices."""

import sqlalchemy as sa
from alembic import op

revision = "m22_push_tokens"
down_revision = "m21_district_support_phone"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "push_tokens",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("citizen_id", sa.Uuid(), sa.ForeignKey("citizens.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.String(length=255), nullable=False, unique=True),
        sa.Column("platform", sa.String(length=10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("citizen_id", "token", name="uq_push_tokens_citizen_token"),
    )
    op.create_index("ix_push_tokens_citizen_id", "push_tokens", ["citizen_id"])
    op.create_check_constraint("ck_push_tokens_platform", "push_tokens", "platform IN ('ios','android')")


def downgrade() -> None:
    op.drop_constraint("ck_push_tokens_platform", "push_tokens", type_="check")
    op.drop_index("ix_push_tokens_citizen_id", table_name="push_tokens")
    op.drop_table("push_tokens")
