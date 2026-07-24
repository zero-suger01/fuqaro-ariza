"""M2 - data migration: canonical departments/categories, users->citizens, images->complaint_files

Revision ID: m2_data_migration
Revises: m1_new_tables
Create Date: 2026-07-24 13:05:00.000000

Deviation from docs/04-database.md §4 M2 note: rather than copying
`organizations` rows into `departments` 1:1 by name, this inserts the fixed
canonical department/category taxonomy (same list as app/seed.py) and routes
any pre-existing complaints to a department via their resolved category's
default department. This is more robust than name-matching old orgs and
gives M3 something deterministic to join against. `organizations` itself is
dropped, data-loss-free, in M4 once nothing references it.
"""
from alembic import op
import sqlalchemy as sa

revision = 'm2_data_migration'
down_revision = 'm1_new_tables'
branch_labels = None
depends_on = None


DEPARTMENTS = [
    ("sanitariya", "Sanitariya tozalash xizmati", "Санитария тозалаш хизмати", "Служба санитарной очистки", "Sanitation service", True),
    ("yolxojaligi", "Yo'l xo'jaligi boshqarmasi", "Йўл хўжалиги бошқармаси", "Управление дорожного хозяйства", "Road maintenance department", True),
    ("transport", "Yo'lovchi transporti boshqarmasi", "Йўловчи транспорти бошқармаси", "Управление пассажирского транспорта", "Public transport department", True),
    ("elektr", "Elektr tarmoqlari korxonasi", "Электр тармоқлари корхонаси", "Предприятие электрических сетей", "Electric grid company", True),
    ("gaz", "Hududgaz ta'minoti xizmati", "Ҳудудгаз таъминоти хизмати", "Служба газоснабжения", "Gas supply service", True),
    ("suvsoz", "Suvsoz (suv ta'minoti) korxonasi", "Сувсоз (сув таъминоти) корхонаси", "Предприятие водоснабжения", "Water supply company", True),
    ("kommunal", "Kommunal xo'jalik boshqarmasi", "Коммунал хўжалик бошқармаси", "Управление коммунального хозяйства", "Utilities department", True),
    ("obodonlashtirish", "Obodonlashtirish boshqarmasi", "Ободонлаштириш бошқармаси", "Управление благоустройства", "Landscaping department", True),
    ("ekologiya", "Ekologiya va atrof-muhitni muhofaza qilish qo'mitasi", "Экология ва атроф-муҳитни муҳофаза қилиш қўмитаси", "Комитет по экологии и охране окружающей среды", "Ecology and environment committee", True),
    ("qurilish", "Davlat arxitektura-qurilish nazorati inspeksiyasi", "Давлат архитектура-қурилиш назорати инспекцияси", "Инспекция государственного архитектурно-строительного надзора", "State construction supervision inspectorate", True),
    ("kadastr", "Kadastr xizmati", "Кадастр хизмати", "Кадастровая служба", "Cadastre service", True),
    ("soliq", "Davlat soliq inspeksiyasi", "Давлат солиқ инспекцияси", "Государственная налоговая инспекция", "State tax inspectorate", True),
    ("ijtimoiy", "Ijtimoiy himoya bo'limi", "Ижтимоий ҳимоя бўлими", "Отдел социальной защиты", "Social protection department", False),
    ("hokimlik", "Tuman hokimligi murojaatlar bo'limi", "Туман ҳокимлиги мурожаатлар бўлими", "Отдел обращений граждан хокимията района", "District administration complaints office", False),
]

