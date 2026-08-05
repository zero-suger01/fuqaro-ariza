import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export type Language = 'uz' | 'oz' | 'ru' | 'en';

export const languages: { code: Language; label: string; short: string }[] = [
  { code: 'uz', label: "O'zbekcha", short: 'Oʻz' },
  { code: 'oz', label: 'Ўзбекча', short: 'Ўз' },
  { code: 'ru', label: 'Русский', short: 'Рус' },
  { code: 'en', label: 'English', short: 'EN' },
];

type Feature = { icon: string; title: string; text: string };

export type Dict = {
  brand: string;
  region: string;
  landing: {
    badge: string;
    title: string;
    subtitle: string;
    submit: string;
    submitHint: string;
    track: string;
    cabinet: string;
    cabinetHint: string;
    features: Feature[];
    helpTitle: string;
    helpText: string;
    telegram: string;
    call: string;
  };
  nav: { home: string; requests: string; create: string; alerts: string; settings: string };
  cabinet: {
    greeting: string;
    greetingSub: string;
    online: string;
    heroTitle: string;
    heroText: string;
    heroAction: string;
    total: string;
    active: string;
    resolved: string;
    recent: string;
    seeAll: string;
    myRequests: string;
    countSuffix: string;
    ticket: string;
    orgFallback: string;
    textFallback: string;
    details: string;
    statusPrefix: string;
    emptyTitle: string;
    emptyText: string;
    emptyAction: string;
    alertsTitle: string;
    alertsEmptyTitle: string;
    alertsEmptyText: string;
    settingsTitle: string;
    settingsGroup: string;
    language: string;
    notifications: string;
    about: string;
    version: string;
    verified: string;
    signOut: string;
    progressLabel: string;
  };
  auth: {
    title: string;
    subtitle: string;
    registerTitle: string;
    registerSubtitle: string;
    otpTitle: string;
    otpSubtitle: string;
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
    passwordHint: string;
    otpCode: string;
    signIn: string;
    signUp: string;
    confirm: string;
    back: string;
    toRegister: string;
    toLogin: string;
    invalid: string;
    otpInvalid: string;
    failed: string;
    trust: string;
  };
  wizard: {
    title: string;
    stepOf: string;
    step1Title: string;
    step1Text: string;
    step1Placeholder: string;
    step2Title: string;
    step2Text: string;
    searchPlaceholder: string;
    useLocation: string;
    locationAdded: string;
    step3Title: string;
    step3Text: string;
    fullName: string;
    fullNamePlaceholder: string;
    fullNameHint: string;
    photo: string;
    video: string;
    videoAdded: string;
    audio: string;
    audioAdded: string;
    recording: string;
    evidence: string;
    evidenceHint: string;
    continueLabel: string;
    send: string;
    tooShort: string;
    pickNeighborhood: string;
    loadingNeighborhoods: string;
    contactInvalid: string;
    sendFailed: string;
    permissionPhoto: string;
    permissionVideo: string;
    permissionAudio: string;
    permissionLocation: string;
    neighborhoodsFailed: string;
    noMatches: string;
  };
  track: {
    title: string;
    eyebrow: string;
    heading: string;
    text: string;
    placeholder: string;
    action: string;
    sent: string;
    empty: string;
    notFound: string;
    currentStatus: string;
    department: string;
    departmentEmpty: string;
    deadline: string;
    deadlineEmpty: string;
    timeline: string;
    reply: string;
    category: string;
    infoTitle: string;
    infoHint: string;
    infoPlaceholder: string;
    infoPhoto: string;
    infoSend: string;
    infoSent: string;
    infoEmpty: string;
    infoFailed: string;
  };
  common: { back: string; loading: string; retry: string; close: string };
};

