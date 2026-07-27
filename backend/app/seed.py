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

# v1.8 — hokimlik bergan «davlat tashkilotlari matritsasi» bo'yicha to'liq
# qayta qurildi (docs/14-tashkilotlar-matritsasi.md). 7 guruh, 23 tashkilot.
# Kategoriyalar bular bilan 1:1 — LLM kategoriya tanlashi = mas'ul
# tashkilotni tanlashi, oradagi noaniqlik yo'q.
#
# code, uz, oz, ru, en, is_external
DEPARTMENTS = [
    # --- 1. Kommunal xizmatlar va uy-joy ---
    ("elektr", "Hududiy elektr tarmoqlari (Elektroset)", "Ҳудудий электр тармоқлари (Электросет)", "Региональные электрические сети", "Regional electric grid", True),
    ("gaz", "Hududgazta'minot", "Ҳудудгазтаъминот", "Худудгазтаъминот", "Regional gas supply", True),
    ("suvsoz", "Suvta'minot (Suvsoz) korxonasi", "Сувтаъминот (Сувсоз) корхонаси", "Предприятие водоснабжения", "Water supply company", True),
    ("obodonlashtirish", "Obodonlashtirish boshqarmasi", "Ободонлаштириш бошқармаси", "Управление благоустройства", "Landscaping department", True),
    ("sanitariya", "«Toza hudud» sanitar tozalash korxonasi", "«Тоза ҳудуд» санитар тозалаш корхонаси", "Предприятие санитарной очистки «Toza hudud»", "Sanitation company", True),
    ("uyjoy", "Uy-joy inspeksiyasi (BHK nazorati)", "Уй-жой инспекцияси (БҲК назорати)", "Жилищная инспекция (надзор за УК)", "Housing inspectorate", True),
    # --- 2. Yo'l, transport va infratuzilma ---
    ("yolxojaligi", "Avtomobil yo'llari qo'mitasi (Yo'l foydalanish korxonasi)", "Автомобиль йўллари қўмитаси", "Комитет автомобильных дорог", "Road committee", True),
    ("yhxx", "Yo'l harakati xavfsizligi xizmati (YHXX)", "Йўл ҳаракати хавфсизлиги хизмати (ЙҲХХ)", "Служба безопасности дорожного движения", "Road traffic safety service", True),
    ("transport", "Transport boshqarmasi (yo'lovchi tashish)", "Транспорт бошқармаси", "Управление транспорта", "Transport department", True),
    # --- 3. Ekologiya, yer va qurilish ---
    ("ekologiya", "Ekologiya va atrof-muhitni muhofaza qilish inspeksiyasi", "Экология ва атроф-муҳитни муҳофаза қилиш инспекцияси", "Инспекция экологии и охраны окружающей среды", "Ecology inspectorate", True),
    ("kadastr", "Kadastr agentligi bo'limi", "Кадастр агентлиги бўлими", "Отдел агентства кадастра", "Cadastre agency", True),
    ("qurilish", "Qurilish inspeksiyasi (arxitektura-qurilish nazorati)", "Қурилиш инспекцияси", "Строительная инспекция", "Construction inspectorate", True),
    # --- 4. Ijtimoiy soha, sog'liq va ta'lim ---
    ("sogliqni_saqlash", "Tuman tibbiyot birlashmasi (TTB, sanepid bilan)", "Туман тиббиёт бирлашмаси (ТТБ)", "Районное медицинское объединение", "District medical association", True),
    ("talim", "Maktabgacha va maktab ta'limi bo'limi", "Мактабгача ва мактаб таълими бўлими", "Отдел дошкольного и школьного образования", "Education department", True),
    ("ijtimoiy", "«Inson» ijtimoiy xizmatlar markazi", "«Инсон» ижтимоий хизматлар маркази", "Центр социальных услуг «Инсон»", "Social services center", True),
    # --- 5. Jamoat tartibi, huquq va xavfsizlik ---
    ("iib", "Ichki ishlar bo'limi (IIB, mahalla profilaktika inspektori)", "Ички ишлар бўлими (ИИБ)", "Отдел внутренних дел", "Internal affairs department", True),
    ("favqulodda", "Favqulodda vaziyatlar bo'limi (yong'in xavfsizligi)", "Фавқулодда вазиятлар бўлими", "Отдел по чрезвычайным ситуациям", "Emergency situations department", True),
    ("mib", "Majburiy ijro byurosi (MIB)", "Мажбурий ижро бюроси (МИБ)", "Бюро принудительного исполнения", "Enforcement bureau", True),
    ("fhdyo", "Adliya vazirligi (FHDYO bo'limi va DXM)", "Адлия вазирлиги (ФҲДЁ бўлими ва ДХМ)", "Министерство юстиции (отдел ЗАГС и ЦГУ)", "Ministry of Justice (civil registry & state services)", True),
    # --- 6. Iqtisodiyot, soliq va mehnat ---
    ("soliq", "Davlat soliq inspeksiyasi", "Давлат солиқ инспекцияси", "Государственная налоговая инспекция", "State tax inspectorate", True),
    ("bandlik", "Bandlik va mehnat inspeksiyasi", "Бандлик ва меҳнат инспекцияси", "Инспекция по труду и занятости", "Labor and employment inspectorate", True),
    ("raqobat", "Raqobat va iste'molchilar huquqlarini himoya qilish bo'limi", "Рақобат ва истеъмолчилар ҳуқуқларини ҳимоя қилиш бўлими", "Отдел по защите конкуренции и прав потребителей", "Competition & consumer protection", True),
    # --- 7. Mahalliy hokimiyat va mahalla ---
    ("hokimlik", "Tuman hokimligi", "Туман ҳокимлиги", "Хокимият района", "District administration", False),
    ("mfy", "Mahalla fuqarolar yig'ini (MFY)", "Маҳалла фуқаролар йиғини (МФЙ)", "Сход граждан махалли", "Mahalla citizens' assembly", False),
]

