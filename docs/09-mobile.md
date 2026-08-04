# 09 — Mobil ilova (V2 — M1 boshlandi)

Expo + React Native skeleti `mobile/` papkasida yaratildi. Birinchi M1 oqimi real public API bilan ishlaydi; keyingi native imkoniyatlar bosqichma-bosqich qo'shiladi.

## Qarorlar (hozirdan qat'iy)

- Stack: **Expo (React Native) + TypeScript**, papka: `mobile/`.
- Faqat **mavjud public API** ishlatiladi ([03-kontraktlar.md](03-kontraktlar.md) §3). Mobil uchun alohida endpoint ochilmaydi — kerak bo'lsa docs-first tartibda qo'shiladi.
- Dizayn: veb wizard bilan AYNAN bir xil oqim va matnlar ([10-ui-ux.md](10-ui-ux.md)) — fuqaro qaysi kanalda bo'lsa ham bir xil tajriba.

## V2 scope (boshlanganda batafsil task'lanadi)

1. **M1:** Expo skeleti, i18n (4 til, veb messages JSON'laridan qayta foydalanish), murojaat wizard (matn/rasm/ovoz — expo-av, lokatsiya — expo-location), yuborish + ticket ekrani, holat tekshirish.
2. **M2:** Push bildirishnoma (Expo Push; backendga `push_tokens` jadvali va endpoint docs-first qo'shiladi), murojaatlarim (lokal saqlangan ticketlar), offline draft.
3. **M3:** Play Market / App Store nashr, OTA update (EAS).

## M1 holati (2026-08-04)

- [x] Expo skeleti, typed API client va Android/iOS konfiguratsiyasi
- [x] Fuqaro bosh sahifasi, murojaat yuborish wizard'i va ticket holatini tekshirish
- [x] Mavjud `/api/public/neighborhoods`, `/api/public/complaints`, `/api/public/complaints/track`, `/api/public/support` kontraktlariga ulanish
- [x] Foto/video/ovoz va lokatsiyani native picker orqali yuborish
- [ ] Push bildirishnoma, lokal ticketlar va offline draft
