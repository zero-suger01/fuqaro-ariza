"""M5 - remaining indexes + CHECK constraints for contract enum values

Revision ID: m5_indexes_checks
Revises: m4_drop_old
Create Date: 2026-07-24 13:20:00.000000

"""
from alembic import op

revision = 'm5_indexes_checks'
down_revision = 'm4_drop_old'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index('ix_complaints_status', 'complaints', ['status'], unique=False)
    op.create_index('ix_complaints_category_id', 'complaints', ['category_id'], unique=False)
    op.create_index('ix_complaints_assigned_department_id', 'complaints', ['assigned_department_id'], unique=False)
    op.create_index('ix_complaints_citizen_id', 'complaints', ['citizen_id'], unique=False)
    op.create_index('ix_complaints_deadline_at', 'complaints', ['deadline_at'], unique=False)
    op.create_index('ix_complaints_neighborhood_id', 'complaints', ['neighborhood_id'], unique=False)

    op.create_check_constraint(
        'ck_complaints_status',
        'complaints',
        "status IN ('new','ai_processed','assigned','accepted','in_progress','need_info','resolved','rejected','closed','archived')",
    )
    op.create_check_constraint(
        'ck_complaints_priority', 'complaints', "priority IN ('low','medium','high','critical')"
    )
    op.create_check_constraint('ck_complaints_source', 'complaints', "source IN ('web','telegram','qr','operator')")
    op.create_check_constraint('ck_complaints_language', 'complaints', "language IN ('uz','oz','ru','en')")
    op.create_check_constraint('ck_citizens_language', 'citizens', "language IN ('uz','oz','ru','en')")
    op.create_check_constraint('ck_users_role', 'users', "role IN ('operator','employee','manager','admin')")
    op.create_check_constraint('ck_category_keywords_source', 'category_keywords', "source IN ('seed','admin','auto')")
    op.create_check_constraint(
        'ck_notifications_channel', 'notifications', "channel IN ('in_app','sms','telegram','email')"
    )
    op.create_check_constraint('ck_notifications_status', 'notifications', "status IN ('queued','sent','failed')")
    op.create_check_constraint('ck_ai_analyses_engine', 'ai_analyses', "engine IN ('keyword','llm')")
    op.create_check_constraint(
        'ck_complaint_files_kind', 'complaint_files', "kind IN ('image','video','audio','document')"
    )
    op.create_check_constraint(
        'ck_complaint_events_actor_type', 'complaint_events', "actor_type IN ('citizen','staff','system','ai')"
    )
    op.create_check_constraint(
        'ck_keyword_suggestions_status', 'keyword_suggestions', "status IN ('pending','approved','rejected')"
    )
    op.create_check_constraint('ck_stt_jobs_status', 'stt_jobs', "status IN ('pending','done','failed')")


def downgrade() -> None:
    op.drop_constraint('ck_stt_jobs_status', 'stt_jobs', type_='check')
    op.drop_constraint('ck_keyword_suggestions_status', 'keyword_suggestions', type_='check')
    op.drop_constraint('ck_complaint_events_actor_type', 'complaint_events', type_='check')
    op.drop_constraint('ck_complaint_files_kind', 'complaint_files', type_='check')
    op.drop_constraint('ck_ai_analyses_engine', 'ai_analyses', type_='check')
    op.drop_constraint('ck_notifications_status', 'notifications', type_='check')
    op.drop_constraint('ck_notifications_channel', 'notifications', type_='check')
    op.drop_constraint('ck_category_keywords_source', 'category_keywords', type_='check')
    op.drop_constraint('ck_users_role', 'users', type_='check')
    op.drop_constraint('ck_citizens_language', 'citizens', type_='check')
    op.drop_constraint('ck_complaints_language', 'complaints', type_='check')
    op.drop_constraint('ck_complaints_source', 'complaints', type_='check')
    op.drop_constraint('ck_complaints_priority', 'complaints', type_='check')
    op.drop_constraint('ck_complaints_status', 'complaints', type_='check')

    op.drop_index('ix_complaints_neighborhood_id', table_name='complaints')
    op.drop_index('ix_complaints_deadline_at', table_name='complaints')
    op.drop_index('ix_complaints_citizen_id', table_name='complaints')
    op.drop_index('ix_complaints_assigned_department_id', table_name='complaints')
    op.drop_index('ix_complaints_category_id', table_name='complaints')
    op.drop_index('ix_complaints_status', table_name='complaints')
