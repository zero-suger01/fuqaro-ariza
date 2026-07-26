"""Seed categories, departments, an admin user and default settings.

Run with: `python -m app.seed` (kataloglar) yoki `python -m app.seed --demo`
(qo'shimcha sinov xodimlari — PRODUCTION'DA EMAS).

**Admin hisobi (v1.4):** faqat `ADMIN_SEED_PHONE` va `ADMIN_SEED_PASSWORD`
muhit o'zgaruvchilari BERILGANDA yaratiladi. Avval bu yerda hardcode
qilingan `+998900000000 / admin123` har safar yaratilardi — bunday hisob
production'ga o'zgarishsiz chiqib ketishi mumkin edi. Yaratilgan hisobga
`must_change_password=True` qo'yiladi ([04] §5, [11] §1.2).
"""
import argparse
import os

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.category import Category
from app.models.department import Department
from app.models.setting import Setting
from app.models.user import User

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
    # v1.6 (M12) — 22-category taxonomy additions (docs/03-kontraktlar.md category table).
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

# code, uz, oz, ru, en, icon, sla_hours, department_code — v1.6 (M12): full
# 22-category taxonomy (docs/03-kontraktlar.md category table).
CATEGORIES = [
    ("chiqindi_obodon", "Chiqindi va obodonlashtirish", "Чиқинди ва ободонлаштириш", "Отходы и благоустройство", "Waste & landscaping", "trash-2", 48, "sanitariya"),
    ("yol_transport", "Yo'l va transport", "Йўл ва транспорт", "Дороги и транспорт", "Roads & transport", "route", 72, "yolxojaligi"),
    ("elektr", "Elektr energiyasi", "Электр энергияси", "Электроэнергия", "Electricity", "zap", 24, "elektr"),
    ("gaz", "Gaz ta'minoti", "Газ таъминоти", "Газоснабжение", "Gas supply", "flame", 12, "gaz"),
    ("suv_kanalizatsiya", "Suv va kanalizatsiya", "Сув ва канализация", "Вода и канализация", "Water & sewage", "droplet", 24, "suvsoz"),
    ("uy_kommunal", "Uy-joy va kommunal xizmatlar", "Уй-жой ва коммунал хизматлар", "Жильё и коммунальные услуги", "Housing & utilities", "home", 72, "kommunal"),
    ("ekologiya", "Ekologiya", "Экология", "Экология", "Ecology", "leaf", 120, "ekologiya"),
    ("qurilish_arxitektura", "Qurilish va arxitektura", "Қурилиш ва архитектура", "Строительство и архитектура", "Construction & architecture", "hard-hat", 168, "qurilish"),
    ("yer_kadastr", "Yer va kadastr", "Ер ва кадастр", "Земля и кадастр", "Land & cadastre", "map", 168, "kadastr"),
    ("soliq_moliya", "Soliq va moliya", "Солиқ ва молия", "Налоги и финансы", "Tax & finance", "receipt", 168, "soliq"),
    ("ijtimoiy_yordam", "Ijtimoiy yordam", "Ижтимоий ёрдам", "Социальная помощь", "Social assistance", "heart-handshake", 72, "ijtimoiy"),
    ("jamoat_xavfsizlik", "Jamoat tartibi va xavfsizlik", "Жамоат тартиби ва хавфсизлик", "Общественный порядок и безопасность", "Public order & safety", "shield-alert", 48, "iib"),
    ("yongin_xavfsizligi", "Yong'in xavfsizligi", "Ёнғин хавфсизлиги", "Пожарная безопасность", "Fire safety", "flame-kindling", 12, "favqulodda"),
    ("sogliqni_saqlash", "Sog'liqni saqlash", "Соғлиқни сақлаш", "Здравоохранение", "Healthcare", "heart-pulse", 72, "sogliqni_saqlash"),
    ("talim", "Ta'lim", "Таълим", "Образование", "Education", "graduation-cap", 120, "talim"),
    ("bandlik_mehnat", "Bandlik va mehnat", "Бандлик ва меҳнат", "Занятость и труд", "Employment & labor", "briefcase", 168, "bandlik"),
    ("fhdyo_hujjatlar", "FHDYO va hujjatlar", "ФҲДЁ ва ҳужжатлар", "ЗАГС и документы", "Civil registry & documents", "file-text", 120, "fhdyo"),
    ("qishloq_xojaligi", "Qishloq xo'jaligi", "Қишлоқ хўжалиги", "Сельское хозяйство", "Agriculture", "wheat", 168, "qishloq_xojaligi"),
    ("telekommunikatsiya", "Telekommunikatsiya", "Телекоммуникация", "Телекоммуникации", "Telecommunications", "phone", 72, "telekom"),
    ("huquqiy_masalalar", "Huquqiy masalalar", "Ҳуқуқий масалалар", "Правовые вопросы", "Legal matters", "scale", 168, "huquq"),
    ("taklif_tashabbus", "Taklif va tashabbuslar", "Таклиф ва ташаббуслар", "Предложения и инициативы", "Proposals & initiatives", "megaphone", 168, "hokimlik"),
    ("boshqa", "Boshqa", "Бошқа", "Другое", "Other", "help-circle", 72, "hokimlik"),
]

