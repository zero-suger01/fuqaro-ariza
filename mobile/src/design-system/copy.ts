import type { Language } from '@/i18n';

export type CabinetDesignCopy = {
  appBarTitle: string;
  systemStatus: string;
  personalLabel: string;
  citizenFallback: string;
  greeting: string;
  supporting: string;
  heroTitle: string;
  heroDescription: string;
  heroAction: string;
  totalRequests: string;
  activeRequests: string;
  resolvedRequests: string;
  recentRequests: string;
  allRequests: string;
  requestNumber: string;
  organizationFallback: string;
  summaryFallback: string;
  viewDetails: string;
  statusPrefix: string;
  emptyTitle: string;
  emptyText: string;
  emptyAction: string;
  settingsTitle: string;
  settingsSection: string;
  languageSetting: string;
  notificationsSetting: string;
  aboutSetting: string;
  versionLabel: string;
  verifiedLabel: string;
  logout: string;
  notificationsTitle: string;
  notificationEmptyTitle: string;
  notificationEmptyText: string;
  notificationEmptyAction: string;
  nav: {
    home: string;
    requests: string;
    newRequest: string;
    newShort: string;
    notifications: string;
    settings: string;
  };
};

export const cabinetDesignCopy: Record<Language, CabinetDesignCopy> = {
  uz: {
    appBarTitle: 'Kabinetim',
    systemStatus: 'Onlayn',
    personalLabel: 'Shaxsiy kabinet',
    citizenFallback: 'fuqaro',
    greeting: 'Assalomu alaykum, {name}',
    supporting: 'Murojaatlaringizni bir joydan kuzating.',
    heroTitle: 'Yangi murojaat',
    heroDescription: 'Muammo yoki taklifni yuboring.',
    heroAction: 'Yangi murojaat',
    totalRequests: 'Jami',
    activeRequests: 'Jarayonda',
    resolvedRequests: 'Hal qilingan',
    recentRequests: 'So‘nggi murojaatlar',
    allRequests: 'Barchasi',
    requestNumber: 'Murojaat raqami',
    organizationFallback: 'Mas’ul tashkilot aniqlanmoqda',
    summaryFallback: 'Murojaat matni tayyorlanmoqda',
    viewDetails: 'Batafsil ko‘rish',
    statusPrefix: 'Holat',
    emptyTitle: 'Hozircha murojaatlar yo‘q',
    emptyText: 'Muammo yoki taklifingizni yuboring — uning holatini shu yerdan kuzatasiz.',
    emptyAction: 'Birinchi murojaatni yuborish',
    settingsTitle: 'Sozlamalar',
    settingsSection: 'Kabinet sozlamalari',
    languageSetting: 'Til',
    notificationsSetting: 'Bildirishnomalar',
    aboutSetting: 'Ilova haqida',
    versionLabel: 'Versiya 0.1.0',
    verifiedLabel: 'Telefon tasdiqlangan',
    logout: 'Kabinetdan chiqish',
    notificationsTitle: 'Bildirishnomalar',
    notificationEmptyTitle: 'Hozircha bildirishnoma yo‘q',
    notificationEmptyText: 'Murojaatingiz holati o‘zgarsa, xabar shu yerda ko‘rinadi.',
    notificationEmptyAction: 'Murojaatlarni ko‘rish',
    nav: { home: 'Asosiy', requests: 'Murojaat', newRequest: 'Yangi murojaat', newShort: 'Yangi', notifications: 'Xabarlar', settings: 'Sozlamalar' },
  },
  oz: {
    appBarTitle: 'Кабинетим',
    systemStatus: 'Онлайн',
    personalLabel: 'Шахсий кабинет',
    citizenFallback: 'фуқаро',
    greeting: 'Ассалому алайкум, {name}',
    supporting: 'Мурожаатларингизни бир жойдан кузатинг.',
    heroTitle: 'Янги мурожаат',
    heroDescription: 'Муаммо ёки таклифни юборинг.',
    heroAction: 'Янги мурожаат',
    totalRequests: 'Жами',
    activeRequests: 'Жараёнда',
    resolvedRequests: 'Ҳал қилинган',
    recentRequests: 'Сўнгги мурожаатлар',
    allRequests: 'Барчаси',
    requestNumber: 'Мурожаат рақами',
    organizationFallback: 'Масъул ташкилот аниқланмоқда',
    summaryFallback: 'Мурожаат матни тайёрланмоқда',
    viewDetails: 'Батафсил кўриш',
    statusPrefix: 'Ҳолат',
    emptyTitle: 'Ҳозирча мурожаатлар йўқ',
    emptyText: 'Муаммо ёки таклифингизни юборинг — унинг ҳолатини шу ердан кузатасиз.',
    emptyAction: 'Биринчи мурожаатни юбориш',
    settingsTitle: 'Созламалар',
    settingsSection: 'Кабинет созламалари',
    languageSetting: 'Тил',
    notificationsSetting: 'Билдиришномалар',
    aboutSetting: 'Илова ҳақида',
    versionLabel: 'Версия 0.1.0',
    verifiedLabel: 'Телефон тасдиқланган',
    logout: 'Кабинетдан чиқиш',
    notificationsTitle: 'Билдиришномалар',
    notificationEmptyTitle: 'Ҳозирча билдиришнома йўқ',
    notificationEmptyText: 'Мурожаатингиз ҳолати ўзгарса, хабар шу ерда кўринади.',
    notificationEmptyAction: 'Мурожаатларни кўриш',
    nav: { home: 'Асосий', requests: 'Мурожаат', newRequest: 'Янги мурожаат', newShort: 'Янги', notifications: 'Хабарлар', settings: 'Созламалар' },
  },
  ru: {
    appBarTitle: 'Мой кабинет',
    systemStatus: 'Онлайн',
    personalLabel: 'Личный кабинет',
    citizenFallback: 'гражданин',
    greeting: 'Здравствуйте, {name}',
    supporting: 'Следите за обращениями в одном месте.',
    heroTitle: 'Новое обращение',
    heroDescription: 'Отправьте проблему или идею.',
    heroAction: 'Новое обращение',
    totalRequests: 'Всего',
    activeRequests: 'В работе',
    resolvedRequests: 'Решено',
    recentRequests: 'Последние обращения',
    allRequests: 'Все',
    requestNumber: 'Номер обращения',
    organizationFallback: 'Ответственная организация определяется',
    summaryFallback: 'Текст обращения подготавливается',
    viewDetails: 'Подробнее',
    statusPrefix: 'Статус',
    emptyTitle: 'Обращений пока нет',
    emptyText: 'Отправьте проблему или предложение — здесь можно будет следить за статусом.',
    emptyAction: 'Отправить первое обращение',
    settingsTitle: 'Настройки',
    settingsSection: 'Настройки кабинета',
    languageSetting: 'Язык',
    notificationsSetting: 'Уведомления',
    aboutSetting: 'О приложении',
    versionLabel: 'Версия 0.1.0',
    verifiedLabel: 'Телефон подтверждён',
    logout: 'Выйти из кабинета',
    notificationsTitle: 'Уведомления',
    notificationEmptyTitle: 'Уведомлений пока нет',
    notificationEmptyText: 'Когда статус обращения изменится, сообщение появится здесь.',
    notificationEmptyAction: 'Посмотреть обращения',
    nav: { home: 'Главная', requests: 'Заявки', newRequest: 'Новое обращение', newShort: 'Новое', notifications: 'События', settings: 'Настройки' },
  },
  en: {
    appBarTitle: 'My cabinet',
    systemStatus: 'Online',
    personalLabel: 'Personal cabinet',
    citizenFallback: 'citizen',
    greeting: 'Hello, {name}',
    supporting: 'Track your requests in one place.',
    heroTitle: 'New request',
    heroDescription: 'Send a problem or suggestion.',
    heroAction: 'New request',
    totalRequests: 'Total',
    activeRequests: 'In progress',
    resolvedRequests: 'Resolved',
    recentRequests: 'Recent requests',
    allRequests: 'View all',
    requestNumber: 'Request number',
    organizationFallback: 'Responsible organization is being assigned',
    summaryFallback: 'Request text is being prepared',
    viewDetails: 'View details',
    statusPrefix: 'Status',
    emptyTitle: 'No requests yet',
    emptyText: 'Send a problem or suggestion and track its status here.',
    emptyAction: 'Send your first request',
    settingsTitle: 'Settings',
    settingsSection: 'Cabinet settings',
    languageSetting: 'Language',
    notificationsSetting: 'Notifications',
    aboutSetting: 'About the app',
    versionLabel: 'Version 0.1.0',
    verifiedLabel: 'Phone verified',
    logout: 'Sign out',
    notificationsTitle: 'Notifications',
    notificationEmptyTitle: 'No notifications yet',
    notificationEmptyText: 'When a request status changes, its message will appear here.',
    notificationEmptyAction: 'View requests',
    nav: { home: 'Home', requests: 'Requests', newRequest: 'New request', newShort: 'New', notifications: 'Alerts', settings: 'Settings' },
  },
};

export function getCabinetDesignCopy(language: Language): CabinetDesignCopy {
  return cabinetDesignCopy[language];
}
