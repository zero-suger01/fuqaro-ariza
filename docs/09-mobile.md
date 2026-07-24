# 09 — Mobil ilova (V2 — hozir QILINMAYDI)

Bu workstream **P1–P3 da boshlanmaydi**. Veb portali mobile-first bo'lgani + Telegram bot bo'lgani uchun pilotda mobil ilova shart emas. Bu fayl kelajakdagi ishni kontrakt bilan moslab qo'yish uchun.

## Qarorlar (hozirdan qat'iy)

- Stack: **Expo (React Native) + TypeScript**, papka: `mobile/`.
- Faqat **mavjud public API** ishlatiladi ([03-kontraktlar.md](03-kontraktlar.md) §3). Mobil uchun alohida endpoint ochilmaydi — kerak bo'lsa docs-first tartibda qo'shiladi.
- Dizayn: veb wizard bilan AYNAN bir xil oqim va matnlar ([10-ui-ux.md](10-ui-ux.md)) — fuqaro qaysi kanalda bo'lsa ham bir xil tajriba.

## V2 scope (boshlanganda batafsil task'lanadi)

1. **M1:** Expo skeleti, i18n (4 til, veb messages JSON'laridan qayta foydalanish), murojaat wizard (matn/rasm/ovoz — expo-av, lokatsiya — expo-location), yuborish + ticket ekrani, holat tekshirish.
2. **M2:** Push bildirishnoma (Expo Push; backendga `push_tokens` jadvali va endpoint docs-first qo'shiladi), murojaatlarim (lokal saqlangan ticketlar), offline draft.
3. **M3:** Play Market / App Store nashr, OTA update (EAS).

## Nega hozir emas

2 kishilik jamoada P1–P3 (veb+AI+bot) muhimroq; ilova do'kon moderatsiyasi va signing bilan vaqt oladi; foydalanuvchi bazasi avval veb/botda tekshiriladi.
