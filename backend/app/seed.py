"""Seed categories, departments, keywords, an admin user and default settings.

Run with: python -m app.seed
"""
from app.core.security import hash_password
from app.database import SessionLocal
from app.models.category import Category
from app.models.department import Department
from app.models.keyword import CategoryKeyword
from app.models.setting import Setting
from app.models.user import User
from app.services.ai.normalize import normalize

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

# code, uz, oz, ru, en, icon, sla_hours, department_code
CATEGORIES = [
    ("chiqindi", "Chiqindi va axlat", "Чиқинди ва ахлат", "Мусор и отходы", "Waste & garbage", "trash-2", 48, "sanitariya"),
    ("yol", "Yo'llar", "Йўллар", "Дороги", "Roads", "road", 72, "yolxojaligi"),
    ("transport", "Jamoat transporti", "Жамоат транспорти", "Общественный транспорт", "Public transport", "bus", 72, "transport"),
    ("elektr", "Elektr ta'minoti", "Электр таъминоти", "Электроснабжение", "Electricity supply", "zap", 24, "elektr"),
    ("gaz", "Gaz ta'minoti", "Газ таъминоти", "Газоснабжение", "Gas supply", "flame", 12, "gaz"),
    ("suv", "Suv va kanalizatsiya", "Сув ва канализация", "Вода и канализация", "Water & sewage", "droplet", 24, "suvsoz"),
    ("kommunal", "Kommunal xizmatlar", "Коммунал хизматлар", "Коммунальные услуги", "Utilities", "home", 72, "kommunal"),
    ("daraxt", "Daraxt va yashillik", "Дарахт ва яшиллик", "Деревья и озеленение", "Trees & greenery", "tree-pine", 120, "obodonlashtirish"),
    ("ekologiya", "Ekologiya", "Экология", "Экология", "Ecology", "leaf", 120, "ekologiya"),
    ("qurilish", "Qurilish nazorati", "Қурилиш назорати", "Строительный надзор", "Construction control", "hard-hat", 168, "qurilish"),
    ("obodonlashtirish", "Obodonlashtirish", "Ободонлаштириш", "Благоустройство", "Landscaping", "sparkles", 120, "obodonlashtirish"),
    ("kadastr", "Yer-mulk (kadastr)", "Ер-мулк (кадастр)", "Земля и кадастр", "Land & cadastre", "map", 168, "kadastr"),
    ("soliq", "Soliq masalalari", "Солиқ масалалари", "Налоговые вопросы", "Tax issues", "receipt", 168, "soliq"),
    ("ijtimoiy", "Ijtimoiy himoya", "Ижтимоий ҳимоя", "Социальная защита", "Social protection", "heart-handshake", 72, "ijtimoiy"),
    ("boshqa", "Boshqa", "Бошқа", "Другое", "Other", "help-circle", 72, "hokimlik"),
]

