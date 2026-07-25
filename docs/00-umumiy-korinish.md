# 00 — Umumiy ko'rinish

## Loyiha nomi

**e-Murojaat AI** — tumanlar uchun raqamli fuqaro xizmatlari platformasi (GovTech). Pilot: **Uychi tumani** (Namangan viloyati). Ticket prefiksi shu sababdan standart holda `UY`.

## Maqsad

Fuqaro murojaatini **bir necha daqiqada, ro'yxatdan o'tmasdan** topshiradi; AI murojaatni tushunadi, kategoriyalaydi, ustuvorlik beradi, mas'ul bo'limga yo'naltiradi va javob loyihasini yozadi; hokimiyat xodimi faqat tasdiqlaydi; rahbariyat KPI va statistikani real vaqtda ko'radi.

Ekotizim: **Fuqaro → AI → Hokimiyat → Mas'ul tashkilot → Monitoring → Analitika → KPI → Hisobot.**

## Bosh tamoyil: soddalik

Asosiy foydalanuvchi — **70+ yoshli, texnikadan yiroq, qishloqda yashovchi fuqaro, ko'pincha telefonda**. Shuning uchun:

- Ro'yxatdan o'tish YO'Q. Murojaat uchun faqat: muammo (matn/ovoz/rasm) + qayerda + ism/telefon.
- Bitta ekranda bitta savol (wizard). Katta shrift, katta tugmalar, tanish so'zlar.
- Kategoriya so'ralmaydi — AI o'zi aniqlaydi.
- Ovoz bilan yozdirish mumkin (mikrofon tugmasi) — yozishni bilmaganlar uchun.
- 4 til: o'zbek lotin (standart), o'zbek kirill, rus, ingliz.
- QR kod plakatlari: skanerlaganda "Veb orqali" yoki "Telegram orqali" tanlovi chiqadi.

To'liq qoidalar: [10-ui-ux.md](10-ui-ux.md).

## Modullar

| # | Modul | Tavsif | Workstream |
|---|---|---|---|
| 1 | Citizen Portal | Ochiq veb: murojaat wizard'i, holat tekshirish, QR landing | Frontend |
| 2 | AI Processing Engine | Lokal LLM (Ollama/Gemma) HAR murojaatda yagona qaror qabul qiluvchi: kategoriya, ustuvorlik, bo'limga yo'naltirish, xulosa, javob drafti, teglar; ovoz→matn (v1.3: keyword dvigateli olib tashlandi) | Backend/AI |
| 3 | Workflow Engine | Status lifecycle, egalik («Qabul qilaman»), SLA/deadline, eskalatsiya, ikki tomonlama ma'lumot sikli, bildirishnomalar | Backend |
| 4 | Admin Panel | Operatsion navbat (bosh ekran), murojaatlar jadvali/tafsiloti, javob editori, AI nazorati, bo'limlar, KPI | Frontend |
| 5 | Analytics | Mahalla/bo'lim/xodim KPI, heatmap, AI aniqlik metrikasi | Frontend+Backend |
| 6 | Telegram bot | Murojaat yuborish + holat + bildirishnoma, xuddi veb kabi sodda | Bot |
| 7 | Mobile app | V2 (Expo/React Native), public API ustida | Mobile |

## Rollar

- **Fuqaro (citizen)** — akkauntsiz murojaat yuboradi, ticket+telefon bilan holat ko'radi. (Ixtiyoriy kabinet — telefon+parol.)
- **Bo'lim xodimi (`department_staff`)** — o'z bo'limiga tushgan murojaatni **o'ziga qabul qiladi** («Qabul qilaman»), ish olib boradi, fuqarodan ma'lumot so'raydi, javob yozadi.
- **Admin** — hamma narsa: foydalanuvchilar, bo'limlar, kategoriyalar, sozlamalar, qo'lda yo'naltirish/qayta yo'naltirish, AI nazorati, operatsion navbat va KPI.

> **Yagona haqiqat manbai — [03](03-kontraktlar.md) §2.3.** v1.1/B6 da rol modeli 4 tadan 2 taga tushirilgan: `operator` + `employee` + `manager` → `department_staff`. TZ dagi "Super Admin"/"System Admin" ham bitta `admin` ga birlashtirilgan — 1 tuman miqyosida yetarli.

## MVP chegarasi (nima kiradi / kirmaydi)

**Kiradi (P1–P3):** guest murojaat (matn+rasm+ovoz+lokatsiya), ticket + SMS'siz holat tekshirish, LLM klassifikatsiya va avto-yo'naltirish (qayta urinish + sweeper bilan), fuqaro bilan ikki tomonlama ma'lumot almashish (web/Telegram/manual), fuqaro bahosi va qayta ochish, admin panel v2 (operatsion navbat, javob editori, bo'limlar, SLA, timeline), 4 til, ovoz→matn, Telegram bot, QR, SMS bildirishnoma (Eskiz), analitika/heatmap, audit log, rate limit.

**Kirmaydi (V2 backlog):** mobil ilova, rasm tahlili (vision), OCR, AI ovozli operator, takroriy murojaatlarni birlashtirish, E-IMZO, tashqi davlat API integratsiyalari, prognozlash, Open Data, Kubernetes. Ro'yxat: [12-roadmap.md](12-roadmap.md) oxirida.

## Muvaffaqiyat mezonlari

1. Fuqaro murojaatni **≤3 daqiqada**, hech qanday ro'yxatdan o'tishsiz topshiradi (jonli testda 60+ yoshli odam bilan tekshiriladi).
2. AI kategoriya aniqligi pilot oyida ≥85% (admin to'g'rilashlari bo'yicha o'lchanadi, tuzatish sababi majburiy — v1.4); zero-touch yo'naltirish ulushi ≥70%. LLM HAR murojaatda ishlaydi va hech qachon «tejash» uchun o'chirilmaydi (R0).
3. Har murojaat deadline'ga ega; kechikkanlar dashboard'da qizil ko'rinadi.
4. Hokim/rahbar 1 sahifada bugungi manzarani ko'radi.
5. Avtomatlashtirish KPI (dashboard, [03](03-kontraktlar.md) §5, R0): zero-touch routing ≥70%, draft-qabul ≥60%, biriktirilishdan birinchi xodim harakatigacha ≤4 soat, «resolved javob bilan» = 100%. «AI-powered» — his emas, shu to'rt raqam.
