"""M18 - Namangan multi-district scope and RBAC."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "m18_multi_district"
down_revision = "m17_qr_address_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "regions",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("names", JSONB(), nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "districts",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("region_id", sa.UUID(), sa.ForeignKey("regions.id"), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("names", JSONB(), nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("region_id", "code", name="uq_district_region_code"),
    )
    op.create_index("ix_districts_region_id", "districts", ["region_id"])
    op.create_table(
        "district_departments",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("district_id", sa.UUID(), sa.ForeignKey("districts.id"), nullable=False),
        sa.Column("department_id", sa.UUID(), sa.ForeignKey("departments.id"), nullable=False),
        sa.Column("phone", sa.String(16), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("wip_limit", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("district_id", "department_id", name="uq_district_department"),
    )
    op.create_index("ix_district_departments_district_id", "district_departments", ["district_id"])
    op.create_index("ix_district_departments_department_id", "district_departments", ["department_id"])

    op.add_column("users", sa.Column("region_id", sa.UUID(), nullable=True))
    op.add_column("users", sa.Column("district_id", sa.UUID(), nullable=True))
    op.create_foreign_key("fk_users_region_id", "users", "regions", ["region_id"], ["id"])
    op.create_foreign_key("fk_users_district_id", "users", "districts", ["district_id"], ["id"])
    op.create_index("ix_users_region_id", "users", ["region_id"])
    op.create_index("ix_users_district_id", "users", ["district_id"])

    for table in ("complaints", "neighborhoods", "qr_codes"):
        op.add_column(table, sa.Column("district_id", sa.UUID(), nullable=True))
        op.create_foreign_key(f"fk_{table}_district_id", table, "districts", ["district_id"], ["id"])
        op.create_index(f"ix_{table}_district_id", table, ["district_id"])

    conn = op.get_bind()
    conn.execute(sa.text("""
        INSERT INTO regions (id, code, names)
        VALUES (gen_random_uuid(), 'NAMANGAN', '{"uz":"Namangan viloyati","oz":"Наманган вилояти","ru":"Наманганская область"}')
        ON CONFLICT (code) DO NOTHING
    """))
    conn.execute(sa.text("""
        INSERT INTO districts (id, region_id, code, names)
        SELECT gen_random_uuid(), id, 'UYCHI', '{"uz":"Uychi tumani","oz":"Уйчи тумани","ru":"Уйчинский район"}'
        FROM regions WHERE code = 'NAMANGAN'
        ON CONFLICT (region_id, code) DO NOTHING
    """))
    conn.execute(sa.text("""
        UPDATE users SET region_id = r.id, district_id = d.id
        FROM regions r JOIN districts d ON d.region_id = r.id AND d.code = 'UYCHI'
        WHERE r.code = 'NAMANGAN' AND users.region_id IS NULL
    """))
    for table in ("complaints", "neighborhoods", "qr_codes"):
        conn.execute(sa.text(f"""
            UPDATE {table} SET district_id = d.id
            FROM districts d JOIN regions r ON r.id = d.region_id
            WHERE d.code = 'UYCHI' AND r.code = 'NAMANGAN' AND {table}.district_id IS NULL
        """))
    op.drop_constraint("ck_users_role", "users", type_="check")
    conn.execute(sa.text("UPDATE users SET role = 'district_admin' WHERE role = 'admin'"))
    op.create_check_constraint(
        "ck_users_role", "users",
        "role IN ('department_staff','district_admin','province_admin','system_admin')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint("ck_users_role", "users", "role IN ('department_staff','admin')")
    op.execute("UPDATE users SET role = 'admin' WHERE role IN ('district_admin','province_admin','system_admin')")
    for table in ("complaints", "neighborhoods", "qr_codes"):
        op.drop_index(f"ix_{table}_district_id", table_name=table)
        op.drop_constraint(f"fk_{table}_district_id", table, type_="foreignkey")
        op.drop_column(table, "district_id")
    for name in ("ix_users_district_id", "ix_users_region_id"):
        op.drop_index(name, table_name="users")
    op.drop_constraint("fk_users_district_id", "users", type_="foreignkey")
    op.drop_constraint("fk_users_region_id", "users", type_="foreignkey")
    op.drop_column("users", "district_id")
    op.drop_column("users", "region_id")
    op.drop_index("ix_district_departments_department_id", table_name="district_departments")
    op.drop_index("ix_district_departments_district_id", table_name="district_departments")
    op.drop_table("district_departments")
    op.drop_index("ix_districts_region_id", table_name="districts")
    op.drop_table("districts")
    op.drop_table("regions")
