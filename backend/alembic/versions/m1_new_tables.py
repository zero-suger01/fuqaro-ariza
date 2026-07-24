"""M1 - new tables for target schema (docs/04-database.md)

Revision ID: m1_new_tables
Revises: b35b883cba4e
Create Date: 2026-07-24 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'm1_new_tables'
down_revision = 'b35b883cba4e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'departments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('names', postgresql.JSONB(), nullable=False),
        sa.Column('phone', sa.String(length=32), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('is_external', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )

    op.create_table(
        'citizens',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('phone', sa.String(length=16), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('language', sa.String(length=4), nullable=False, server_default='uz'),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('is_phone_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('telegram_chat_id', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('phone'),
        sa.UniqueConstraint('telegram_chat_id'),
    )
    op.create_index('ix_citizens_phone', 'citizens', ['phone'], unique=False)

    op.create_table(
        'categories',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('names', postgresql.JSONB(), nullable=False),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('sla_hours', sa.Integer(), nullable=False, server_default='72'),
        sa.Column('department_id', sa.Uuid(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_categories_code', 'categories', ['code'], unique=False)

    op.create_table(
        'category_keywords',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('category_id', sa.Uuid(), nullable=False),
        sa.Column('keyword_norm', sa.String(length=120), nullable=False),
        sa.Column('weight', sa.SmallInteger(), nullable=False, server_default='1'),
        sa.Column('source', sa.String(length=10), nullable=False, server_default='seed'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('category_id', 'keyword_norm', name='uq_category_keyword'),
    )
    op.create_index('ix_category_keywords_category_id', 'category_keywords', ['category_id'], unique=False)
    op.create_index('ix_category_keywords_keyword_norm', 'category_keywords', ['keyword_norm'], unique=False)

    op.create_table(
        'neighborhoods',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.PrimaryKeyConstraint('id'),
    )

    # --- users: add staff fields, drop the old 2-value role enum in favor of varchar ---
    op.add_column('users', sa.Column('department_id', sa.Uuid(), nullable=True))
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.alter_column('users', 'role', type_=sa.String(length=20), existing_type=sa.Enum('USER', 'ADMIN', name='userrole'), postgresql_using='role::text')
    op.alter_column('users', 'role', server_default='operator')
    op.execute('DROP TYPE IF EXISTS userrole')
    op.create_index('ix_users_department_id', 'users', ['department_id'], unique=False)
    op.create_foreign_key('fk_users_department', 'users', 'departments', ['department_id'], ['id'])

    op.create_table(
        'complaint_files',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('complaint_id', sa.Uuid(), nullable=False),
        sa.Column('kind', sa.String(length=10), nullable=False),
        sa.Column('url', sa.String(length=1000), nullable=False),
        sa.Column('mime', sa.String(length=100), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('duration_s', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_complaint_files_complaint_id', 'complaint_files', ['complaint_id'], unique=False)

    op.create_table(
        'complaint_events',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('complaint_id', sa.Uuid(), nullable=False),
        sa.Column('event_type', sa.String(length=30), nullable=False),
        sa.Column('actor_type', sa.String(length=10), nullable=False),
        sa.Column('actor_id', sa.Uuid(), nullable=True),
        sa.Column('payload', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_complaint_events_complaint_id', 'complaint_events', ['complaint_id'], unique=False)
    op.create_index('ix_complaint_events_created_at', 'complaint_events', ['created_at'], unique=False)

    op.create_table(
        'replies',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('complaint_id', sa.Uuid(), nullable=False),
        sa.Column('ai_draft', sa.Text(), nullable=True),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('sent_by', sa.Uuid(), nullable=False),
        sa.Column('channels', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('sent_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sent_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_replies_complaint_id', 'replies', ['complaint_id'], unique=False)

    op.create_table(
        'ai_analyses',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('complaint_id', sa.Uuid(), nullable=False),
        sa.Column('engine', sa.String(length=10), nullable=False),
        sa.Column('suggested_category_id', sa.Uuid(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('priority', sa.String(length=10), nullable=True),
        sa.Column('sentiment', sa.String(length=10), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('suggested_reply', sa.Text(), nullable=True),
        sa.Column('tags', postgresql.JSONB(), nullable=True),
        sa.Column('model', sa.String(length=60), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['suggested_category_id'], ['categories.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ai_analyses_complaint_id', 'ai_analyses', ['complaint_id'], unique=False)

    op.create_table(
        'keyword_suggestions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('phrase_norm', sa.String(length=120), nullable=False),
        sa.Column('suggested_category_id', sa.Uuid(), nullable=True),
        sa.Column('occurrences', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('sample_complaint_ids', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('status', sa.String(length=10), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('reviewed_by', sa.Uuid(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['suggested_category_id'], ['categories.id']),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('phrase_norm', 'suggested_category_id', name='uq_keyword_suggestion'),
    )

    op.create_table(
        'stt_jobs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.String(length=10), nullable=False, server_default='pending'),
        sa.Column('audio_url', sa.String(length=1000), nullable=False),
        sa.Column('language', sa.String(length=4), nullable=False, server_default='uz'),
        sa.Column('text', sa.Text(), nullable=True),
        sa.Column('error', sa.String(length=200), nullable=True),
        sa.Column('ip', sa.String(length=45), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'ticket_counters',
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('last_value', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('year'),
    )

    op.create_table(
        'qr_codes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('neighborhood_id', sa.Uuid(), nullable=True),
        sa.Column('note', sa.String(length=200), nullable=True),
        sa.Column('scans', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['neighborhood_id'], ['neighborhoods.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_qr_codes_code', 'qr_codes', ['code'], unique=False)

    op.create_table(
        'settings',
        sa.Column('key', sa.String(length=50), nullable=False),
        sa.Column('value', postgresql.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint('key'),
    )

    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('entity', sa.String(length=30), nullable=False),
        sa.Column('entity_id', sa.Uuid(), nullable=False),
        sa.Column('meta', postgresql.JSONB(), nullable=True),
        sa.Column('ip', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'], unique=False)
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'], unique=False)

    # notifications: add citizen_id/status/meta, make user_id nullable
    op.add_column('notifications', sa.Column('citizen_id', sa.Uuid(), nullable=True))
    op.add_column('notifications', sa.Column('status', sa.String(length=10), nullable=False, server_default='sent'))
    op.add_column('notifications', sa.Column('meta', postgresql.JSONB(), nullable=True))
    op.alter_column('notifications', 'user_id', nullable=True)
    op.alter_column('notifications', 'channel', type_=sa.String(length=10), existing_type=sa.Enum('IN_APP', 'EMAIL', 'SMS', 'TELEGRAM', name='notificationchannel'), postgresql_using='channel::text')
    op.execute("UPDATE notifications SET channel = lower(channel)")
    op.alter_column('notifications', 'channel', server_default='in_app')
    op.execute('DROP TYPE IF EXISTS notificationchannel')
    op.create_index('ix_notifications_citizen_id', 'notifications', ['citizen_id'], unique=False)
    op.create_foreign_key('fk_notifications_citizen', 'notifications', 'citizens', ['citizen_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_notifications_citizen', 'notifications', type_='foreignkey')
    op.drop_index('ix_notifications_citizen_id', table_name='notifications')
    op.alter_column('notifications', 'channel', type_=sa.Enum('IN_APP', 'EMAIL', 'SMS', 'TELEGRAM', name='notificationchannel'), postgresql_using="upper(channel)::notificationchannel")
    op.alter_column('notifications', 'user_id', nullable=False)
    op.drop_column('notifications', 'meta')
    op.drop_column('notifications', 'status')
    op.drop_column('notifications', 'citizen_id')

    op.drop_index('ix_audit_logs_created_at', table_name='audit_logs')
    op.drop_index('ix_audit_logs_user_id', table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_table('settings')
    op.drop_index('ix_qr_codes_code', table_name='qr_codes')
    op.drop_table('qr_codes')
    op.drop_table('ticket_counters')
    op.drop_table('stt_jobs')
    op.drop_table('keyword_suggestions')
    op.drop_index('ix_ai_analyses_complaint_id', table_name='ai_analyses')
    op.drop_table('ai_analyses')
    op.drop_index('ix_replies_complaint_id', table_name='replies')
    op.drop_table('replies')
    op.drop_index('ix_complaint_events_created_at', table_name='complaint_events')
    op.drop_index('ix_complaint_events_complaint_id', table_name='complaint_events')
    op.drop_table('complaint_events')
    op.drop_index('ix_complaint_files_complaint_id', table_name='complaint_files')
    op.drop_table('complaint_files')

    op.drop_constraint('fk_users_department', 'users', type_='foreignkey')
    op.drop_index('ix_users_department_id', table_name='users')
    op.alter_column('users', 'role', type_=sa.Enum('USER', 'ADMIN', name='userrole'), postgresql_using="upper(role)::userrole")
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'department_id')

    op.drop_index('ix_category_keywords_keyword_norm', table_name='category_keywords')
    op.drop_index('ix_category_keywords_category_id', table_name='category_keywords')
    op.drop_table('category_keywords')
    op.drop_index('ix_categories_code', table_name='categories')
    op.drop_table('categories')
    op.drop_table('neighborhoods')
    op.drop_index('ix_citizens_phone', table_name='citizens')
    op.drop_table('citizens')
    op.drop_table('departments')
