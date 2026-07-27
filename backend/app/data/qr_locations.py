"""Navoiy viloyati: tuman -> MFY -> ko'cha ma'lumotlari (QR plakatlari uchun).

Frontend'dagi `frontend/src/lib/qrLocations.ts` bilan mosligini saqlash
uchun har bir o'zgarishdan keyin ikkala fayl ham yangilansin.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class MfyInfo:
    name: str
    streets: list[str]


@dataclass(frozen=True)
class DistrictInfo:
    name: str
    mfys: list[MfyInfo]


QR_DISTRICTS: list[DistrictInfo] = [
    DistrictInfo(
        name="Navoiy shahri",
        mfys=[
            MfyInfo("Guliston", ["Tarbiyachi", "G'alaba", "Navoiy", "Zarafshon"]),
            MfyInfo("Kimyogar", ["Kimyogarlar", "Mirzo Ulug'bek", "Me'morlar"]),
            MfyInfo("Tinchlik", ["Tinchlik", "Toshkent", "Do'stlik"]),
            MfyInfo("Farhod", ["Farhod", "Energetiklar", "Sanoat"]),
            MfyInfo("Alisher Navoiy", ["Sadriddin Ayni", "Ibn Sino", "Mahmud Tarobi"]),
            MfyInfo("G'oliblar", ["G'oliblar", "Mustaqillik", "Bobur"]),
            MfyInfo("Yoshlik", ["Yoshlik", "Sportchilar", "Ma'rifat"]),
            MfyInfo("Taraqqiyot", ["Taraqqiyot", "Tinchlik", "Yoshlar"]),
            MfyInfo("Bunyodkor", ["Amir Temur", "Mustaqillik", "Bunyodkor"]),
            MfyInfo("Cho'ponota", ["Cho'ponota", "Nuroniylar", "Dehqon"]),
            MfyInfo("Ma'rifat", ["Ma'rifat", "Zarafshon", "Kamolot"]),
            MfyInfo("Zarafshon", ["Zarafshon", "Obod yurt", "Do'stlik"]),
        ],
    ),
    DistrictInfo(
        name="Zarafshon shahri",
        mfys=[
            MfyInfo("Oltin vadiy", ["Oltin vadiy", "Konchilar", "Geologlar"]),
            MfyInfo("Bahor", ["Bahor", "Yoshlik", "Do'stlik"]),
            MfyInfo("Konchilar", ["Konchilar", "Mustaqillik", "Saodat"]),
            MfyInfo("Quyoshli", ["Quyoshli", "Nurobod", "Quyosh"]),
            MfyInfo("Sug'diyona", ["Sug'diyona", "Zarafshon", "Shodlik"]),
            MfyInfo("Quruvchi", ["Quruvchilar", "Me'mor", "Toshkent"]),
            MfyInfo("Yulduz", ["Yulduz", "Navoiy", "Zarafshon"]),
            MfyInfo("Tinchlik", ["Tinchlik", "Tinchlik shossesi", "Istiqlol"]),
        ],
    ),
    DistrictInfo(
        name="Karmana tumani",
        mfys=[
            MfyInfo("Karmana", ["Navoiy", "Alisher Navoiy", "Toshkent", "Karmana"]),
            MfyInfo("Jaloyir", ["Jaloyir", "Dehqon", "Ariqbo'yi"]),
            MfyInfo("Uyrot", ["Uyrot", "Markaziy", "Bog'ishamol"]),
            MfyInfo("Malikrabot", ["Malikrabot", "Aeroport", "Toshkent shossesi"]),
            MfyInfo("Toshmachit", ["Toshmachit", "Buyuk Ipak Yoli", "Guzar"]),
            MfyInfo("Shibzon", ["Shibzon", "Gulzor", "Bo'ston"]),
            MfyInfo("Varq", ["Varq", "Bog'bon", "Chashma"]),
            MfyInfo("G'ozg'on", ["Mermer", "G'ozg'on", "Navoiy"]),
            MfyInfo("Yangiobod", ["Yangiobod", "Do'stlik", "Yoshlar"]),
            MfyInfo("Arabxona", ["Arabxona", "Chorbog'", "Ariqbo'yi"]),
            MfyInfo("Narvaz", ["Narvaz", "Obod", "Mustaqillik"]),
        ],
    ),
    DistrictInfo(
        name="Qiziltepa tumani",
        mfys=[
            MfyInfo("Qiziltepa", ["Mustaqillik", "Qiziltepa", "Navoiy"]),
            MfyInfo("Vangazi", ["Vangazi", "Ziyo", "Buxoro"]),
            MfyInfo("Bo'ston", ["Bo'ston", "Chorbog'", "Guliston"]),
            MfyInfo("Zarmetan", ["Zarmetan", "Saodat", "Obod"]),
            MfyInfo("Arabon", ["Arabon", "Dehqon", "Guzar"]),
            MfyInfo("Oqsoch", ["Oqsoch", "Nurli yolt", "Shodlik"]),
            MfyInfo("Uzun", ["Uzun", "Chashma", "Taraqqiyot"]),
            MfyInfo("Toshrabot", ["Toshrabot", "Karavan", "Markaziy"]),
            MfyInfo("Gardon", ["Gardon", "Chorbog'", "Terakzor me'moriy"]),
            MfyInfo("Madaniyat", ["Madaniyat", "Ma'rifat", "Yoshlik"]),
        ],
    ),
    DistrictInfo(
        name="Xatirchi tumani",
        mfys=[
            MfyInfo("Yangirabod", ["Yangirabod", "Samarkand", "Navoiy"]),
            MfyInfo("Qorasaroy", ["Qorasaroy", "Obod", "Dehqon"]),
            MfyInfo("Langar", ["Langar", "Tog'li", "Chashma"]),
            MfyInfo("Qo'shchinor", ["Qo'shchinor", "Chinor", "Bog'bon"]),
            MfyInfo("Oltintepa", ["Oltintepa", "Zarafshon", "Nurli"]),
            MfyInfo("Polis", ["Polis", "Guzar", "Tinchlik"]),
            MfyInfo("Zarafshon", ["Zarafshon", "Daryobo'yi", "Obod"]),
            MfyInfo("Galabek", ["Galabek", "Yoshlik", "Taraqqiyot"]),
            MfyInfo("Qo'rg'on", ["Qo'rg'on", "Qadimiy", "Navoiy"]),
        ],
    ),
    DistrictInfo(
        name="Nurota tumani",
        mfys=[
            MfyInfo("Nurota", ["Chashma", "Nurota", "Mustaqillik", "A.Navoiy"]),
            MfyInfo("Chashma", ["Chashma", "Ziyorat", "Qadimiy Nurota"]),
            MfyInfo("Temirqovuq", ["Temirqovuq", "Tog'li", "Buloq"]),
            MfyInfo("Chuya", ["Chuya", "Obod", "Dehqon"]),
            MfyInfo("Sentob", ["Sentob", "Sayyohlar", "Chashma"]),
            MfyInfo("Dehibaland", ["Dehibaland", "Bog'ishamol", "Yuksak"]),
            MfyInfo("Qizilcha", ["Qizilcha", "Cho'l", "Kenglik"]),
            MfyInfo("Yangibino", ["Yangibino", "Bino", "Quruvchilar"]),
        ],
    ),
    DistrictInfo(
        name="Konimex tumani",
        mfys=[
            MfyInfo("Konimex", ["Konimex", "Mustaqillik", "Do'stlik"]),
            MfyInfo("Utegen", ["Utegen", "Cho'lli", "Zarafshon"]),
            MfyInfo("Shohturdi", ["Shohturdi", "Abad", "Yerkebulan"]),
            MfyInfo("Karakata", ["Karakata", "Cho'l", "Qumli"]),
            MfyInfo("Sarjal", ["Sarjal", "Kenglik", "Obod"]),
            MfyInfo("Baltaqora", ["Baltaqora", "Dehqon", "Sahro"]),
            MfyInfo("Qarakota", ["Qarakota", "Birlik", "Tinchlik"]),
        ],
    ),
    DistrictInfo(
        name="Uchquduq tumani",
        mfys=[
            MfyInfo("Uchquduq", ["Uchquduq", "Konchilar", "A.Navoiy"]),
            MfyInfo("Shalxar", ["Shalxar", "Geologlar", "Tinchlik"]),
            MfyInfo("Altintau", ["Altintau", "Sahro", "Nurli"]),
            MfyInfo("Uzunkuyu", ["Uzunkuyu", "Buloq", "Kenglik"]),
            MfyInfo("Mingbuloq", ["Mingbuloq", "Chashma", "Cho'l"]),
            MfyInfo("Avtochi", ["Avtochilar", "Sanoat", "Yulchilar"]),
        ],
    ),
    DistrictInfo(
        name="Tomdi tumani",
        mfys=[
            MfyInfo("Tomdibuloq", ["Tomdibuloq", "Mustaqillik", "Dostlik"]),
            MfyInfo("Suketti", ["Suketti", "Kenglik", "Sahro"]),
            MfyInfo("Keregetau", ["Keregetau", "Tog'li", "Obod"]),
            MfyInfo("Aqtog'ay", ["Aqtog'ay", "Oq-tosh", "Chashma"]),
            MfyInfo("Shiyeli", ["Shiyeli", "Dehqon", "Birlik"]),
        ],
    ),
    DistrictInfo(
        name="Navbahor tumani",
        mfys=[
            MfyInfo("Beshrabot", ["Beshrabot", "Navoiy", "Samarqand shossesi"]),
            MfyInfo("Olchin", ["Olchin", "Bog'bon", "Do'stlik"]),
            MfyInfo("Saroy", ["Saroy", "Dehqon", "Guzar"]),
            MfyInfo("Keshtali", ["Keshtali", "Guliston", "Taraqqiyot"]),
            MfyInfo("Qal'ai Mirishkor", ["Mirishkor", "Qal'a", "Yuksak"]),
            MfyInfo("Arabxona", ["Arabxona", "Obod", "Mustaqillik"]),
        ],
    ),
]

# Tashkilotlar va ularning telefon raqamlari (QR plakatidagi jadval uchun).
# Haqiqiy raqamlar ma'lum bo'lganda shu yerdan yangilansin.
QR_ORGANIZATION_PHONES: list[dict[str, str]] = [
    {"name": "Sanitariya tozalash xizmati", "phone": "+998 79 123 45 01"},
    {"name": "Yo'l xo'jaligi boshqarmasi", "phone": "+998 79 123 45 02"},
    {"name": "Yo'lovchi transporti boshqarmasi", "phone": "+998 79 123 45 03"},
    {"name": "Elektr tarmoqlari korxonasi", "phone": "+998 79 123 45 04"},
    {"name": "Hududgaz ta'minoti xizmati", "phone": "+998 79 123 45 05"},
    {"name": "Suvsoz (suv ta'minoti) korxonasi", "phone": "+998 79 123 45 06"},
    {"name": "Kommunal xo'jalik boshqarmasi", "phone": "+998 79 123 45 07"},
    {"name": "Obodonlashtirish boshqarmasi", "phone": "+998 79 123 45 08"},
    {"name": "Ekologiya va atrof-muhitni muhofaza qilish qo'mitasi", "phone": "+998 79 123 45 09"},
    {"name": "Davlat arxitektura-qurilish nazorati inspeksiyasi", "phone": "+998 79 123 45 10"},
    {"name": "Kadastr xizmati", "phone": "+998 79 123 45 11"},
    {"name": "Davlat soliq inspeksiyasi", "phone": "+998 79 123 45 12"},
    {"name": "Ijtimoiy himoya bo'limi", "phone": "+998 79 123 45 13"},
    {"name": "Tuman hokimligi murojaatlar bo'limi", "phone": "+998 79 123 45 14"},
    {"name": "Ichki ishlar bo'limi", "phone": "+998 79 123 45 15"},
    {"name": "Favqulodda vaziyatlar boshqarmasi", "phone": "+998 79 123 45 16"},
    {"name": "Sog'liqni saqlash boshqarmasi", "phone": "+998 79 123 45 17"},
    {"name": "Xalq ta'limi boshqarmasi", "phone": "+998 79 123 45 18"},
    {"name": "Bandlikka ko'maklashish markazi", "phone": "+998 79 123 45 19"},
    {"name": "FHDYO va hujjatlar bo'limi", "phone": "+998 79 123 45 20"},
    {"name": "Qishloq xo'jaligi bo'limi", "phone": "+998 79 123 45 21"},
    {"name": "Aloqa va axborotlashtirish bo'limi", "phone": "+998 79 123 45 22"},
    {"name": "Yuridik bo'lim", "phone": "+998 79 123 45 23"},
]


def district_names() -> list[str]:
    return [d.name for d in QR_DISTRICTS]


def mfy_names(district_name: str) -> list[str]:
    for d in QR_DISTRICTS:
        if d.name == district_name:
            return [m.name for m in d.mfys]
    return []


def street_names(district_name: str, mfy_name: str) -> list[str]:
    for d in QR_DISTRICTS:
        if d.name != district_name:
            continue
        for m in d.mfys:
            if m.name == mfy_name:
                return list(m.streets)
    return []