# category_code -> raw keyword phrases (normalized at insert time). Includes
# Cyrillic/Russian loanwords and common dialect misspellings so the
# normalizer's transliteration is exercised (docs/07-ai-layer.md §3).
KEYWORDS: dict[str, list[str]] = {
    "chiqindi": [
        "chiqindi", "axlat", "musor", "olib ketilmayapti", "poligon", "tashlandiq",
        "iflos", "konteyner", "chiqindilar", "чиқинди", "мусор", "ахлат",
    ],
    "yol": [
        "yol", "asfalt", "chuqur", "yoriq", "svetofor", "yo'l belgisi",
        "piyodalar", "ko'cha yuzasi", "chuqurcha", "yo'l chuqur", "дорога", "ёл",
    ],
    "transport": [
        "avtobus", "marshrutka", "transport harakati", "yo'lovchi tashish",
        "chipta narxi", "haydovchi qo'pol", "jamoat transporti", "автобус", "маршрутка",
    ],
    "elektr": [
        "elektr", "svet", "ustun", "sim uzilgan", "transformator", "quvvat",
        "tok urmoqda", "lampochka", "lampichka", "chiroq", "chiroq o'chdi",
        "elektr ta'minoti", "свет", "электр",
    ],
    "gaz": [
        "gaz", "gaz hidi", "gaz sizmoqda", "gaz quvuri", "portlash xavfi",
        "gaz ta'minoti", "газ", "газ ҳиди",
    ],
    "suv": [
        "suv", "quvur", "suv toshqini", "ichimlik suvi", "kanalizatsiya",
        "suv oqmoqda", "suv ta'minoti", "vodoprovod", "kanalizatsiya bitgan",
        "arik", "сув", "водопровод",
    ],
    "kommunal": [
        "kommunal xizmat", "isitish", "markaziy isitish", "batareya sovuq",
        "kommunal to'lov", "lift ishlamayapti", "chordoq", "коммунал",
    ],
    "daraxt": [
        "daraxt", "shox", "yiqilgan daraxt", "butalar", "yashil maydon",
        "daraxtlar kesilmoqda", "дарахт",
    ],
    "ekologiya": [
        "ekologiya", "hid yomon", "tutun", "havo ifloslanishi",
        "chiqindi yoqilmoqda", "atrof-muhit", "экология",
    ],
    "qurilish": [
        "qurilish", "noqonuniy qurilish", "bino xavfli", "inshoot",
        "ruxsatnomasiz qurilish", "qurilish chiqindisi", "қурилиш",
    ],
    "obodonlashtirish": [
        "obodonlashtirish", "hovli tozalanmagan", "skameyka buzilgan",
        "bolalar maydonchasi", "landshaft", "yashillashtirish", "tozalik yo'q",
    ],
    "kadastr": [
        "yer uchastkasi", "kadastr", "mulk hujjati", "xususiylashtirish",
        "yer maydoni", "texpasport", "кадастр",
    ],
    "soliq": [
        "soliq", "soliq inspeksiyasi", "jarima noto'g'ri", "bojxona",
        "patent", "yig'im", "солиқ",
    ],
    "ijtimoiy": [
        "nogironlar uchun", "kam ta'minlangan", "ijtimoiy yordam", "nafaqa",
        "subsidiya", "moddiy yordam", "ижтимоий ёрдам",
    ],
}

DEFAULT_SETTINGS = {
    "ai_confidence_threshold": 0.75,
    "sla_escalation_hours": 24,
    "danger_keywords": ["portlash", "gaz hidi", "sim uzilgan", "toshqin", "avariya"],
}


def run() -> None:
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

        keyword_count = 0
        for category_code, phrases in KEYWORDS.items():
            category = categories_by_code[category_code]
            existing_norms = {
                row.keyword_norm
                for row in db.query(CategoryKeyword.keyword_norm).filter(CategoryKeyword.category_id == category.id)
            }
            seen_norms: set[str] = set()
            for phrase in phrases:
                keyword_norm = normalize(phrase)
                # Cyrillic and Latin spellings of the same word can normalize
                # to an identical string — skip once already queued/stored.
                if keyword_norm in existing_norms or keyword_norm in seen_norms:
                    continue
                seen_norms.add(keyword_norm)
                weight = 2 if " " in keyword_norm else 1
                db.add(CategoryKeyword(category_id=category.id, keyword_norm=keyword_norm, weight=weight, source="seed"))
                keyword_count += 1
        if keyword_count:
            print(f"Seeded {keyword_count} keywords")

        admin_phone = "+998900000000"
        if not db.query(User).filter(User.phone == admin_phone).first():
            db.add(
                User(
                    first_name="Admin",
                    last_name="Adminov",
                    phone=admin_phone,
                    email="admin@ariza.uz",
                    password_hash=hash_password("admin123"),
                    role="admin",
                )
            )
            print(f"Seeded admin user: {admin_phone} / admin123")

        for key, value in DEFAULT_SETTINGS.items():
            if not db.get(Setting, key):
                db.add(Setting(key=key, value=value))
        print(f"Settings ready: {len(DEFAULT_SETTINGS)}")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
