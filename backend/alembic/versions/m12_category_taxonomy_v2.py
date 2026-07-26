"""M12 - category taxonomy v2 (22 categories, docs/03-kontraktlar.md category table)

Replaces the 15-category MVP catalog with the full 22-category taxonomy used
in the product spec's category table. `_category_catalog()` (app/services/ai/llm.py)
builds the LLM prompt straight from the `categories` table, so this migration
alone is enough to make the AI classifier aware of the new categories — no
prompt template change needed.

Three kinds of change, by code:
- **Renamed in place** (id unchanged, so existing complaints keep pointing at
  the right row): elektr, gaz, ekologiya, boshqa (name/icon only) and
  suv->suv_kanalizatsiya, kommunal->uy_kommunal, qurilish->qurilish_arxitektura,
  kadastr->yer_kadastr, soliq->soliq_moliya, ijtimoiy->ijtimoiy_yordam.
- **Merged** (docs table combines what used to be separate categories):
  yol+transport -> yol_transport (the `yol` row survives, renamed;
  `transport` row's complaints are repointed then it's deleted), and
  chiqindi+daraxt+obodonlashtirish -> chiqindi_obodon (`chiqindi` row
  survives).
- **New**: jamoat_xavfsizlik, yongin_xavfsizligi, sogliqni_saqlash, talim,
  bandlik_mehnat, fhdyo_hujjatlar, qishloq_xojaligi, telekommunikatsiya,
  huquqiy_masalalar, taklif_tashabbus — each routed to a newly seeded
  department.

DIQQAT (downgrade): merged categories can't be un-merged at the per-complaint
level (we don't track which original category a complaint "really" was) —
downgrade recreates the old rows empty and leaves their complaints on the
surviving merged row. Same data-loss tradeoff already accepted in M10.

Revision ID: m12_category_taxonomy_v2
Revises: m11_audio_transcript
Create Date: 2026-07-26 11:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'm12_category_taxonomy_v2'
down_revision = 'm11_audio_transcript'
branch_labels = None
depends_on = None


# code, uz, oz, ru, en, is_external
NEW_DEPARTMENTS = [
    ("iib", "Ichki ishlar bo'limi", "Ички ишлар бўлими", "Отдел внутренних дел", "Internal affairs department", True),
    ("favqulodda", "Favqulodda vaziyatlar boshqarmasi", "Фавқулодда вазиятлар бошқармаси", "Управление по чрезвычайным ситуациям", "Emergency situations department", True),
    ("sogliqni_saqlash", "Sog'liqni saqlash boshqarmasi", "Соғлиқни сақлаш бошқармаси", "Управление здравоохранения", "Healthcare department", True),
    ("talim", "Xalq ta'limi boshqarmasi", "Халқ таълими бошқармаси", "Управление народного образования", "Public education department", True),
    ("bandlik", "Bandlikka ko'maklashish markazi", "Бандликка кўмаклашиш маркази", "Центр содействия занятости", "Employment assistance center", True),
    ("fhdyo", "Fuqarolik holati dalolatnomalarini yozish bo'limi", "Фуқаролик ҳолати далолатномаларини ёзиш бўлими", "Отдел ЗАГС", "Civil registry office", True),
    ("qishloq_xojaligi", "Qishloq xo'jaligi bo'limi", "Қишлоқ хўжалиги бўлими", "Отдел сельского хозяйства", "Agriculture department", False),
    ("telekom", "Aloqa va axborotlashtirish bo'limi", "Алоқа ва ахборотлаштириш бўлими", "Отдел связи и информатизации", "Communications & IT department", True),
    ("huquq", "Yuridik bo'lim", "Юридик бўлим", "Юридический отдел", "Legal department", False),
]

# Categories renamed in place: old_code, new_code, uz, oz, ru, en, icon, sla_hours, dept_code, sort_order
RENAMED = [
    ("elektr", "elektr", "Elektr energiyasi", "Электр энергияси", "Электроэнергия", "Electricity", "zap", 24, "elektr", 3),
    ("gaz", "gaz", "Gaz ta'minoti", "Газ таъминоти", "Газоснабжение", "Gas supply", "flame", 12, "gaz", 4),
    ("suv", "suv_kanalizatsiya", "Suv va kanalizatsiya", "Сув ва канализация", "Вода и канализация", "Water & sewage", "droplet", 24, "suvsoz", 2),
    ("kommunal", "uy_kommunal", "Uy-joy va kommunal xizmatlar", "Уй-жой ва коммунал хизматлар", "Жильё и коммунальные услуги", "Housing & utilities", "home", 72, "kommunal", 6),
    ("ekologiya", "ekologiya", "Ekologiya", "Экология", "Экология", "Ecology", "leaf", 120, "ekologiya", 7),
    ("qurilish", "qurilish_arxitektura", "Qurilish va arxitektura", "Қурилиш ва архитектура", "Строительство и архитектура", "Construction & architecture", "hard-hat", 168, "qurilish", 15),
    ("kadastr", "yer_kadastr", "Yer va kadastr", "Ер ва кадастр", "Земля и кадастр", "Land & cadastre", "map", 168, "kadastr", 14),
    ("soliq", "soliq_moliya", "Soliq va moliya", "Солиқ ва молия", "Налоги и финансы", "Tax & finance", "receipt", 168, "soliq", 16),
    ("ijtimoiy", "ijtimoiy_yordam", "Ijtimoiy yordam", "Ижтимоий ёрдам", "Социальная помощь", "Social assistance", "heart-handshake", 72, "ijtimoiy", 12),
    ("boshqa", "boshqa", "Boshqa", "Бошқа", "Другое", "Other", "help-circle", 72, "hokimlik", 22),
]

# Merge groups: surviving_old_code, [absorbed_old_codes...], new_code, uz, oz, ru, en, icon, sla_hours, dept_code, sort_order
MERGES = [
    (
        "yol", ["transport"], "yol_transport",
        "Yo'l va transport", "Йўл ва транспорт", "Дороги и транспорт", "Roads & transport",
        "route", 72, "yolxojaligi", 1,
    ),
    (
        "chiqindi", ["daraxt", "obodonlashtirish"], "chiqindi_obodon",
        "Chiqindi va obodonlashtirish", "Чиқинди ва ободонлаштириш", "Отходы и благоустройство", "Waste & landscaping",
        "trash-2", 48, "sanitariya", 5,
    ),
]

# code, uz, oz, ru, en, icon, sla_hours, dept_code, sort_order
NEW_CATEGORIES = [
    ("jamoat_xavfsizlik", "Jamoat tartibi va xavfsizlik", "Жамоат тартиби ва хавфсизлик", "Общественный порядок и безопасность", "Public order & safety", "shield-alert", 48, "iib", 8),
    ("yongin_xavfsizligi", "Yong'in xavfsizligi", "Ёнғин хавфсизлиги", "Пожарная безопасность", "Fire safety", "flame-kindling", 12, "favqulodda", 9),
    ("sogliqni_saqlash", "Sog'liqni saqlash", "Соғлиқни сақлаш", "Здравоохранение", "Healthcare", "heart-pulse", 72, "sogliqni_saqlash", 10),
    ("talim", "Ta'lim", "Таълим", "Образование", "Education", "graduation-cap", 120, "talim", 11),
    ("bandlik_mehnat", "Bandlik va mehnat", "Бандлик ва меҳнат", "Занятость и труд", "Employment & labor", "briefcase", 168, "bandlik", 13),
    ("fhdyo_hujjatlar", "FHDYO va hujjatlar", "ФҲДЁ ва ҳужжатлар", "ЗАГС и документы", "Civil registry & documents", "file-text", 120, "fhdyo", 17),
    ("qishloq_xojaligi", "Qishloq xo'jaligi", "Қишлоқ хўжалиги", "Сельское хозяйство", "Agriculture", "wheat", 168, "qishloq_xojaligi", 18),
    ("telekommunikatsiya", "Telekommunikatsiya", "Телекоммуникация", "Телекоммуникации", "Telecommunications", "phone", 72, "telekom", 19),
    ("huquqiy_masalalar", "Huquqiy masalalar", "Ҳуқуқий масалалар", "Правовые вопросы", "Legal matters", "scale", 168, "huquq", 20),
    ("taklif_tashabbus", "Taklif va tashabbuslar", "Таклиф ва ташаббуслар", "Предложения и инициативы", "Proposals & initiatives", "megaphone", 168, "hokimlik", 21),
]


def upgrade() -> None:
    conn = op.get_bind()

    _NAME_PARAMS = (
        sa.bindparam("uz", type_=sa.Text()),
        sa.bindparam("oz", type_=sa.Text()),
        sa.bindparam("ru", type_=sa.Text()),
        sa.bindparam("en", type_=sa.Text()),
    )

    dept_insert = sa.text(
        "INSERT INTO departments (id, code, names, is_external, is_active, created_at) "
        "VALUES (gen_random_uuid(), :code, jsonb_build_object('uz', :uz, 'oz', :oz, 'ru', :ru, 'en', :en), "
        ":is_external, true, now()) ON CONFLICT (code) DO NOTHING"
    ).bindparams(*_NAME_PARAMS)
    for code, uz, oz, ru, en, is_external in NEW_DEPARTMENTS:
        conn.execute(dept_insert, {"code": code, "uz": uz, "oz": oz, "ru": ru, "en": en, "is_external": is_external})

    dept_id = {
        row[0]: row[1]
        for row in conn.execute(sa.text("SELECT code, id FROM departments")).fetchall()
    }

    rename_update = sa.text(
        "UPDATE categories SET code=:new_code, "
        "names=jsonb_build_object('uz', :uz, 'oz', :oz, 'ru', :ru, 'en', :en), "
        "icon=:icon, sla_hours=:sla_hours, department_id=:department_id, sort_order=:sort_order "
        "WHERE code=:old_code"
    ).bindparams(*_NAME_PARAMS)
    for old_code, new_code, uz, oz, ru, en, icon, sla_hours, dept_code, sort_order in RENAMED:
        conn.execute(
            rename_update,
            {
                "old_code": old_code, "new_code": new_code, "uz": uz, "oz": oz, "ru": ru, "en": en,
                "icon": icon, "sla_hours": sla_hours, "department_id": dept_id[dept_code], "sort_order": sort_order,
            },
        )

    category_insert = sa.text(
        "INSERT INTO categories (id, code, names, icon, sla_hours, department_id, sort_order, is_active, created_at) "
        "VALUES (gen_random_uuid(), :code, jsonb_build_object('uz', :uz, 'oz', :oz, 'ru', :ru, 'en', :en), "
        ":icon, :sla_hours, :department_id, :sort_order, true, now())"
    ).bindparams(*_NAME_PARAMS)
    for code, uz, oz, ru, en, icon, sla_hours, dept_code, sort_order in NEW_CATEGORIES:
        conn.execute(category_insert, {
            "code": code, "uz": uz, "oz": oz, "ru": ru, "en": en, "icon": icon,
            "sla_hours": sla_hours, "department_id": dept_id[dept_code], "sort_order": sort_order,
        })

    for surviving_code, absorbed_codes, new_code, uz, oz, ru, en, icon, sla_hours, dept_code, sort_order in MERGES:
        surviving_id = conn.execute(
            sa.text("SELECT id FROM categories WHERE code=:code"), {"code": surviving_code}
        ).scalar_one()
        for absorbed_code in absorbed_codes:
            absorbed_id = conn.execute(
                sa.text("SELECT id FROM categories WHERE code=:code"), {"code": absorbed_code}
            ).scalar_one()
            conn.execute(
                sa.text("UPDATE complaints SET category_id=:new_id WHERE category_id=:old_id"),
                {"new_id": surviving_id, "old_id": absorbed_id},
            )
            conn.execute(
                sa.text("UPDATE complaints SET ai_category_id=:new_id WHERE ai_category_id=:old_id"),
                {"new_id": surviving_id, "old_id": absorbed_id},
            )
            conn.execute(
                sa.text("UPDATE ai_analyses SET suggested_category_id=:new_id WHERE suggested_category_id=:old_id"),
                {"new_id": surviving_id, "old_id": absorbed_id},
            )
            conn.execute(sa.text("DELETE FROM categories WHERE id=:id"), {"id": absorbed_id})

        conn.execute(
            rename_update,
            {
                "old_code": surviving_code, "new_code": new_code, "uz": uz, "oz": oz, "ru": ru, "en": en,
                "icon": icon, "sla_hours": sla_hours, "department_id": dept_id[dept_code], "sort_order": sort_order,
            },
        )


def downgrade() -> None:
    """Best-effort revert. Merged categories can't be un-merged per-complaint
    (docs/07 M10 precedent) — the recreated old rows come back empty and
    their former complaints stay on the surviving (renamed-back) row."""
    conn = op.get_bind()

    boshqa_id = conn.execute(sa.text("SELECT id FROM categories WHERE code='boshqa'")).scalar_one()
    for code, *_rest in NEW_CATEGORIES:
        row = conn.execute(sa.text("SELECT id FROM categories WHERE code=:code"), {"code": code}).fetchone()
        if row is None:
            continue
        cid = row[0]
        conn.execute(sa.text("UPDATE complaints SET category_id=:boshqa WHERE category_id=:cid"), {"boshqa": boshqa_id, "cid": cid})
        conn.execute(sa.text("UPDATE complaints SET ai_category_id=NULL WHERE ai_category_id=:cid"), {"cid": cid})
        conn.execute(sa.text("UPDATE ai_analyses SET suggested_category_id=NULL WHERE suggested_category_id=:cid"), {"cid": cid})
        conn.execute(sa.text("DELETE FROM categories WHERE id=:cid"), {"cid": cid})

    dept_id = {
        row[0]: row[1]
        for row in conn.execute(sa.text("SELECT code, id FROM departments")).fetchall()
    }
    _NAME_PARAMS = (
        sa.bindparam("uz", type_=sa.Text()),
        sa.bindparam("oz", type_=sa.Text()),
        sa.bindparam("ru", type_=sa.Text()),
        sa.bindparam("en", type_=sa.Text()),
    )
    rename_update = sa.text(
        "UPDATE categories SET code=:new_code, "
        "names=jsonb_build_object('uz', :uz, 'oz', :oz, 'ru', :ru, 'en', :en), "
        "icon=:icon, sla_hours=:sla_hours, department_id=:department_id, sort_order=:sort_order "
        "WHERE code=:old_code"
    ).bindparams(*_NAME_PARAMS)
    category_insert = sa.text(
        "INSERT INTO categories (id, code, names, icon, sla_hours, department_id, sort_order, is_active, created_at) "
        "VALUES (gen_random_uuid(), :code, jsonb_build_object('uz', :uz, 'oz', :oz, 'ru', :ru, 'en', :en), "
        ":icon, :sla_hours, :department_id, :sort_order, true, now())"
    ).bindparams(*_NAME_PARAMS)

    ORIGINAL = {
        "elektr": ("elektr", "Elektr ta'minoti", "Электр таъминоти", "Электроснабжение", "Electricity supply", "zap", 24, "elektr", 3),
        "gaz": ("gaz", "Gaz ta'minoti", "Газ таъминоти", "Газоснабжение", "Gas supply", "flame", 12, "gaz", 4),
        "suv_kanalizatsiya": ("suv", "Suv va kanalizatsiya", "Сув ва канализация", "Вода и канализация", "Water & sewage", "droplet", 24, "suvsoz", 5),
        "uy_kommunal": ("kommunal", "Kommunal xizmatlar", "Коммунал хизматлар", "Коммунальные услуги", "Utilities", "home", 72, "kommunal", 6),
        "ekologiya": ("ekologiya", "Ekologiya", "Экология", "Экология", "Ecology", "leaf", 120, "ekologiya", 8),
        "qurilish_arxitektura": ("qurilish", "Qurilish nazorati", "Қурилиш назорати", "Строительный надзор", "Construction control", "hard-hat", 168, "qurilish", 9),
        "yer_kadastr": ("kadastr", "Yer-mulk (kadastr)", "Ер-мулк (кадастр)", "Земля и кадастр", "Land & cadastre", "map", 168, "kadastr", 11),
        "soliq_moliya": ("soliq", "Soliq masalalari", "Солиқ масалалари", "Налоговые вопросы", "Tax issues", "receipt", 168, "soliq", 12),
        "ijtimoiy_yordam": ("ijtimoiy", "Ijtimoiy himoya", "Ижтимоий ҳимоя", "Социальная защита", "Social protection", "heart-handshake", 72, "ijtimoiy", 13),
        "boshqa": ("boshqa", "Boshqa", "Бошқа", "Другое", "Other", "help-circle", 72, "hokimlik", 14),
    }
    for new_code, (old_code, uz, oz, ru, en, icon, sla_hours, dept_code, sort_order) in ORIGINAL.items():
        conn.execute(rename_update, {
            "old_code": new_code, "new_code": old_code, "uz": uz, "oz": oz, "ru": ru, "en": en,
            "icon": icon, "sla_hours": sla_hours, "department_id": dept_id[dept_code], "sort_order": sort_order,
        })

    conn.execute(rename_update, {
        "old_code": "yol_transport", "new_code": "yol", "uz": "Yo'llar", "oz": "Йўллар", "ru": "Дороги", "en": "Roads",
        "icon": "road", "sla_hours": 72, "department_id": dept_id["yolxojaligi"], "sort_order": 1,
    })
    conn.execute(category_insert, {
        "code": "transport", "uz": "Jamoat transporti", "oz": "Жамоат транспорти", "ru": "Общественный транспорт", "en": "Public transport",
        "icon": "bus", "sla_hours": 72, "department_id": dept_id["transport"], "sort_order": 2,
    })

    conn.execute(rename_update, {
        "old_code": "chiqindi_obodon", "new_code": "chiqindi", "uz": "Chiqindi va axlat", "oz": "Чиқинди ва ахлат", "ru": "Мусор и отходы", "en": "Waste & garbage",
        "icon": "trash-2", "sla_hours": 48, "department_id": dept_id["sanitariya"], "sort_order": 0,
    })
    conn.execute(category_insert, {
        "code": "daraxt", "uz": "Daraxt va yashillik", "oz": "Дарахт ва яшиллик", "ru": "Деревья и озеленение", "en": "Trees & greenery",
        "icon": "tree-pine", "sla_hours": 120, "department_id": dept_id["obodonlashtirish"], "sort_order": 7,
    })
    conn.execute(category_insert, {
        "code": "obodonlashtirish", "uz": "Obodonlashtirish", "oz": "Ободонлаштириш", "ru": "Благоустройство", "en": "Landscaping",
        "icon": "sparkles", "sla_hours": 120, "department_id": dept_id["obodonlashtirish"], "sort_order": 10,
    })

    for code, *_rest in NEW_DEPARTMENTS:
        conn.execute(sa.text("DELETE FROM departments WHERE code=:code AND id NOT IN (SELECT department_id FROM categories WHERE department_id IS NOT NULL)"), {"code": code})