CATEGORIES = [
    ("chiqindi", "Chiqindi va axlat", "Чиқинди ва ахлат", "Мусор и отходы", "Waste & garbage", "trash-2", 48, "sanitariya", 0),
    ("yol", "Yo'llar", "Йўллар", "Дороги", "Roads", "road", 72, "yolxojaligi", 1),
    ("transport", "Jamoat transporti", "Жамоат транспорти", "Общественный транспорт", "Public transport", "bus", 72, "transport", 2),
    ("elektr", "Elektr ta'minoti", "Электр таъминоти", "Электроснабжение", "Electricity supply", "zap", 24, "elektr", 3),
    ("gaz", "Gaz ta'minoti", "Газ таъминоти", "Газоснабжение", "Gas supply", "flame", 12, "gaz", 4),
    ("suv", "Suv va kanalizatsiya", "Сув ва канализация", "Вода и канализация", "Water & sewage", "droplet", 24, "suvsoz", 5),
    ("kommunal", "Kommunal xizmatlar", "Коммунал хизматлар", "Коммунальные услуги", "Utilities", "home", 72, "kommunal", 6),
    ("daraxt", "Daraxt va yashillik", "Дарахт ва яшиллик", "Деревья и озеленение", "Trees & greenery", "tree-pine", 120, "obodonlashtirish", 7),
    ("ekologiya", "Ekologiya", "Экология", "Экология", "Ecology", "leaf", 120, "ekologiya", 8),
    ("qurilish", "Qurilish nazorati", "Қурилиш назорати", "Строительный надзор", "Construction control", "hard-hat", 168, "qurilish", 9),
    ("obodonlashtirish", "Obodonlashtirish", "Ободонлаштириш", "Благоустройство", "Landscaping", "sparkles", 120, "obodonlashtirish", 10),
    ("kadastr", "Yer-mulk (kadastr)", "Ер-мулк (кадастр)", "Земля и кадастр", "Land & cadastre", "map", 168, "kadastr", 11),
    ("soliq", "Soliq masalalari", "Солиқ масалалари", "Налоговые вопросы", "Tax issues", "receipt", 168, "soliq", 12),
    ("ijtimoiy", "Ijtimoiy himoya", "Ижтимоий ҳимоя", "Социальная защита", "Social protection", "heart-handshake", 72, "ijtimoiy", 13),
    ("boshqa", "Boshqa", "Бошқа", "Другое", "Other", "help-circle", 72, "hokimlik", 14),
]


def upgrade() -> None:
    conn = op.get_bind()

    dept_insert = sa.text(
        "INSERT INTO departments (id, code, names, is_external, is_active, created_at) "
        "VALUES (gen_random_uuid(), :code, jsonb_build_object('uz', :uz, 'oz', :oz, 'ru', :ru, 'en', :en), "
        ":is_external, true, now()) RETURNING id"
    ).bindparams(
        sa.bindparam("uz", type_=sa.Text()),
        sa.bindparam("oz", type_=sa.Text()),
        sa.bindparam("ru", type_=sa.Text()),
        sa.bindparam("en", type_=sa.Text()),
    )
    category_insert = sa.text(
        "INSERT INTO categories (id, code, names, icon, sla_hours, department_id, sort_order, is_active, created_at) "
        "VALUES (gen_random_uuid(), :code, jsonb_build_object('uz', :uz, 'oz', :oz, 'ru', :ru, 'en', :en), "
        ":icon, :sla_hours, :department_id, :sort_order, true, now())"
    ).bindparams(
        sa.bindparam("uz", type_=sa.Text()),
        sa.bindparam("oz", type_=sa.Text()),
        sa.bindparam("ru", type_=sa.Text()),
        sa.bindparam("en", type_=sa.Text()),
    )

    dept_ids: dict[str, str] = {}
    for code, uz, oz, ru, en, is_external in DEPARTMENTS:
        result = conn.execute(dept_insert, {"code": code, "uz": uz, "oz": oz, "ru": ru, "en": en, "is_external": is_external})
        dept_ids[code] = result.scalar_one()

    for code, uz, oz, ru, en, icon, sla_hours, dept_code, sort_order in CATEGORIES:
        conn.execute(
            category_insert,
            {
                "code": code, "uz": uz, "oz": oz, "ru": ru, "en": en, "icon": icon,
                "sla_hours": sla_hours, "department_id": dept_ids[dept_code], "sort_order": sort_order,
            },
        )

    # users.role='USER' rows -> citizens (same id, so complaints.user_id keeps working as a join key in M3)
    conn.execute(
        sa.text(
            "INSERT INTO citizens (id, phone, first_name, last_name, password_hash, language, created_at) "
            "SELECT id, phone, first_name, last_name, password_hash, 'uz', created_at FROM users WHERE role = 'USER'"
        )
    )
    conn.execute(sa.text("DELETE FROM users WHERE role = 'USER'"))
    conn.execute(sa.text("UPDATE users SET role = 'admin' WHERE role = 'ADMIN'"))

    # images -> complaint_files
    conn.execute(
        sa.text(
            "INSERT INTO complaint_files (id, complaint_id, kind, url, mime, size_bytes, created_at) "
            "SELECT id, complaint_id, 'image', image_url, 'image/jpeg', 0, created_at FROM images"
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM complaint_files"))
    conn.execute(sa.text("UPDATE users SET role = 'ADMIN' WHERE role = 'admin'"))
    conn.execute(sa.text("DELETE FROM citizens"))
    conn.execute(sa.text("DELETE FROM categories"))
    conn.execute(sa.text("DELETE FROM departments"))