DEFAULT_SETTINGS = {
    "ai_low_confidence": 0.6,
    "sla_escalation_hours": 24,
}


def _seed_admin(db) -> None:
    """Admin faqat env berilganda yaratiladi ([04] §5, [11] §1.2)."""
    phone = (os.getenv("ADMIN_SEED_PHONE") or "").strip()
    password = os.getenv("ADMIN_SEED_PASSWORD") or ""

    if not phone or not password:
        print(
            "Admin SEED QILINMADI: ADMIN_SEED_PHONE va ADMIN_SEED_PASSWORD berilmagan.\n"
            "  Admin yaratish uchun: ADMIN_SEED_PHONE=+998XXXXXXXXX ADMIN_SEED_PASSWORD=<kuchli-parol> python -m app.seed"
        )
        return
    if len(password) < 8:
        raise SystemExit("ADMIN_SEED_PASSWORD kamida 8 belgidan iborat bo'lishi kerak")

    if db.query(User).filter(User.phone == phone).first():
        print(f"Admin allaqachon mavjud: {phone}")
        return

    db.add(
        User(
            first_name="Admin",
            last_name="",
            phone=phone,
            password_hash=hash_password(password),
            role="admin",
            # Birinchi kirishda parol almashtirish majburiy — seed
            # paroli uzoq muddat ishlab qolmasin.
            must_change_password=True,
        )
    )
    print(f"Admin yaratildi: {phone} (birinchi kirishda parol almashtirish majburiy)")


# Demo xodimlar — FAQAT `--demo` bilan. Har bo'limga bitta sinov xodimi,
# oqimni uchdan-uchga tekshirish uchun. Production seed'ida bo'lmasligi
# kerak: QA tekshiruvida aynan shunday yozuvlar muhitda qolib ketgan edi.
DEMO_STAFF = [
    ("sanitariya", "+998900000101", "Sanitariya", "Xodimov"),
    ("suvsoz", "+998900000102", "Suvsoz", "Xodimov"),
    ("yolxojaligi", "+998900000103", "Yo'l", "Xodimov"),
]
DEMO_PASSWORD = "demo12345"


def _seed_demo_staff(db, departments_by_code: dict[str, Department]) -> None:
    created = 0
    for dept_code, phone, first_name, last_name in DEMO_STAFF:
        department = departments_by_code.get(dept_code)
        if department is None or db.query(User).filter(User.phone == phone).first():
            continue
        db.add(
            User(
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                password_hash=hash_password(DEMO_PASSWORD),
                role="department_staff",
                department_id=department.id,
                must_change_password=True,
            )
        )
        created += 1
    if created:
        print(f"DEMO xodimlar yaratildi: {created} ta (parol: {DEMO_PASSWORD}) — PRODUCTION'DA O'CHIRING")


def run(demo: bool = False) -> None:
    db = SessionLocal()
    try:
        departments_by_code: dict[str, Department] = {}
        for code, name_uz, name_oz, name_ru, name_en, is_external in DEPARTMENTS:
            department = db.query(Department).filter(Department.code == code).first()
            if department is None:
                department = Department(
                    code=code,
                    names={"uz": name_uz, "oz": name_oz, "ru": name_ru, "en": name_en},
                    is_external=is_external,
                )
                db.add(department)
                db.flush()
            departments_by_code[code] = department
        print(f"Departments ready: {len(departments_by_code)}")

        categories_by_code: dict[str, Category] = {}
        for order, (code, name_uz, name_oz, name_ru, name_en, icon, sla_hours, dept_code) in enumerate(CATEGORIES):
            category = db.query(Category).filter(Category.code == code).first()
            if category is None:
                category = Category(
                    code=code,
                    names={"uz": name_uz, "oz": name_oz, "ru": name_ru, "en": name_en},
                    icon=icon,
                    sla_hours=sla_hours,
                    department_id=departments_by_code[dept_code].id,
                    sort_order=order,
                )
                db.add(category)
                db.flush()
            categories_by_code[code] = category
        print(f"Categories ready: {len(categories_by_code)}")

        _seed_admin(db)
        if demo:
            _seed_demo_staff(db, departments_by_code)

        for key, value in DEFAULT_SETTINGS.items():
            if not db.get(Setting, key):
                db.add(Setting(key=key, value=value))
        print(f"Settings ready: {len(DEFAULT_SETTINGS)}")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kataloglarni (bo'lim, kategoriya, settings) va ixtiyoriy adminni seed qiladi")
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Sinov ma'lumotlarini ham qo'shadi (demo bo'lim xodimlari). PRODUCTION'DA ISHLATILMAYDI.",
    )
    args = parser.parse_args()
    run(demo=args.demo)
