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
    systemStatus: 'Tizim ishlamoqda',
    personalLabel: 'Shaxsiy kabinet',
    citizenFallback: 'fuqaro',
    greeting: 'Assalomu alaykum, {name}',
    supporting: 'Murojaatlaringiz holatini bir joydan kuzating.',
    heroTitle: 'Muammo yoki taklifingiz bormi?',
    heroDescription: 'Yangi murojaat yuboring va uning ko‘rib chiqilishini kuzating.',
    heroAction: 'Yangi murojaat',
    totalRequests: 'Jami murojaatlar',
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
    nav: { home: 'Asosiy', requests: 'Murojaat', newRequest: 'Yangi murojaat', newShort: 'Yangi', notifications: 'Xabarlar', settings: 'Sozlamalar' },
  },
  oz: {
    appBarTitle: 'Кабинетим',
    systemStatus: 'Тизим ишламоқда',
    personalLabel: 'Шахсий кабинет',
    citizenFallback: 'фуқаро',
    greeting: 'Ассалому алайкум, {name}',
    supporting: 'Мурожаатларингиз ҳолатини бир жойдан кузатинг.',
    heroTitle: 'Муаммо ёки таклифингиз борми?',
    heroDescription: 'Янги мурожаат юборинг ва унинг кўриб чиқилишини кузатинг.',
    heroAction: 'Янги мурожаат',
    totalRequests: 'Жами мурожаатлар',
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
    nav: { home: 'Асосий', requests: 'Мурожаат', newRequest: 'Янги мурожаат', newShort: 'Янги', notifications: 'Хабарлар', settings: 'Созламалар' },
  },
  ru: {
    appBarTitle: 'Мой кабинет',
    systemStatus: 'Система работает',
    personalLabel: 'Личный кабинет',
    citizenFallback: 'гражданин',
    greeting: 'Здравствуйте, {name}',
    supporting: 'Следите за всеми обращениями в одном месте.',
    heroTitle: 'Есть проблема или предложение?',
    heroDescription: 'Отправьте новое обращение и следите за его рассмотрением.',
    heroAction: 'Новое обращение',
    totalRequests: 'Всего обращений',
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
    nav: { home: 'Главная', requests: 'Заявки', newRequest: 'Новое обращение', newShort: 'Новое', notifications: 'События', settings: 'Настройки' },
  },
  en: {
    appBarTitle: 'My cabinet',
    systemStatus: 'System operational',
    personalLabel: 'Personal cabinet',
    citizenFallback: 'citizen',
    greeting: 'Hello, {name}',
    supporting: 'Track all your requests in one place.',
    heroTitle: 'Have a problem or suggestion?',
    heroDescription: 'Send a new request and follow its review.',
    heroAction: 'New request',
    totalRequests: 'Total requests',
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
    nav: { home: 'Home', requests: 'Requests', newRequest: 'New request', newShort: 'New', notifications: 'Alerts', settings: 'Settings' },
  },
};

export function getCabinetDesignCopy(language: Language): CabinetDesignCopy {
  return cabinetDesignCopy[language];
}