const uz: Dict = {
  brand: 'e-Murojaat',
  region: 'Namangan viloyati',
  landing: {
    badge: 'Fuqarolar uchun yagona portal',
    title: 'Murojaatingiz\neʼtiborsiz\nqolmaydi.',
    subtitle:
      'Muammoni oʻz soʻzingiz bilan yozing. Biz uni masʼul tashkilotga yetkazamiz, siz esa har bir bosqichni kuzatib borasiz.',
    submit: 'Murojaat yuborish',
    submitHint: 'Uch bosqichda toʻldiriladi',
    track: 'Holatni tekshirish',
    cabinet: 'Fuqaro kabineti',
    cabinetHint: 'Barcha murojaatlaringiz bir joyda',
    features: [
      { icon: 'hash', title: 'Raqam bilan nazorat', text: 'Har bir murojaatga alohida raqam beriladi' },
      { icon: 'globe', title: 'Toʻrt tilda', text: 'Oʻzbek, krill, rus va ingliz tillari' },
      { icon: 'shield', title: 'Maʼlumot himoyasi', text: 'Shaxsiy maʼlumotlar qonun asosida saqlanadi' },
    ],
    helpTitle: 'Yordam kerakmi?',
    helpText: 'Ishonch telefoniga qoʻngʻiroq qiling yoki Telegram orqali yozing.',
    telegram: 'Telegram bot',
    call: 'Qoʻngʻiroq qilish',
  },
  nav: { home: 'Asosiy', requests: 'Ariza', create: 'Yangi', alerts: 'Xabar', settings: 'Sozlama' },
  cabinet: {
    greeting: 'Assalomu alaykum,\n{name}',
    greetingSub: 'Murojaatlaringiz shu yerda kuzatiladi.',
    online: 'Tizim ishlayapti',
    heroTitle: 'Yangi murojaat',
    heroText: 'Muammo yoki taklifingizni yuboring — javobini shu yerdan koʻrasiz.',
    heroAction: 'Boshlash',
    total: 'Jami',
    active: 'Jarayonda',
    resolved: 'Hal qilindi',
    recent: 'Soʻnggi murojaatlar',
    seeAll: 'Barchasi',
    myRequests: 'Murojaatlarim',
    countSuffix: '{count} ta',
    ticket: 'Murojaat raqami',
    orgFallback: 'Masʼul tashkilot aniqlanmoqda',
    textFallback: 'Murojaat matni tayyorlanmoqda',
    details: 'Batafsil koʻrish',
    statusPrefix: 'Holat',
    emptyTitle: 'Hozircha murojaat yoʻq',
    emptyText: 'Birinchi murojaatingizni yuboring — holatini shu yerdan kuzatasiz.',
    emptyAction: 'Murojaat yuborish',
    alertsTitle: 'Xabarlar',
    alertsEmptyTitle: 'Xabarlar boʻsh',
    alertsEmptyText: 'Murojaatingiz holati oʻzgarganda, xabar shu yerda paydo boʻladi.',
    settingsTitle: 'Sozlamalar',
    settingsGroup: 'Kabinet sozlamalari',
    language: 'Til',
    notifications: 'Bildirishnomalar',
    about: 'Ilova haqida',
    version: 'Versiya 0.1.0',
    verified: 'Telefon tasdiqlangan',
    signOut: 'Kabinetdan chiqish',
    progressLabel: 'Hal qilingan murojaatlar ulushi',
  },
  auth: {
    title: 'Kabinetga kirish',
    subtitle: 'Murojaatlaringiz, javoblar va holatlarni bir joydan koʻring.',
    registerTitle: 'Kabinet ochish',
    registerSubtitle: 'Bir marta roʻyxatdan oʻting — keyin faqat telefon va parol.',
    otpTitle: 'Telefonni tasdiqlang',
    otpSubtitle: '{phone} raqamiga yuborilgan 6 xonali kodni kiriting.',
    firstName: 'Ismingiz',
    lastName: 'Familiyangiz',
    phone: 'Telefon raqami',
    password: 'Parol',
    passwordHint: 'Kamida 6 ta belgi',
    otpCode: 'SMS kodi',
    signIn: 'Kirish',
    signUp: 'Roʻyxatdan oʻtish',
    confirm: 'Tasdiqlash',
    back: 'Orqaga',
    toRegister: 'Kabinetim yoʻq — ochish',
    toLogin: 'Kabinetim bor — kirish',
    invalid: 'Telefon, parol va ismni toʻgʻri kiriting.',
    otpInvalid: '6 xonali kodni kiriting.',
    failed: 'Kirishda xatolik yuz berdi.',
    trust: 'Maʼlumotlaringiz shifrlangan holda saqlanadi',
  },
  wizard: {
    title: 'Murojaat yuborish',
    stepOf: '{step} / {total} bosqich',
    step1Title: 'Muammoni\ntushuntiring',
    step1Text: 'Nima boʻlgani va qachondan beri davom etayotganini oddiy soʻzlar bilan yozing.',
    step1Placeholder: 'Masalan: koʻchamizdagi chiroqlar bir oydan beri yonmayapti...',
    step2Title: 'Manzilni\nkoʻrsating',
    step2Text: 'Murojaat qaysi mahallaga tegishli ekanini tanlang.',
    searchPlaceholder: 'Mahalla nomini qidiring',
    useLocation: 'Joriy joylashuvni qoʻshish',
    locationAdded: 'Joylashuv biriktirildi',
    step3Title: 'Bogʻlanish\nmaʼlumotlari',
    step3Text: 'Javob tayyor boʻlganda siz bilan bogʻlanamiz.',
    fullName: 'Ism va familiyangiz',
    fullNamePlaceholder: 'Akmaljon Karimov',
    fullNameHint: 'Pasportdagidek yozing',
    photo: 'Foto',
    video: 'Video',
    videoAdded: 'Video tayyor',
    audio: 'Ovoz',
    audioAdded: 'Ovoz tayyor',
    recording: 'Yozilmoqda',
    evidence: 'Dalil biriktirish',
    evidenceHint: 'Ixtiyoriy — 5 tagacha foto, 1 video, 1 ovozli xabar',
    continueLabel: 'Davom etish',
    send: 'Murojaatni yuborish',
    tooShort: 'Muammoni kamida 10 ta belgi bilan yozing.',
    pickNeighborhood: 'Mahallani tanlang.',
    loadingNeighborhoods: 'Mahallalar yuklanmoqda, biroz kuting.',
    contactInvalid: 'Ism-familiya va toʻliq telefon raqamini kiriting.',
    sendFailed: 'Yuborishda xatolik yuz berdi.',
    permissionPhoto: 'Rasmlarga kirish uchun ruxsat bering.',
    permissionVideo: 'Videoga kirish uchun ruxsat bering.',
    permissionAudio: 'Ovoz yozish uchun ruxsat bering.',
    permissionLocation: 'Manzilni aniqlash uchun joylashuvga ruxsat bering.',
    neighborhoodsFailed: 'Mahallalar yuklanmadi. Internet aloqasini tekshiring.',
    noMatches: 'Bunday mahalla topilmadi.',
  },
  track: {
    title: 'Murojaat holati',
    eyebrow: 'Nazorat',
    heading: 'Raqam orqali\ntekshiring',
    text: 'Murojaat yuborilganda berilgan raqamni kiriting.',
    placeholder: 'UY-2026-000001',
    action: 'Holatni koʻrish',
    sent: 'Murojaat qabul qilindi. Raqamni saqlab qoʻying.',
    empty: 'Murojaat raqamini kiriting.',
    notFound: 'Bunday raqamli murojaat topilmadi.',
    currentStatus: 'Joriy holat',
    department: 'Masʼul boʻlim',
    departmentEmpty: 'Hali biriktirilmagan',
    deadline: 'Ijro muddati',
    deadlineEmpty: 'Belgilanmagan',
    timeline: 'Jarayon',
    reply: 'Rasmiy javob',
    category: 'Yoʻnalish',
    infoTitle: 'Sizdan maʼlumot kutilmoqda',
    infoHint: 'Javobni yozing yoki hujjat rasmini biriktiring — murojaat shundan keyin davom etadi.',
    infoPlaceholder: 'Masalan: uy raqami 12, muammo uch kundan beri...',
    infoPhoto: 'Rasm biriktirish',
    infoSend: 'Javobni yuborish',
    infoSent: 'Javobingiz yuborildi. Rahmat!',
    infoEmpty: 'Javob matnini yozing.',
    infoFailed: 'Javobni yuborib boʻlmadi. Qayta urinib koʻring.',
  },
  common: { back: 'Orqaga', loading: 'Yuklanmoqda', retry: 'Qayta urinish', close: 'Yopish' },
};