# Matritsada yo'q — nofaol qilinadi (mavjud murojaatlar tarixi buzilmasin
# uchun o'chirilmaydi, faqat `is_active=False`).
RETIRED_DEPARTMENTS = ["kommunal", "qishloq_xojaligi", "telekom", "huquq"]

# code, uz, oz, ru, en, icon, sla_hours, department_code
#
# v1.8 — kategoriya = tashkilot (1:1). Avval mavzuli kategoriyalar bor edi
# va bittasi bir nechta tashkilotni qamrardi: masalan «Yo'l va transport»
# ichida yo'l ta'miri, svetofor va avtobus grafigi — uchta turli mas'ul.
# LLM to'g'ri mavzuni tanlagan bilan murojaat noto'g'ri idoraga tushardi.
CATEGORIES = [
    # --- 1. Kommunal xizmatlar va uy-joy ---
    ("elektr", "Elektr ta'minoti", "Электр таъминоти", "Электроснабжение", "Electricity supply", "zap", 24, "elektr"),
    ("gaz", "Gaz ta'minoti", "Газ таъминоти", "Газоснабжение", "Gas supply", "flame", 12, "gaz"),
    ("suv_kanalizatsiya", "Suv va kanalizatsiya", "Сув ва канализация", "Вода и канализация", "Water & sewage", "droplet", 24, "suvsoz"),
    ("obodonlashtirish", "Obodonlashtirish va ko'cha yoritilishi", "Ободонлаштириш ва кўча ёритилиши", "Благоустройство и уличное освещение", "Landscaping & street lighting", "trees", 72, "obodonlashtirish"),
    ("chiqindi", "Chiqindi olib ketish", "Чиқинди олиб кетиш", "Вывоз мусора", "Waste collection", "trash-2", 48, "sanitariya"),
    ("uy_joy", "Ko'p qavatli uy va BHK", "Кўп қаватли уй ва БҲК", "Многоквартирный дом и УК", "Apartment buildings & management", "building-2", 72, "uyjoy"),
    # --- 2. Yo'l, transport va infratuzilma ---
    ("yol", "Yo'l qoplamasi va ko'priklar", "Йўл қопламаси ва кўприклар", "Дорожное покрытие и мосты", "Roads & bridges", "route", 72, "yolxojaligi"),
    ("yol_harakati", "Svetofor, yo'l belgilari va razmetka", "Светофор, йўл белгилари ва разметка", "Светофоры, знаки и разметка", "Traffic signals & signs", "traffic-cone", 24, "yhxx"),
    ("jamoat_transporti", "Jamoat transporti", "Жамоат транспорти", "Общественный транспорт", "Public transport", "bus", 72, "transport"),
    # --- 3. Ekologiya, yer va qurilish ---
    ("ekologiya", "Ekologiya", "Экология", "Экология", "Ecology", "leaf", 120, "ekologiya"),
    ("yer_kadastr", "Yer va kadastr", "Ер ва кадастр", "Земля и кадастр", "Land & cadastre", "map", 168, "kadastr"),
    ("qurilish", "Qurilish nazorati", "Қурилиш назорати", "Строительный надзор", "Construction supervision", "hard-hat", 168, "qurilish"),
    # --- 4. Ijtimoiy soha, sog'liq va ta'lim ---
    ("sogliqni_saqlash", "Sog'liqni saqlash", "Соғлиқни сақлаш", "Здравоохранение", "Healthcare", "heart-pulse", 48, "sogliqni_saqlash"),
    ("talim", "Ta'lim", "Таълим", "Образование", "Education", "graduation-cap", 72, "talim"),
    ("ijtimoiy_yordam", "Ijtimoiy yordam va nafaqa", "Ижтимоий ёрдам ва нафақа", "Социальная помощь и пособия", "Social assistance", "heart-handshake", 72, "ijtimoiy"),
    # --- 5. Jamoat tartibi, huquq va xavfsizlik ---
    ("jamoat_xavfsizlik", "Jamoat tartibi va xavfsizlik", "Жамоат тартиби ва хавфсизлик", "Общественный порядок и безопасность", "Public order & safety", "shield-alert", 24, "iib"),
    ("favqulodda", "Yong'in va favqulodda vaziyat", "Ёнғин ва фавқулодда вазият", "Пожары и ЧС", "Fire & emergencies", "flame-kindling", 12, "favqulodda"),
    ("ijro", "Sud qarori ijrosi va qarzdorlik", "Суд қарори ижроси ва қарздорлик", "Исполнение судебных решений", "Court enforcement & debts", "gavel", 120, "mib"),
    ("fhdyo_hujjatlar", "FHDYO guvohnomalari va davlat xizmatlari", "ФҲДЁ гувоҳномалари ва давлат хизматлари", "Свидетельства ЗАГС и госуслуги", "Civil registry & state services", "file-text", 120, "fhdyo"),
    # --- 6. Iqtisodiyot, soliq va mehnat ---
    ("soliq", "Soliq va tadbirkorlik", "Солиқ ва тадбиркорлик", "Налоги и предпринимательство", "Tax & business", "receipt", 168, "soliq"),
    ("mehnat", "Mehnat va ish haqi", "Меҳнат ва иш ҳақи", "Труд и заработная плата", "Labor & wages", "briefcase", 168, "bandlik"),
    ("isteomolchi", "Iste'molchi huquqlari va narxlar", "Истеъмолчи ҳуқуқлари ва нархлар", "Права потребителей и цены", "Consumer rights & prices", "shopping-cart", 120, "raqobat"),
    # --- 7. Mahalliy hokimiyat va mahalla ---
    ("hokimlik", "Hokimlik va kompleks masalalar", "Ҳокимлик ва комплекс масалалар", "Хокимият и комплексные вопросы", "Administration & complex issues", "landmark", 168, "hokimlik"),
    ("mahalla", "Mahalla masalalari", "Маҳалла масалалари", "Вопросы махалли", "Mahalla matters", "users", 120, "mfy"),
]

