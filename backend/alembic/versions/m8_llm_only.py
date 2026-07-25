"""M8 - LLM-only (kontrakt v1.3): keyword dvigateli olib tashlandi

`category_keywords` va `keyword_suggestions` jadvallari hamda
`ai_analyses.confident` ustuni tashlanadi; eski `engine='keyword'`
yozuvlari o'chiriladi (ular endi hech qayerda o'qilmaydi va AI aniqlik
hisobini buzardi).

MA'LUMOT YO'QOLADI: seed keywordlar (106 ta) va taklif navbati. Ikkalasi
ham qayta tiklanmaydi — seed keywordlar git tarixida (`app/seed.py`
m8'dan oldingi versiyasi), takliflar esa hosila ma'lumot edi.
`downgrade()` sxemani qaytaradi, lekin jadvallar BO'SH bo'ladi.

Revision ID: m8_llm_only
Revises: m7_llm_always
Create Date: 2026-07-25 03:30:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = 'm8_llm_only'
down_revision = 'm7_llm_always'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DELETE FROM ai_analyses WHERE engine = 'keyword'")
    op.drop_column('ai_analyses', 'confident')
    op.drop_table('keyword_suggestions')
    op.drop_table('category_keywords')


def downgrade() -> None:
    op.create_table(
        'category_keywords',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='CASCADE'), nullable=False),
        sa.Column('keyword_norm', sa.String(120), nullable=False),
        sa.Column('weight', sa.SmallInteger(), nullable=False, server_default='1'),
        sa.Column('source', sa.String(10), nullable=False, server_default='seed'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('category_id', 'keyword_norm', name='uq_category_keyword'),
    )
    op.create_index('ix_category_keywords_keyword_norm', 'category_keywords', ['keyword_norm'])

    op.create_table(
        'keyword_suggestions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('phrase_norm', sa.String(120), nullable=False),
        sa.Column('suggested_category_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('categories.id'), nullable=True),
        sa.Column('occurrences', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('sample_complaint_ids', postgresql.JSONB(), nullable=True),
        sa.Column('status', sa.String(10), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('phrase_norm', 'suggested_category_id', name='uq_suggestion_phrase_category'),
    )

    op.add_column('ai_analyses', sa.Column('confident', sa.Boolean(), nullable=True))