const oz: Dict = {
  brand: 'e-Мурожаат',
  region: 'Наманган вилояти',
  landing: {
    badge: 'Фуқаролар учун ягона портал',
    title: 'Мурожаатингиз\nэътиборсиз\nқолмайди.',
    subtitle:
      'Муаммони ўз сўзингиз билан ёзинг. Биз уни масъул ташкилотга етказамиз, сиз эса ҳар бир босқични кузатиб борасиз.',
    submit: 'Мурожаат юбориш',
    submitHint: 'Уч босқичда тўлдирилади',
    track: 'Ҳолатни текшириш',
    cabinet: 'Фуқаро кабинети',
    cabinetHint: 'Барча мурожаатларингиз бир жойда',
    features: [
      { icon: 'hash', title: 'Рақам билан назорат', text: 'Ҳар бир мурожаатга алоҳида рақам берилади' },
      { icon: 'globe', title: 'Тўрт тилда', text: 'Ўзбек, крилл, рус ва инглиз тиллари' },
      { icon: 'shield', title: 'Маълумот ҳимояси', text: 'Шахсий маълумотлар қонун асосида сақланади' },
    ],
    helpTitle: 'Ёрдам керакми?',
    helpText: 'Ишонч телефонига қўнғироқ қилинг ёки Telegram орқали ёзинг.',
    telegram: 'Telegram бот',
    call: 'Қўнғироқ қилиш',
  },
  nav: { home: 'Асосий', requests: 'Ариза', create: 'Янги', alerts: 'Хабар', settings: 'Созлама' },
  cabinet: {
    greeting: 'Ассалому алайкум,\n{name}',
    greetingSub: 'Мурожаатларингиз шу ерда кузатилади.',
    online: 'Тизим ишлаяпти',
    heroTitle: 'Янги мурожаат',
    heroText: 'Муаммо ёки таклифингизни юборинг — жавобини шу ердан кўрасиз.',
    heroAction: 'Бошлаш',
    total: 'Жами',
    active: 'Жараёнда',
    resolved: 'Ҳал қилинди',
    recent: 'Сўнгги мурожаатлар',
    seeAll: 'Барчаси',
    myRequests: 'Мурожаатларим',
    countSuffix: '{count} та',
    ticket: 'Мурожаат рақами',
    orgFallback: 'Масъул ташкилот аниқланмоқда',
    textFallback: 'Мурожаат матни тайёрланмоқда',
    details: 'Батафсил кўриш',
    statusPrefix: 'Ҳолат',
    emptyTitle: 'Ҳозирча мурожаат йўқ',
    emptyText: 'Биринчи мурожаатингизни юборинг — ҳолатини шу ердан кузатасиз.',
    emptyAction: 'Мурожаат юбориш',
    alertsTitle: 'Хабарлар',
    alertsEmptyTitle: 'Хабарлар бўш',
    alertsEmptyText: 'Мурожаатингиз ҳолати ўзгарганда, хабар шу ерда пайдо бўлади.',
    settingsTitle: 'Созламалар',
    settingsGroup: 'Кабинет созламалари',
    language: 'Тил',
    notifications: 'Билдиришномалар',
    about: 'Илова ҳақида',
    version: 'Версия 0.1.0',
    verified: 'Телефон тасдиқланган',
    signOut: 'Кабинетдан чиқиш',
    progressLabel: 'Ҳал қилинган мурожаатлар улуши',
  },
  auth: {
    title: 'Кабинетга кириш',
    subtitle: 'Мурожаатларингиз, жавоблар ва ҳолатларни бир жойдан кўринг.',
    registerTitle: 'Кабинет очиш',
    registerSubtitle: 'Бир марта рўйхатдан ўтинг — кейин фақат телефон ва парол.',
    otpTitle: 'Телефонни тасдиқланг',
    otpSubtitle: '{phone} рақамига юборилган 6 хонали кодни киритинг.',
    firstName: 'Исмингиз',
    lastName: 'Фамилиянгиз',
    phone: 'Телефон рақами',
    password: 'Парол',
    passwordHint: 'Камида 6 та белги',
    otpCode: 'SMS коди',
    signIn: 'Кириш',
    signUp: 'Рўйхатдан ўтиш',
    confirm: 'Тасдиқлаш',
    back: 'Орқага',
    toRegister: 'Кабинетим йўқ — очиш',
    toLogin: 'Кабинетим бор — кириш',
    invalid: 'Телефон, парол ва исмни тўғри киритинг.',
    otpInvalid: '6 хонали кодни киритинг.',
    failed: 'Киришда хатолик юз берди.',
    trust: 'Маълумотларингиз шифрланган ҳолда сақланади',
  },
  wizard: {
    title: 'Мурожаат юбориш',
    stepOf: '{step} / {total} босқич',
    step1Title: 'Муаммони\nтушунтиринг',
    step1Text: 'Нима бўлгани ва қачондан бери давом этаётганини оддий сўзлар билан ёзинг.',
    step1Placeholder: 'Масалан: кўчамиздаги чироқлар бир ойдан бери ёнмаяпти...',
    step2Title: 'Манзилни\nкўрсатинг',
    step2Text: 'Мурожаат қайси маҳаллага тегишли эканини танланг.',
    searchPlaceholder: 'Маҳалла номини қидиринг',
    useLocation: 'Жорий жойлашувни қўшиш',
    locationAdded: 'Жойлашув бириктирилди',
    step3Title: 'Боғланиш\nмаълумотлари',
    step3Text: 'Жавоб тайёр бўлганда сиз билан боғланамиз.',
    fullName: 'Исм ва фамилиянгиз',
    fullNamePlaceholder: 'Акмалжон Каримов',
    fullNameHint: 'Паспортдагидек ёзинг',
    photo: 'Фото',
    video: 'Видео',
    videoAdded: 'Видео тайёр',
    audio: 'Овоз',
    audioAdded: 'Овоз тайёр',
    recording: 'Ёзилмоқда',
    evidence: 'Далил бириктириш',
    evidenceHint: 'Ихтиёрий — 5 тагача фото, 1 видео, 1 овозли хабар',
    continueLabel: 'Давом этиш',
    send: 'Мурожаатни юбориш',
    tooShort: 'Муаммони камида 10 та белги билан ёзинг.',
    pickNeighborhood: 'Маҳаллани танланг.',
    loadingNeighborhoods: 'Маҳаллалар юкланмоқда, бироз кутинг.',
    contactInvalid: 'Исм-фамилия ва тўлиқ телефон рақамини киритинг.',
    sendFailed: 'Юборишда хатолик юз берди.',
    permissionPhoto: 'Расмларга кириш учун рухсат беринг.',
    permissionVideo: 'Видеога кириш учун рухсат беринг.',
    permissionAudio: 'Овоз ёзиш учун рухсат беринг.',
    permissionLocation: 'Манзилни аниқлаш учун жойлашувга рухсат беринг.',
    neighborhoodsFailed: 'Маҳаллалар юкланмади. Интернет алоқасини текширинг.',
    noMatches: 'Бундай маҳалла топилмади.',
  },
  track: {
    title: 'Мурожаат ҳолати',
    eyebrow: 'Назорат',
    heading: 'Рақам орқали\nтекширинг',
    text: 'Мурожаат юборилганда берилган рақамни киритинг.',
    placeholder: 'UY-2026-000001',
    action: 'Ҳолатни кўриш',
    sent: 'Мурожаат қабул қилинди. Рақамни сақлаб қўйинг.',
    empty: 'Мурожаат рақамини киритинг.',
    notFound: 'Бундай рақамли мурожаат топилмади.',
    currentStatus: 'Жорий ҳолат',
    department: 'Масъул бўлим',
    departmentEmpty: 'Ҳали бириктирилмаган',
    deadline: 'Ижро муддати',
    deadlineEmpty: 'Белгиланмаган',
    timeline: 'Жараён',
    reply: 'Расмий жавоб',
    category: 'Йўналиш',
    infoTitle: 'Сиздан маълумот кутилмоқда',
    infoHint: 'Жавобни ёзинг ёки ҳужжат расмини бириктиринг — мурожаат шундан кейин давом этади.',
    infoPlaceholder: 'Масалан: уй рақами 12, муаммо уч кундан бери...',
    infoPhoto: 'Расм бириктириш',
    infoSend: 'Жавобни юбориш',
    infoSent: 'Жавобингиз юборилди. Раҳмат!',
    infoEmpty: 'Жавоб матнини ёзинг.',
    infoFailed: 'Жавобни юбориб бўлмади. Қайта уриниб кўринг.',
  },
  common: { back: 'Орқага', loading: 'Юкланмоқда', retry: 'Қайта уриниш', close: 'Ёпиш' },
};