# Matritsada yo'q — nofaol qilinadi. Mavjud murojaatlar bu kategoriyalarga
# FK bilan bog'langan (117 ta), shuning uchun O'CHIRILMAYDI: tarix
# saqlanadi va admin panelda to'g'ri ko'rinadi, lekin `is_active=False`
# bo'lgani uchun LLM promptiga tushmaydi va yangi murojaat ularga
# yo'naltirilmaydi.
RETIRED_CATEGORIES = [
    "chiqindi_obodon", "yol_transport", "uy_kommunal", "qurilish_arxitektura",
    "soliq_moliya", "yongin_xavfsizligi", "bandlik_mehnat",
    "qishloq_xojaligi", "telekommunikatsiya", "huquqiy_masalalar",
    "taklif_tashabbus", "boshqa",
]

# DIQQAT: `settings` jadvali hozir FAQAT shu yerda yoziladi va kod uni
# hech qayerda O'QIMAYDI. Haqiqiy sozlamalar `app/config.py` (env) orqali
# keladi.
#
# `ai_low_confidence` shu ro'yxatdan olib tashlandi (v1.8): u bazada 0.6
# bo'lib turardi, `config.py` da esa boshqa qiymat — chegarani sozlamoqchi
# bo'lgan odam tabiiy ravishda bazadagi aynan shu nomli kalitni o'zgartirib,
# hech narsa o'zgarmaganini ko'rardi. Ikki manba, biri o'lik — eng yomon
# holat. Chegara faqat `AI_LOW_CONFIDENCE` env orqali sozlanadi.
# Kategoriya chegara izohlari — LLM promptiga uzatiladi (M15, docs/07 §1.1).
#
# Faqat CHEGARASI chalkash kategoriyalar uchun yoziladi: izohning vazifasi
# nomni takrorlash emas, «bu menikimi yoki qo'shnimnikimi» degan savolga
# javob berish. Nomi o'z-o'zidan aniq bo'lganlar (masalan `talim`,
# `fhdyo_hujjatlar`) izohsiz qoladi — ortiqcha matn promptni suyultiradi.
#
# Yozish uslubi: «NIMA kiradi; NIMA kirmaydi -> qaysi kodga».
CATEGORY_DESCRIPTIONS = {
    # --- 1. Kommunal xizmatlar va uy-joy ---
    "elektr": (
        "Elektr ta'minoti: svet o'chishi, kuchlanish pasayishi, transformator "
        "nosozligi/portlashi, yuqori kuchlanishli sim uzilishi, hisoblagich va "
        "billing. MAHALLA ICHIDAGI ko'chalar va uylardagi yoritish ham SHU "
        "YERGA kiradi — «ko'chamizda / mahallamizda / uyimizda svet yo'q» "
        "deyilsa shu kod. Faqat mashina yuradigan katta ko'cha va yo'l "
        "bo'ylaridagi yoritish -> obodonlashtirish."
    ),
    "gaz": (
        "Tabiiy gaz ta'minoti: gaz o'chishi, bosim pasayishi, quvurdan sizish "
        "(gaz hidi — hayot uchun xavf, priority critical), ballon yetkazib "
        "berish grafigi, hisoblagich va billing."
    ),
    "suv_kanalizatsiya": (
        "Ichimlik suvi o'chishi yoki bosim pasayishi, ko'chada suv quvuri "
        "yorilishi, kanalizatsiya tiqilishi va oqishi, lyuk ochiq qolishi, suv "
        "sifati (loyqa yoki hidli kelishi)."
    ),
    "obodonlashtirish": (
        "MASHINA YURADIGAN KATTA KO'CHA va yo'l bo'ylaridagi yoritish "
        "(ustunlar, tungi yoritish), markaziy ko'chalarni supurish va tozalash, "
        "ariq va kollektorlarni tozalash, ko'cha-park daraxtlarini butash, "
        "skameyka va maydonchalar. Mahalla ichidagi ko'cha yoki uy yoritishi "
        "bu yerga KIRMAYDI -> elektr."
    ),
    "chiqindi": (
        "Maishiy chiqindi (musor) olib ketish grafigi buzilishi, konteyner "
        "yo'qligi yoki to'lib ketishi, chiqindi xizmati uchun nohaq qarzdorlik "
        "yozilishi. Noqonuniy chiqindixona yoki sanoat chiqindisi -> ekologiya."
    ),
    "uy_joy": (
        "Ko'p qavatli uy (dom): tom oqishi, podval suvga to'lishi, lift "
        "nosozligi va xavfsizligi, boshqaruv kompaniyasi (BHK/Shirkat) "
        "noqonuniy harakati, noqonuniy qayta rejalashtirish. Muammo faqat "
        "suv/gaz/elektr TA'MINOTIDA bo'lsa -> mos ta'minot kodi."
    ),
    # --- 2. Yo'l, transport va infratuzilma ---
    "yol": (
        "Yo'l QOPLAMASI: ko'chadagi chuqur (yama), asfalt buzilishi, yo'l "
        "ta'miri, trotuar qurish, ko'prik texnik holati. Svetofor va yo'l "
        "belgisi bu yerga KIRMAYDI -> yol_harakati."
    ),
    "yol_harakati": (
        "Yo'l harakati JIHOZLARI: svetofor nosozligi yoki o'chib qolishi, yo'l "
        "belgisi (znak) yo'qligi yoki ko'rinmasligi, razmetka (yo'l chizig'i) "
        "o'chib ketgani, yo'l kamerasi va radar nosozligi."
    ),
    "jamoat_transporti": (
        "Avtobus va marshrutka intervali va grafigi buzilishi, bekat holati va "
        "noqonuniy egallanishi, yo'l haqi oshirib olinishi, kirakashlik."
    ),
    # --- 3. Ekologiya, yer va qurilish ---
    "ekologiya": (
        "Daraxtlarni noqonuniy kesish (moratoriy buzilishi), korxona havoga "
        "tutun yoki zaharli gaz chiqarishi, noqonuniy chiqindixona hosil "
        "bo'lishi, daryo va ariqqa oqova/zaharli modda oqizilishi. Oddiy "
        "maishiy chiqindi -> chiqindi."
    ),
    "yer_kadastr": (
        "Yer uchastkasi chegarasi nizolari, ko'chmas mulkni ro'yxatga olish va "
        "texnik pasport berishdagi uzilishlar, yerni noqonuniy egallab olish "
        "(yo'lga yoki umumiy yerga kirib olish)."
    ),
    "qurilish": (
        "Noqonuniy qurilish (ruxsatnomasiz uy yoki obyekt), qurilish "
        "maydonida xavfsizlik va sanitariya qoidalari buzilishi, qo'shni "
        "xonadonga zarar yetkazib qurilish."
    ),
    # --- 4. Ijtimoiy soha, sog'liq va ta'lim ---
    "sogliqni_saqlash": (
        "Poliklinika va shifoxonada tibbiy xizmat sifati, shifokor qo'polligi, "
        "bepul/imtiyozli dori berilmasligi, tez yordam (103) kechikishi. "
        "Sanepid: oziq-ovqat zaharlanishi va obyektlar sanitariyasi."
    ),
    "talim": (
        "Maktab va bog'chadagi noqonuniy pul yig'imlari (fond), ta'lim sifati, "
        "o'qituvchi va tarbiyachi xatti-harakati, maktab-bog'cha isitish "
        "tizimi va moddiy-texnik ahvoli."
    ),
    "ijtimoiy_yordam": (
        "Ijtimoiy daftarlar (Ayollar, Yoshlar, Temir daftar) bo'yicha yordam, "
        "bolalar nafaqasi va moddiy yordam tayinlanishi yoki to'lanishi, "
        "nogironlikni belgilash (TMEK) va reabilitatsiya vositalari."
    ),
    # --- 5. Jamoat tartibi, huquq va xavfsizlik ---
    "jamoat_xavfsizlik": (
        "Jamoat tartibi buzilishi, tunda shovqin, mushtlashuv, o'g'rilik, "
        "shaxsiy xavfsizlikka tahdid; mahalla profilaktika inspektori "
        "harakatsizligi. HUJJATLARDAN faqat pasport, ID-karta, propiska va "
        "migratsiya shu yerda. Tug'ilish/nikoh/o'lim guvohnomasi va ism "
        "o'zgartirish bu yerga KIRMAYDI -> fhdyo_hujjatlar. Agar muammo "
        "TEXNIK nosozlik bo'lib, xavf o'sha nosozlikdan kelib chiqsa "
        "(masalan yoritish yo'qligi tufayli qorong'ilik) — asosiy kod o'sha "
        "nosozlik bo'ladi, bu esa ikkilamchi."
    ),
    "fhdyo_hujjatlar": (
        "FHDYO (ZAGS) va Adliya: tug'ilish, nikoh, nikohdan ajralish va o'lim "
        "holatlarini davlat ro'yxatidan o'tkazish; guvohnoma va uning takroriy "
        "dublikatini berish; otalikni belgilash, farzandlikka olish; ism, "
        "familiya yoki otasining ismini o'zgartirish; Davlat xizmatlari "
        "markazi (DXM) va e-xizmatlar bo'yicha e'tirozlar. Pasport, ID-karta "
        "va propiska bu yerga KIRMAYDI -> jamoat_xavfsizlik."
    ),
    "favqulodda": (
        "Yong'in xavfi va sodir bo'lgan yong'inlar, tabiiy va texnogen xavflar "
        "(sel, ko'chki, daraxt yoki ustun ag'darilishi), bino va inshootning "
        "yong'in xavfsizligi qoidalariga mos kelmasligi."
    ),
    "ijro": (
        "Sud qarori ijrosi: aliment va qarzdorlik undirish, kommunal qarz "
        "bo'yicha asossiz taqiq (zapret) qo'yilishi, ijro byurosi "
        "inspektorlarining noqonuniy harakatlari."
    ),
    # --- 6. Iqtisodiyot, soliq va mehnat ---
    "soliq": (
        "Xarid cheki (QR-chek) berilmasligi, noqonuniy tadbirkorlik, mol-mulk "
        "va yer solig'i bo'yicha noto'g'ri hisob-kitob, E-ijara (ijara "
        "shartnomasini ro'yxatdan o'tkazish)."
    ),
    "mehnat": (
        "Ish haqini o'z vaqtida bermaslik, noqonuniy ishdan bo'shatish, mehnat "
        "shartnomasisiz ishlatish (norasmiy bandlik), ish o'rnida xavfsizlik "
        "texnikasi buzilishi."
    ),
    "isteomolchi": (
        "Sifatsiz mahsulot sotilishi va qaytarib olinmasligi, narxni sun'iy "
        "oshirish, tarozidan urish va aldash, yolg'on yoki chalg'ituvchi "
        "reklama."
    ),
    # --- 7. Mahalliy hokimiyat va mahalla ---
    "hokimlik": (
        "Yuqoridagi HECH QAYSI tashkilotga aniq tushmaydigan kompleks "
        "muammolar; tuman infratuzilmasini rivojlantirish va investitsiya "
        "masalalari; sektor rahbarlari (1-4 sektor) faoliyatiga shikoyat. "
        "Ikkilanayotgan bo'lsang avval aniq tashkilotni izla — bu kod oxirgi "
        "chora."
    ),
    "mahalla": (
        "Mahallalararo kichik nizolar va oilaviy kelishmovchiliklar; hokim "
        "yordamchisi (imtiyozli kredit, kasbga o'qitish), yoshlar yetakchisi "
        "va xotin-qizlar faoli faoliyatiga oid masalalar."
    ),
}

