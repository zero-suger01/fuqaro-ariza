"""M6 - role model v2: operator/employee/manager collapse into department_staff

Revision ID: m6_role_model_v2
Revises: m5_indexes_checks
Create Date: 2026-07-24 22:40:00.000000

"""
from alembic import op

revision = 'm6_role_model_v2'
down_revision = 'm5_indexes_checks'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint('ck_users_role', 'users', type_='check')

    op.execute("UPDATE users SET role = 'department_staff' WHERE role IN ('employee', 'manager')")
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'operator'")

    op.alter_column('users', 'role', server_default='department_staff')
    op.create_check_constraint('ck_users_role', 'users', "role IN ('department_staff','admin')")


def downgrade() -> None:
    op.drop_constraint('ck_users_role', 'users', type_='check')
    op.alter_column('users', 'role', server_default='operator')
    op.create_check_constraint('ck_users_role', 'users', "role IN ('operator','employee','manager','admin')")
    # NOTE: department_staff/admin -> operator/employee/manager/admin biriktirilishi
    # yo'qotiladigan ma'lumot bo'lgani uchun (department_staff qaysi eski rol
    # bo'lganini bilmaymiz) data downgrade qilinmaydi, faqat konstraint qaytariladi.
