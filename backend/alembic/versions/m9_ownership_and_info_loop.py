"""M9 - egalik va ma'lumot sikli (kontrakt v1.4)

QA tekshiruvidan chiqqan P0 nuqsonlar uchun sxema qatlami:

1. `complaints.accepted_at` — xodim «Qabul qilaman» bosgan payt. Avval
   `accepted` sahifa ochilishida FE tomonidan qo'yilardi va hech qayerda
   vaqt saqlanmasdi; `avg_first_action_hours_7d` shu sababli soxta edi.
2. `complaints.info_requested_at` / `info_provided_at` — `need_info`
   siklining ikki uchi. «24 soatdan ortiq javobsiz» navbati shu ustun
   bo'yicha indeks bilan hisoblanadi (event jadvalini skanerlamasdan).
3. `complaints.satisfaction` / `reopened_count` — fuqaro bahosi va qayta
   ochish ([03] §3.6).
4. `citizen_messages` — fuqarodan xodimga yo'nalish (`replies` teskarisi).
   Fuqaro keyin yuborgan rasm/fayllar uchun alohida jadval kerak emas:
   `complaint_files` allaqachon `complaint_id` ga bog'langan.
5. `complaint_subtasks` — idoralararo topshiriqlar (S2).
6. `departments.wip_limit` — bo'lim yuklamasi ko'rsatkichi (bloklamaydi).
7. `users.must_change_password` — seed'dan yaratilgan admin standart parol
   bilan production'ga chiqib ketmasligi uchun.

`ck_complaints_status` CHECK'iga TEGILMAYDI — yangi status qo'shilmagan.
v1.4 dagi yangi o'tishlar (`resolved→in_progress`, `closed→in_progress`)
ilova darajasida (`app/core/constants.py`), sxemada emas.

Backfill: mavjud murojaatlarning `accepted_at` i `complaint_events` dagi
`status_changed → accepted` eventidan olinadi (birinchisi). Eventi
yo'qlar NULL bo'lib qoladi — bu to'g'ri, ular hech qachon qabul
qilinmagan.

Revision ID: m9_ownership_and_info_loop
Revises: m8_llm_only
Create Date: 2026-07-25 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = 'm9_ownership_and_info_loop'
down_revision = 'm8_llm_only'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- complaints: egalik va ma'lumot sikli ustunlari ---
    op.add_column('complaints', sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('complaints', sa.Column('info_requested_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('complaints', sa.Column('info_provided_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('complaints', sa.Column('satisfaction', sa.Boolean(), nullable=True))
    op.add_column(
        'complaints',
        sa.Column('reopened_count', sa.Integer(), nullable=False, server_default='0'),
    )

    # Backfill: `accepted` ga birinchi o'tish vaqti. payload->>'to' — JSONB,
    # `status_changed` eventlari doim shu shaklda yoziladi (workflow.py).
    op.execute(
        """
        UPDATE complaints c
        SET accepted_at = e.first_accepted_at
        FROM (
            SELECT complaint_id, MIN(created_at) AS first_accepted_at
            FROM complaint_events
            WHERE event_type = 'status_changed'
              AND payload ->> 'to' = 'accepted'
            GROUP BY complaint_id
        ) e
        WHERE c.id = e.complaint_id
        """
    )

    op.create_index('ix_complaints_status_info_requested_at', 'complaints', ['status', 'info_requested_at'])
    op.create_index('ix_complaints_assigned_user_status', 'complaints', ['assigned_user_id', 'status'])

    # --- departments.wip_limit ---
    op.add_column('departments', sa.Column('wip_limit', sa.Integer(), nullable=True))

    # --- users.must_change_password ---
    op.add_column(
        'users',
        sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default='false'),
    )

    # --- citizen_messages ---
    op.create_table(
        'citizen_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'complaint_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('complaints.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('source', sa.String(10), nullable=False),
        sa.Column('recorded_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("source IN ('web', 'telegram', 'manual')", name='ck_citizen_messages_source'),
    )
    op.create_index('ix_citizen_messages_complaint_created', 'citizen_messages', ['complaint_id', 'created_at'])

    # --- complaint_subtasks ---
    op.create_table(
        'complaint_subtasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'complaint_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('complaints.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id'), nullable=False),
        sa.Column('assigned_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('status', sa.String(10), nullable=False, server_default='open'),
        sa.Column('note', sa.Text(), nullable=False),
        sa.Column('deadline_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('open', 'done', 'cancelled')", name='ck_complaint_subtasks_status'),
    )
    op.create_index('ix_complaint_subtasks_complaint_id', 'complaint_subtasks', ['complaint_id'])
    op.create_index('ix_complaint_subtasks_department_status', 'complaint_subtasks', ['department_id', 'status'])


def downgrade() -> None:
    op.drop_index('ix_complaint_subtasks_department_status', table_name='complaint_subtasks')
    op.drop_index('ix_complaint_subtasks_complaint_id', table_name='complaint_subtasks')
    op.drop_table('complaint_subtasks')

    op.drop_index('ix_citizen_messages_complaint_created', table_name='citizen_messages')
    op.drop_table('citizen_messages')

    op.drop_column('users', 'must_change_password')
    op.drop_column('departments', 'wip_limit')

    op.drop_index('ix_complaints_assigned_user_status', table_name='complaints')
    op.drop_index('ix_complaints_status_info_requested_at', table_name='complaints')
    op.drop_column('complaints', 'reopened_count')
    op.drop_column('complaints', 'satisfaction')
    op.drop_column('complaints', 'info_provided_at')
    op.drop_column('complaints', 'info_requested_at')
    op.drop_column('complaints', 'accepted_at')
