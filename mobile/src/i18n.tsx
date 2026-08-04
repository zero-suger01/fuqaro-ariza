import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export type Language = 'uz' | 'oz' | 'ru' | 'en';
export const languages: { code: Language; label: string; short: string }[] = [
  { code: 'uz', label: "O'zbekcha", short: "O'z" },
  { code: 'oz', label: 'Ўзбекча', short: 'Ўз' },
  { code: 'ru', label: 'Русский', short: 'Рус' },
  { code: 'en', label: 'English', short: 'EN' },
];

type Copy = { brand: string; region: string; cabinet: string; badge: string; title: string; subtitle: string; submit: string; track: string; infoTitle: string; infoText: string; help: string; telegram: string };
const copy: Record<Language, Copy> = {
  uz: { brand: 'e-Murojaat', region: 'Namangan viloyati', cabinet: 'Kabinetim', badge: 'Fuqarolar uchun yagona portal', title: 'Murojaatingiz\ne’tiborsiz qolmaydi.', subtitle: 'Muammoni yozing. Biz uni kerakli tashkilotga yetkazamiz va javobni kuzatishingiz mumkin.', submit: 'Murojaat yuborish', track: 'Murojaat holatini tekshirish', infoTitle: 'Raqam bilan nazorat qiling', infoText: 'Yuborgandan keyin beriladigan raqamni saqlab qo‘ying.', help: 'Yordam kerakmi?', telegram: 'Telegram botga o‘tish' },
  oz: { brand: 'e-Мурожаат', region: 'Наманган вилояти', cabinet: 'Кабинетим', badge: 'Фуқаролар учун ягона портал', title: 'Мурожаатингиз\nэътиборсиз қолмайди.', subtitle: 'Муаммони ёзинг. Биз уни керакли ташкилотга етказамиз ва жавобни кузатишингиз мумкин.', submit: 'Мурожаат юбориш', track: 'Мурожаат ҳолатини текшириш', infoTitle: 'Рақам билан назорат қилинг', infoText: 'Юборгандан кейин берилган рақамни сақлаб қўйинг.', help: 'Ёрдам керакми?', telegram: 'Telegram ботга ўтиш' },
  ru: { brand: 'e-Мурожаат', region: 'Наманганская область', cabinet: 'Мой кабинет', badge: 'Единый портал для граждан', title: 'Ваше обращение\nне останется без внимания.', subtitle: 'Опишите проблему. Мы направим её в нужную организацию и поможем отслеживать ответ.', submit: 'Отправить обращение', track: 'Проверить статус обращения', infoTitle: 'Контролируйте по номеру', infoText: 'Сохраните номер, который получите после отправки.', help: 'Нужна помощь?', telegram: 'Перейти в Telegram-бот' },
  en: { brand: 'e-Murojaat', region: 'Namangan region', cabinet: 'My cabinet', badge: 'One portal for citizens', title: 'Your request\nwill not be ignored.', subtitle: 'Describe the problem. We will send it to the right organization and help you track the response.', submit: 'Send a request', track: 'Check request status', infoTitle: 'Track with your number', infoText: 'Save the number you receive after submitting.', help: 'Need help?', telegram: 'Open Telegram bot' },
};

type I18nValue = { language: Language; setLanguage: (language: Language) => void; t: Copy };
const I18nContext = createContext<I18nValue>({ language: 'uz', setLanguage: () => undefined, t: copy.uz });

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>('uz');
  useEffect(() => { AsyncStorage.getItem('emurojaat_language').then((value) => { if (value && value in copy) setLanguageState(value as Language); }); }, []);
  const setLanguage = (value: Language) => { setLanguageState(value); void AsyncStorage.setItem('emurojaat_language', value); };
  const value = useMemo(() => ({ language, setLanguage, t: copy[language] }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