const ru: Dict = {
  brand: 'e-Murojaat',
  region: 'Наманганская область',
  landing: {
    badge: 'Единый портал для граждан',
    title: 'Ваше обращение\nне останется\nбез внимания.',
    subtitle:
      'Опишите проблему своими словами. Мы направим её в ответственную организацию, а вы будете видеть каждый этап.',
    submit: 'Отправить обращение',
    submitHint: 'Заполняется в три шага',
    track: 'Проверить статус',
    cabinet: 'Личный кабинет',
    cabinetHint: 'Все обращения в одном месте',
    features: [
      { icon: 'hash', title: 'Контроль по номеру', text: 'Каждому обращению присваивается номер' },
      { icon: 'globe', title: 'Четыре языка', text: 'Узбекский, кириллица, русский и английский' },
      { icon: 'shield', title: 'Защита данных', text: 'Персональные данные хранятся по закону' },
    ],
    helpTitle: 'Нужна помощь?',
    helpText: 'Позвоните на телефон доверия или напишите в Telegram.',
    telegram: 'Telegram-бот',
    call: 'Позвонить',
  },
  nav: { home: 'Главная', requests: 'Заявки', create: 'Новое', alerts: 'События', settings: 'Профиль' },
  cabinet: {
    greeting: 'Здравствуйте,\n{name}',
    greetingSub: 'Здесь отслеживаются ваши обращения.',
    online: 'Система работает',
    heroTitle: 'Новое обращение',
    heroText: 'Отправьте проблему или предложение — ответ увидите здесь.',
    heroAction: 'Начать',
    total: 'Всего',
    active: 'В работе',
    resolved: 'Решено',
    recent: 'Последние обращения',
    seeAll: 'Все',
    myRequests: 'Мои обращения',
    countSuffix: '{count}',
    ticket: 'Номер обращения',
    orgFallback: 'Ответственная организация определяется',
    textFallback: 'Текст обращения подготавливается',
    details: 'Подробнее',
    statusPrefix: 'Статус',
    emptyTitle: 'Обращений пока нет',
    emptyText: 'Отправьте первое обращение — статус будете видеть здесь.',
    emptyAction: 'Отправить обращение',
    alertsTitle: 'События',
    alertsEmptyTitle: 'Событий нет',
    alertsEmptyText: 'Когда статус обращения изменится, сообщение появится здесь.',
    settingsTitle: 'Настройки',
    settingsGroup: 'Настройки кабинета',
    language: 'Язык',
    notifications: 'Уведомления',
    about: 'О приложении',
    version: 'Версия 0.1.0',
    verified: 'Телефон подтверждён',
    signOut: 'Выйти из кабинета',
    progressLabel: 'Доля решённых обращений',
  },
  auth: {
    title: 'Вход в кабинет',
    subtitle: 'Обращения, ответы и статусы — в одном месте.',
    registerTitle: 'Создать кабинет',
    registerSubtitle: 'Зарегистрируйтесь один раз — дальше только телефон и пароль.',
    otpTitle: 'Подтвердите телефон',
    otpSubtitle: 'Введите 6-значный код, отправленный на {phone}.',
    firstName: 'Имя',
    lastName: 'Фамилия',
    phone: 'Номер телефона',
    password: 'Пароль',
    passwordHint: 'Минимум 6 символов',
    otpCode: 'Код из SMS',
    signIn: 'Войти',
    signUp: 'Зарегистрироваться',
    confirm: 'Подтвердить',
    back: 'Назад',
    toRegister: 'Нет кабинета — создать',
    toLogin: 'Есть кабинет — войти',
    invalid: 'Проверьте телефон, пароль и имя.',
    otpInvalid: 'Введите 6-значный код.',
    failed: 'Ошибка при входе.',
    trust: 'Ваши данные хранятся в зашифрованном виде',
  },
  wizard: {
    title: 'Отправка обращения',
    stepOf: 'Шаг {step} из {total}',
    step1Title: 'Опишите\nпроблему',
    step1Text: 'Напишите простыми словами, что случилось и как давно это длится.',
    step1Placeholder: 'Например: на нашей улице месяц не горят фонари...',
    step2Title: 'Укажите\nадрес',
    step2Text: 'Выберите махаллю, к которой относится обращение.',
    searchPlaceholder: 'Поиск махалли',
    useLocation: 'Добавить текущее местоположение',
    locationAdded: 'Местоположение добавлено',
    step3Title: 'Контактные\nданные',
    step3Text: 'Свяжемся с вами, когда ответ будет готов.',
    fullName: 'Имя и фамилия',
    fullNamePlaceholder: 'Акмальжон Каримов',
    fullNameHint: 'Как в паспорте',
    photo: 'Фото',
    video: 'Видео',
    videoAdded: 'Видео готово',
    audio: 'Голос',
    audioAdded: 'Запись готова',
    recording: 'Идёт запись',
    evidence: 'Приложить доказательства',
    evidenceHint: 'Необязательно — до 5 фото, 1 видео, 1 голосовое',
    continueLabel: 'Продолжить',
    send: 'Отправить обращение',
    tooShort: 'Опишите проблему минимум 10 символами.',
    pickNeighborhood: 'Выберите махаллю.',
    loadingNeighborhoods: 'Махалли загружаются, подождите.',
    contactInvalid: 'Введите имя, фамилию и полный номер телефона.',
    sendFailed: 'Ошибка при отправке.',
    permissionPhoto: 'Разрешите доступ к фото.',
    permissionVideo: 'Разрешите доступ к видео.',
    permissionAudio: 'Разрешите доступ к микрофону.',
    permissionLocation: 'Разрешите доступ к геолокации.',
    neighborhoodsFailed: 'Не удалось загрузить махалли. Проверьте интернет.',
    noMatches: 'Такая махалля не найдена.',
  },
  track: {
    title: 'Статус обращения',
    eyebrow: 'Контроль',
    heading: 'Проверьте\nпо номеру',
    text: 'Введите номер, выданный при отправке обращения.',
    placeholder: 'UY-2026-000001',
    action: 'Показать статус',
    sent: 'Обращение принято. Сохраните номер.',
    empty: 'Введите номер обращения.',
    notFound: 'Обращение с таким номером не найдено.',
    currentStatus: 'Текущий статус',
    department: 'Ответственный отдел',
    departmentEmpty: 'Ещё не назначен',
    deadline: 'Срок исполнения',
    deadlineEmpty: 'Не установлен',
    timeline: 'Процесс',
    reply: 'Официальный ответ',
    category: 'Направление',
    infoTitle: 'От вас ждут информацию',
    infoHint: 'Напишите ответ или приложите фото документа — после этого обращение продолжится.',
    infoPlaceholder: 'Например: дом 12, проблема уже три дня...',
    infoPhoto: 'Приложить фото',
    infoSend: 'Отправить ответ',
    infoSent: 'Ваш ответ отправлен. Спасибо!',
    infoEmpty: 'Напишите текст ответа.',
    infoFailed: 'Не удалось отправить ответ. Попробуйте ещё раз.',
  },
  common: { back: 'Назад', loading: 'Загрузка', retry: 'Повторить', close: 'Закрыть' },
};