DEFAULT_SETTINGS = {
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
            # Nom va faollik mavjud yozuvga ham qayta yoziladi: matritsa
            # rasmiy tashkilot nomlarini beradi (masalan «Yo'l xo'jaligi
            # boshqarmasi» -> «Avtomobil yo'llari qo'mitasi»), va katalog
            # manbasi shu fayl — kategoriyalarda ham xuddi shunday (docs/14).
            department.names = {"uz": name_uz, "oz": name_oz, "ru": name_ru, "en": name_en}
            department.is_external = is_external
            department.is_active = True
            departments_by_code[code] = department

        # Matritsadan chiqqanlar nofaol qilinadi, O'CHIRILMAYDI: ularga
        # bog'langan murojaatlar, xodimlar va tarix saqlanishi kerak.
        retired_depts = (
            db.query(Department).filter(Department.code.in_(RETIRED_DEPARTMENTS)).all()
        )
        for department in retired_depts:
            department.is_active = False
        print(
            f"Departments ready: {len(departments_by_code)} "
            f"({len(retired_depts)} ta nofaol qilindi)"
        )

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
            # Katalog maydonlari MAVJUD kategoriyalarga ham qayta yoziladi.
            #
            # Avval faqat yaratishda qo'yilardi va v1.8 qayta qurishida shu
            # bilinib qoldi: `elektr` kodi eskidan bor edi, shuning uchun
            # nomi «Elektr energiyasi» bo'lib qolgan, matritsa esa «Elektr
            # ta'minoti» deydi — kod yangi taksonomiyada, ko'rinish eskisida.
            #
            # Ya'ni bu jadval seed'ga tegishli KATALOG: kod, nom, ikon, SLA,
            # bo'lim va izoh manbasi shu fayl. Admin UI'dagi tahrir keyingi
            # `python -m app.seed` da qayta yoziladi — operatsion tuzatish
            # uchun emas, katalogni o'zgartirish uchun shu yer tahrirlanadi
            # (docs/14).
            category.names = {"uz": name_uz, "oz": name_oz, "ru": name_ru, "en": name_en}
            category.icon = icon
            category.sla_hours = sla_hours
            category.sort_order = order
            category.descriptions = (
                {"uz": CATEGORY_DESCRIPTIONS[code]} if code in CATEGORY_DESCRIPTIONS else None
            )
            # Mavjud kategoriya bo'lim biriktiruvi ham yangilanadi: v1.8 da
            # bir nechta kategoriya boshqa tashkilotga o'tdi (masalan
            # `chiqindi` endi «Toza hudud» ga, `obodonlashtirish` alohida).
            category.department_id = departments_by_code[dept_code].id
            category.is_active = True
            categories_by_code[code] = category

        retired_cats = db.query(Category).filter(Category.code.in_(RETIRED_CATEGORIES)).all()
        for category in retired_cats:
            category.is_active = False
        print(
            f"Categories ready: {len(categories_by_code)} "
            f"({len(CATEGORY_DESCRIPTIONS)} tasida LLM izohi, "
            f"{len(retired_cats)} ta nofaol qilindi)"
        )

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
