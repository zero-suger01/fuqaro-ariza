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
- [x] Mobil bosh sahifada O'zbek lotin, O'zbek kirill, Русский va English til tanlovi (AsyncStorage bilan saqlanadi)
- [x] Mavjud `/api/public/neighborhoods`, `/api/public/complaints`, `/api/public/complaints/track`, `/api/public/support` kontraktlariga ulanish
- [x] Foto/video/ovoz va lokatsiyani native picker orqali yuborish
- [x] Push token registratsiyasi (Expo), notification handler va murojaat offline draft'i
- [x] Fuqaro kabineti ro'yxatdan o'tishida SMS OTP tasdiqlash
- [x] Fuqaro kabineti bosh ekrani uchun qayta ishlatiladigan «Contemporary Uzbek Civic Design» tizimi: tokenlar, status mapping, hero, statistika, murojaat kartasi, bottom navigation va original light/dark SVG patternlar qo'shildi; 375px/1280px Expo Web renderda tekshirildi.
- [x] «Quiet Uzbek Civic Modernism» corrective sprint: Home kompozitsiyasi va bottom navigation ixchamlashtirildi, Settings guruhlangan amaliy layoutga o'tkazildi, Notifications uchun original SVG empty state qo'shildi; 360×800 da useful content va uch ekran vizual tekshirildi.
- [ ] Push production delivery: EAS project ID va real Android/iOS device test

**Follow-up topilma:** mobil client `POST /api/public/complaints` da `source=mobile` yuboradi, `docs/03-kontraktlar.md` §2.3 esa hozircha `mobile` qiymatini sanamaydi. Joriy client/backend xulqi ushbu UI sprintida ataylab o'zgartirilmadi; keyingi kontrakt ko'rib chiqishda hujjat va amaldagi telemetriya semantikasi bir xil qilinishi kerak.

## M2/M3 qabul checklisti

### 60+ yoshli fuqaro bilan real test

- [ ] 375 px telefonda `/uz/yangi` ochiladi, matn va tugmalar kattaligi o'qiladi
- [ ] Fuqaro kategoriya, MFY, matn va telefonni mustaqil to'ldira oladi
- [ ] Rasm biriktirish va murojaat yuborish bajariladi
- [ ] Ticket raqami ekranda ko'rinadi va nusxalanadi
- [ ] `/uz/holat` orqali murojaat holati tekshiriladi
- [ ] Har bir qadamda xato xabari oddiy tilda tushunarli

### 4 til smoke testi

Veb build quyidagi yo'llarni tekshiradi: `/uz`, `/oz`, `/ru`, `/en` va ularning `/yangi`, `/holat`, `/kabinet`, `/go` sahifalari. Har bir tilda quyidagilar qo'lda tekshiriladi:

- [ ] Navigatsiya va forma yorliqlari tarjima qilingan
- [ ] Xato, yuklanish va muvaffaqiyat xabarlari tarjima qilingan
- [ ] Uzun rus/ingliz matni mobil viewportda kesilmaydi

### Real Android/iOS testi

- [ ] Android: Expo development build, kamera/media, lokatsiya va push ruxsatlari
- [ ] iOS: Expo development build, kamera/media, lokatsiya va push ruxsatlari
- [ ] Internet uzilganda draft saqlanadi, internet qaytganda yuboriladi
- [ ] Push kelganda notification banner/list ko'rinadi

Real fuqaro, fizik Android/iOS qurilma va push uchun EAS project ID tashqi test resursidir; avtomatik build tekshiruvi ularning o'rnini bosmaydi.

### Production va Expo Go bilan lokal ulanish

Mobil ilovaning standart API manzili: `https://ariza.xron.uz`. Expo QR orqali ochilganda alohida lokal IP sozlash shart emas; telefon internetga ulangan bo'lsa production API ishlaydi.

Telefon `127.0.0.1` ni o'zining manzili deb qabul qiladi. Shuning uchun `mobile/.env` ichida kompyuterning LAN IP'si (`EXPO_PUBLIC_API_URL=http://<LAN-IP>:8001`) yoziladi, backend esa `0.0.0.0:8001` ga bind qilinadi. Aks holda mahalla ro'yxati yuklanmaydi va keyingi qadamda "Mahallani tanlang" xatosi chiqadi. Expo Go remote pushni qo'llamaydi; bu xato emas, push uchun development build kerak.
