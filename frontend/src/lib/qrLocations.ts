// Navoiy viloyati: tuman -> MFY -> ko'cha ma'lumotlari (QR plakatlari uchun).
// Backend bilan mosligini saqlash uchun har bir o'zgarishdan keyin
// backend/app/data/qr_locations.py ham yangilansin.

export interface StreetInfo {
  name: string;
}

export interface MfyInfo {
  name: string;
  streets: string[];
}

export interface DistrictInfo {
  name: string;
  mfys: MfyInfo[];
}

export const QR_DISTRICTS: DistrictInfo[] = [
  {
    name: "Navoiy shahri",
    mfys: [
      { name: "Guliston", streets: ["Tarbiyachi", "G'alaba", "Navoiy", "Zarafshon"] },
      { name: "Kimyogar", streets: ["Kimyogarlar", "Mirzo Ulug'bek", "Me'morlar"] },
      { name: "Tinchlik", streets: ["Tinchlik", "Toshkent", "Do'stlik"] },
      { name: "Farhod", streets: ["Farhod", "Energetiklar", "Sanoat"] },
      { name: "Alisher Navoiy", streets: ["Sadriddin Ayni", "Ibn Sino", "Mahmud Tarobi"] },
      { name: "G'oliblar", streets: ["G'oliblar", "Mustaqillik", "Bobur"] },
      { name: "Yoshlik", streets: ["Yoshlik", "Sportchilar", "Ma'rifat"] },
      { name: "Taraqqiyot", streets: ["Taraqqiyot", "Tinchlik", "Yoshlar"] },
      { name: "Bunyodkor", streets: ["Amir Temur", "Mustaqillik", "Bunyodkor"] },
      { name: "Cho'ponota", streets: ["Cho'ponota", "Nuroniylar", "Dehqon"] },
      { name: "Ma'rifat", streets: ["Ma'rifat", "Zarafshon", "Kamolot"] },
      { name: "Zarafshon", streets: ["Zarafshon", "Obod yurt", "Do'stlik"] },
    ],
  },
  {
    name: "Zarafshon shahri",
    mfys: [
      { name: "Oltin vadiy", streets: ["Oltin vadiy", "Konchilar", "Geologlar"] },
      { name: "Bahor", streets: ["Bahor", "Yoshlik", "Do'stlik"] },
      { name: "Konchilar", streets: ["Konchilar", "Mustaqillik", "Saodat"] },
      { name: "Quyoshli", streets: ["Quyoshli", "Nurobod", "Quyosh"] },
      { name: "Sug'diyona", streets: ["Sug'diyona", "Zarafshon", "Shodlik"] },
      { name: "Quruvchi", streets: ["Quruvchilar", "Me'mor", "Toshkent"] },
      { name: "Yulduz", streets: ["Yulduz", "Navoiy", "Zarafshon"] },
      { name: "Tinchlik", streets: ["Tinchlik", "Tinchlik shossesi", "Istiqlol"] },
    ],
  },
  {
    name: "Karmana tumani",
    mfys: [
      { name: "Karmana", streets: ["Navoiy", "Alisher Navoiy", "Toshkent", "Karmana"] },
      { name: "Jaloyir", streets: ["Jaloyir", "Dehqon", "Ariqbo'yi"] },
      { name: "Uyrot", streets: ["Uyrot", "Markaziy", "Bog'ishamol"] },
      { name: "Malikrabot", streets: ["Malikrabot", "Aeroport", "Toshkent shossesi"] },
      { name: "Toshmachit", streets: ["Toshmachit", "Buyuk Ipak Yoli", "Guzar"] },
      { name: "Shibzon", streets: ["Shibzon", "Gulzor", "Bo'ston"] },
      { name: "Varq", streets: ["Varq", "Bog'bon", "Chashma"] },
      { name: "G'ozg'on", streets: ["Mermer", "G'ozg'on", "Navoiy"] },
      { name: "Yangiobod", streets: ["Yangiobod", "Do'stlik", "Yoshlar"] },
      { name: "Arabxona", streets: ["Arabxona", "Chorbog'", "Ariqbo'yi"] },
      { name: "Narvaz", streets: ["Narvaz", "Obod", "Mustaqillik"] },
    ],
  },
  {
    name: "Qiziltepa tumani",
    mfys: [
      { name: "Qiziltepa", streets: ["Mustaqillik", "Qiziltepa", "Navoiy"] },
      { name: "Vangazi", streets: ["Vangazi", "Ziyo", "Buxoro"] },
      { name: "Bo'ston", streets: ["Bo'ston", "Chorbog'", "Guliston"] },
      { name: "Zarmetan", streets: ["Zarmetan", "Saodat", "Obod"] },
      { name: "Arabon", streets: ["Arabon", "Dehqon", "Guzar"] },
      { name: "Oqsoch", streets: ["Oqsoch", "Nurli yolt", "Shodlik"] },
      { name: "Uzun", streets: ["Uzun", "Chashma", "Taraqqiyot"] },
      { name: "Toshrabot", streets: ["Toshrabot", "Karavan", "Markaziy"] },
      { name: "Gardon", streets: ["Gardon", "Chorbog'", "Terakzor me'moriy"] },
      { name: "Madaniyat", streets: ["Madaniyat", "Ma'rifat", "Yoshlik"] },
    ],
  },
  {
    name: "Xatirchi tumani",
    mfys: [
      { name: "Yangirabod", streets: ["Yangirabod", "Samarkand", "Navoiy"] },
      { name: "Qorasaroy", streets: ["Qorasaroy", "Obod", "Dehqon"] },
      { name: "Langar", streets: ["Langar", "Tog'li", "Chashma"] },
      { name: "Qo'shchinor", streets: ["Qo'shchinor", "Chinor", "Bog'bon"] },
      { name: "Oltintepa", streets: ["Oltintepa", "Zarafshon", "Nurli"] },
      { name: "Polis", streets: ["Polis", "Guzar", "Tinchlik"] },
      { name: "Zarafshon", streets: ["Zarafshon", "Daryobo'yi", "Obod"] },
      { name: "Galabek", streets: ["Galabek", "Yoshlik", "Taraqqiyot"] },
      { name: "Qo'rg'on", streets: ["Qo'rg'on", "Qadimiy", "Navoiy"] },
    ],
  },
  {
    name: "Nurota tumani",
    mfys: [
      { name: "Nurota", streets: ["Chashma", "Nurota", "Mustaqillik", "A.Navoiy"] },
      { name: "Chashma", streets: ["Chashma", "Ziyorat", "Qadimiy Nurota"] },
      { name: "Temirqovuq", streets: ["Temirqovuq", "Tog'li", "Buloq"] },
      { name: "Chuya", streets: ["Chuya", "Obod", "Dehqon"] },
      { name: "Sentob", streets: ["Sentob", "Sayyohlar", "Chashma"] },
      { name: "Dehibaland", streets: ["Dehibaland", "Bog'ishamol", "Yuksak"] },
      { name: "Qizilcha", streets: ["Qizilcha", "Cho'l", "Kenglik"] },
      { name: "Yangibino", streets: ["Yangibino", "Bino", "Quruvchilar"] },
    ],
  },
  {
    name: "Konimex tumani",
    mfys: [
      { name: "Konimex", streets: ["Konimex", "Mustaqillik", "Do'stlik"] },
      { name: "Utegen", streets: ["Utegen", "Cho'lli", "Zarafshon"] },
      { name: "Shohturdi", streets: ["Shohturdi", "Abad", "Yerkebulan"] },
      { name: "Karakata", streets: ["Karakata", "Cho'l", "Qumli"] },
      { name: "Sarjal", streets: ["Sarjal", "Kenglik", "Obod"] },
      { name: "Baltaqora", streets: ["Baltaqora", "Dehqon", "Sahro"] },
      { name: "Qarakota", streets: ["Qarakota", "Birlik", "Tinchlik"] },
    ],
  },
  {
    name: "Uchquduq tumani",
    mfys: [
      { name: "Uchquduq", streets: ["Uchquduq", "Konchilar", "A.Navoiy"] },
      { name: "Shalxar", streets: ["Shalxar", "Geologlar", "Tinchlik"] },
      { name: "Altintau", streets: ["Altintau", "Sahro", "Nurli"] },
      { name: "Uzunkuyu", streets: ["Uzunkuyu", "Buloq", "Kenglik"] },
      { name: "Mingbuloq", streets: ["Mingbuloq", "Chashma", "Cho'l"] },
      { name: "Avtochi", streets: ["Avtochilar", "Sanoat", "Yulchilar"] },
    ],
  },
  {
    name: "Tomdi tumani",
    mfys: [
      { name: "Tomdibuloq", streets: ["Tomdibuloq", "Mustaqillik", "Dostlik"] },
      { name: "Suketti", streets: ["Suketti", "Kenglik", "Sahro"] },
      { name: "Keregetau", streets: ["Keregetau", "Tog'li", "Obod"] },
      { name: "Aqtog'ay", streets: ["Aqtog'ay", "Oq-tosh", "Chashma"] },
      { name: "Shiyeli", streets: ["Shiyeli", "Dehqon", "Birlik"] },
    ],
  },
  {
    name: "Navbahor tumani",
    mfys: [
      { name: "Beshrabot", streets: ["Beshrabot", "Navoiy", "Samarqand shossesi"] },
      { name: "Olchin", streets: ["Olchin", "Bog'bon", "Do'stlik"] },
      { name: "Saroy", streets: ["Saroy", "Dehqon", "Guzar"] },
      { name: "Keshtali", streets: ["Keshtali", "Guliston", "Taraqqiyot"] },
      { name: "Qal'ai Mirishkor", streets: ["Mirishkor", "Qal'a", "Yuksak"] },
      { name: "Arabxona", streets: ["Arabxona", "Obod", "Mustaqillik"] },
    ],
  },
];

