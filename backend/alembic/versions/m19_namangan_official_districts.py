"""M19 - official Namangan region administrative units."""

import sqlalchemy as sa
from alembic import op

revision = "m19_namangan_official_districts"
down_revision = "m18_multi_district"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("districts", sa.Column("parent_district_id", sa.UUID(), nullable=True))
    op.create_foreign_key("fk_districts_parent", "districts", "districts", ["parent_district_id"], ["id"])
    op.create_index("ix_districts_parent_district_id", "districts", ["parent_district_id"])
    conn = op.get_bind()
    units = [
        ("CHORTAQ", "Chortoq tumani"),
        ("CHUST", "Chust tumani"),
        ("KOSONSOY", "Kosonsoy tumani"),
        ("MINGBULOQ", "Mingbuloq tumani"),
        ("NAMANGAN_TUMANI", "Namangan tumani"),
        ("NORIN", "Norin tumani"),
        ("POP", "Pop tumani"),
        ("TORAQORGON", "To‘raqo‘rg‘on tumani"),
        ("UYCHI", "Uychi tumani"),
        ("UCHQORGON", "Uchqo‘rg‘on tumani"),
        ("YANGIQORGON", "Yangiqo‘rg‘on tumani"),
        ("DAVLATOBOD", "Davlatobod tumani"),
        ("NAMANGAN_SHAHRI", "Namangan shahri"),
    ]
    for code, name in units:
        conn.execute(sa.text("""
            INSERT INTO districts (id, region_id, code, names)
            SELECT gen_random_uuid(), r.id, CAST(:code AS varchar), jsonb_build_object('uz', CAST(:name AS varchar))
            FROM regions r WHERE r.code = 'NAMANGAN'
            ON CONFLICT (region_id, code) DO UPDATE SET names = EXCLUDED.names
        """), {"code": code, "name": name})
    conn.execute(sa.text("""
        INSERT INTO districts (id, region_id, parent_district_id, code, names)
        SELECT gen_random_uuid(), r.id, city.id, 'YANGI_NAMANGAN', jsonb_build_object('uz', 'Yangi Namangan tumani')
        FROM regions r JOIN districts city ON city.region_id = r.id AND city.code = 'NAMANGAN_SHAHRI'
        WHERE r.code = 'NAMANGAN'
        ON CONFLICT (region_id, code) DO UPDATE SET parent_district_id = EXCLUDED.parent_district_id, names = EXCLUDED.names
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM districts WHERE code = 'YANGI_NAMANGAN'"))
    conn.execute(sa.text("DELETE FROM districts WHERE code IN ('CHORTAQ','CHUST','KOSONSOY','MINGBULOQ','NAMANGAN_TUMANI','NORIN','POP','TORAQORGON','UCHQORGON','YANGIQORGON','DAVLATOBOD','NAMANGAN_SHAHRI')"))
    op.drop_index("ix_districts_parent_district_id", table_name="districts")
    op.drop_constraint("fk_districts_parent", "districts", type_="foreignkey")
    op.drop_column("districts", "parent_district_id")