const en: Dict = {
  brand: 'e-Murojaat',
  region: 'Namangan region',
  landing: {
    badge: 'One portal for every citizen',
    title: 'Your request\nwill not go\nunanswered.',
    subtitle:
      'Describe the problem in your own words. We route it to the responsible office, and you follow every step.',
    submit: 'Send a request',
    submitHint: 'Three short steps',
    track: 'Check a status',
    cabinet: 'Citizen cabinet',
    cabinetHint: 'Every request in one place',
    features: [
      { icon: 'hash', title: 'Tracked by number', text: 'Each request gets its own reference number' },
      { icon: 'globe', title: 'Four languages', text: 'Uzbek, Cyrillic, Russian and English' },
      { icon: 'shield', title: 'Data protection', text: 'Personal data is stored under the law' },
    ],
    helpTitle: 'Need help?',
    helpText: 'Call the hotline or write to us on Telegram.',
    telegram: 'Telegram bot',
    call: 'Call now',
  },
  nav: { home: 'Home', requests: 'Requests', create: 'New', alerts: 'Alerts', settings: 'Settings' },
  cabinet: {
    greeting: 'Hello,\n{name}',
    greetingSub: 'Your requests are tracked here.',
    online: 'System online',
    heroTitle: 'New request',
    heroText: 'Send a problem or a suggestion — the reply lands right here.',
    heroAction: 'Start',
    total: 'Total',
    active: 'In progress',
    resolved: 'Resolved',
    recent: 'Recent requests',
    seeAll: 'See all',
    myRequests: 'My requests',
    countSuffix: '{count}',
    ticket: 'Request number',
    orgFallback: 'Responsible office is being assigned',
    textFallback: 'Request text is being prepared',
    details: 'View details',
    statusPrefix: 'Status',
    emptyTitle: 'No requests yet',
    emptyText: 'Send your first request — you will track its status here.',
    emptyAction: 'Send a request',
    alertsTitle: 'Alerts',
    alertsEmptyTitle: 'Nothing yet',
    alertsEmptyText: 'When a request status changes, the message shows up here.',
    settingsTitle: 'Settings',
    settingsGroup: 'Cabinet settings',
    language: 'Language',
    notifications: 'Notifications',
    about: 'About the app',
    version: 'Version 0.1.0',
    verified: 'Phone verified',
    signOut: 'Sign out',
    progressLabel: 'Share of resolved requests',
  },
  auth: {
    title: 'Sign in',
    subtitle: 'Requests, replies and statuses in one place.',
    registerTitle: 'Create a cabinet',
    registerSubtitle: 'Register once — after that just phone and password.',
    otpTitle: 'Confirm your phone',
    otpSubtitle: 'Enter the 6-digit code sent to {phone}.',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone number',
    password: 'Password',
    passwordHint: 'At least 6 characters',
    otpCode: 'SMS code',
    signIn: 'Sign in',
    signUp: 'Create account',
    confirm: 'Confirm',
    back: 'Back',
    toRegister: 'No cabinet yet — create one',
    toLogin: 'I have a cabinet — sign in',
    invalid: 'Check the phone, password and name.',
    otpInvalid: 'Enter the 6-digit code.',
    failed: 'Sign-in failed.',
    trust: 'Your data is stored encrypted',
  },
  wizard: {
    title: 'Send a request',
    stepOf: 'Step {step} of {total}',
    step1Title: 'Describe the\nproblem',
    step1Text: 'In plain words: what happened, and how long it has been going on.',
    step1Placeholder: 'For example: the street lights have been out for a month...',
    step2Title: 'Point to the\nplace',
    step2Text: 'Choose the mahalla this request belongs to.',
    searchPlaceholder: 'Search for a mahalla',
    useLocation: 'Add current location',
    locationAdded: 'Location attached',
    step3Title: 'Contact\ndetails',
    step3Text: 'We will reach out once the reply is ready.',
    fullName: 'First and last name',
    fullNamePlaceholder: 'Akmaljon Karimov',
    fullNameHint: 'As written in your passport',
    photo: 'Photo',
    video: 'Video',
    videoAdded: 'Video ready',
    audio: 'Voice',
    audioAdded: 'Recording ready',
    recording: 'Recording',
    evidence: 'Attach evidence',
    evidenceHint: 'Optional — up to 5 photos, 1 video, 1 voice note',
    continueLabel: 'Continue',
    send: 'Send the request',
    tooShort: 'Describe the problem with at least 10 characters.',
    pickNeighborhood: 'Choose a mahalla.',
    loadingNeighborhoods: 'Mahallas are loading, one moment.',
    contactInvalid: 'Enter your full name and phone number.',
    sendFailed: 'Sending failed.',
    permissionPhoto: 'Allow access to photos.',
    permissionVideo: 'Allow access to video.',
    permissionAudio: 'Allow access to the microphone.',
    permissionLocation: 'Allow access to location.',
    neighborhoodsFailed: 'Could not load mahallas. Check your connection.',
    noMatches: 'No mahalla matches that.',
  },
  track: {
    title: 'Request status',
    eyebrow: 'Tracking',
    heading: 'Check it by\nnumber',
    text: 'Enter the number you received when the request was sent.',
    placeholder: 'UY-2026-000001',
    action: 'Show status',
    sent: 'Request received. Keep the number safe.',
    empty: 'Enter a request number.',
    notFound: 'No request found with that number.',
    currentStatus: 'Current status',
    department: 'Responsible office',
    departmentEmpty: 'Not assigned yet',
    deadline: 'Due date',
    deadlineEmpty: 'Not set',
    timeline: 'Progress',
    reply: 'Official reply',
    category: 'Category',
    infoTitle: 'Information is needed from you',
    infoHint: 'Write your answer or attach a photo of the document — the request continues once you do.',
    infoPlaceholder: 'For example: house number 12, the problem started three days ago...',
    infoPhoto: 'Attach a photo',
    infoSend: 'Send the answer',
    infoSent: 'Your answer has been sent. Thank you!',
    infoEmpty: 'Write the answer text.',
    infoFailed: 'Could not send the answer. Please try again.',
  },
  common: { back: 'Back', loading: 'Loading', retry: 'Try again', close: 'Close' },
};

const dictionaries: Record<Language, Dict> = { uz, oz, ru, en };

type I18nValue = { language: Language; setLanguage: (language: Language) => void; t: Dict };

const I18nContext = createContext<I18nValue>({
  language: 'uz',
  setLanguage: () => undefined,
  t: uz,
});

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>('uz');

  useEffect(() => {
    AsyncStorage.getItem('emurojaat_language').then((value) => {
      if (value && value in dictionaries) setLanguageState(value as Language);
    });
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage: (next: Language) => {
        setLanguageState(next);
        void AsyncStorage.setItem('emurojaat_language', next);
      },
      t: dictionaries[language],
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

/** `fill('{step} / {total}', { step: 1, total: 3 })` */
export function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