// Tashkilotlar va ularning telefon raqamlari (QR plakatidagi jadval uchun).
// Haqiqiy raqamlar ma'lum bo'lganda shu yerdan yangilansin.
export const QR_ORGANIZATION_PHONES: { name: string; phone: string }[] = [
  { name: "Sanitariya tozalash xizmati", phone: "+998 79 123 45 01" },
  { name: "Yo'l xo'jaligi boshqarmasi", phone: "+998 79 123 45 02" },
  { name: "Yo'lovchi transporti boshqarmasi", phone: "+998 79 123 45 03" },
  { name: "Elektr tarmoqlari korxonasi", phone: "+998 79 123 45 04" },
  { name: "Hududgaz ta'minoti xizmati", phone: "+998 79 123 45 05" },
  { name: "Suvsoz (suv ta'minoti) korxonasi", phone: "+998 79 123 45 06" },
  { name: "Kommunal xo'jalik boshqarmasi", phone: "+998 79 123 45 07" },
  { name: "Obodonlashtirish boshqarmasi", phone: "+998 79 123 45 08" },
  { name: "Ekologiya va atrof-muhitni muhofaza qilish qo'mitasi", phone: "+998 79 123 45 09" },
  { name: "Davlat arxitektura-qurilish nazorati inspeksiyasi", phone: "+998 79 123 45 10" },
  { name: "Kadastr xizmati", phone: "+998 79 123 45 11" },
  { name: "Davlat soliq inspeksiyasi", phone: "+998 79 123 45 12" },
  { name: "Ijtimoiy himoya bo'limi", phone: "+998 79 123 45 13" },
  { name: "Tuman hokimligi murojaatlar bo'limi", phone: "+998 79 123 45 14" },
  { name: "Ichki ishlar bo'limi", phone: "+998 79 123 45 15" },
  { name: "Favqulodda vaziyatlar boshqarmasi", phone: "+998 79 123 45 16" },
  { name: "Sog'liqni saqlash boshqarmasi", phone: "+998 79 123 45 17" },
  { name: "Xalq ta'limi boshqarmasi", phone: "+998 79 123 45 18" },
  { name: "Bandlikka ko'maklashish markazi", phone: "+998 79 123 45 19" },
  { name: "FHDYO va hujjatlar bo'limi", phone: "+998 79 123 45 20" },
  { name: "Qishloq xo'jaligi bo'limi", phone: "+998 79 123 45 21" },
  { name: "Aloqa va axborotlashtirish bo'limi", phone: "+998 79 123 45 22" },
  { name: "Yuridik bo'lim", phone: "+998 79 123 45 23" },
];

export function districtNames(): string[] {
  return QR_DISTRICTS.map((d) => d.name);
}

export function mfyNames(districtName: string): string[] {
  return QR_DISTRICTS.find((d) => d.name === districtName)?.mfys.map((m) => m.name) ?? [];
}

export function streetNames(districtName: string, mfyName: string): string[] {
  return (
    QR_DISTRICTS.find((d) => d.name === districtName)?.mfys.find((m) => m.name === mfyName)
      ?.streets ?? []
  );
}
