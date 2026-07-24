"""M7 - LLM-always (R0): ai_analyses.confident

Keyword yozuvlarida threshold+margin qarori saqlanadi — o'rganish sikli
(learning.py) LLM-always rejimida "keyword ojiz qolgan" murojaatlarni shu
belgi orqali topadi. Backfill YO'Q: eski yozuvlarda margin ma'lumoti
saqlanmagan, ular NULL qoladi va mining'ga kirmaydi (docs/07 §5.2).

Revision ID: m7_llm_always
Revises: m6_role_model_v2
Create Date: 2026-07-25 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'm7_llm_always'
down_revision = 'm6_role_model_v2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('ai_analyses', sa.Column('confident', sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column('ai_analyses', 'confident')
