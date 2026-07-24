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
| 2 | AI Processing Engine | Gibrid klassifikator (keyword → lokal LLM fallback), ovoz→matn, summary, javob drafti | Backend/AI |
| 3 | Workflow Engine | Status lifecycle, SLA/deadline, eskalatsiya, bildirishnomalar | Backend |
| 4 | Admin Panel | Dashboard, murojaatlar jadvali/tafsiloti, javob editori, bo'limlar, keyword tasdiqlash | Frontend |
| 5 | Analytics | Mahalla/bo'lim/xodim KPI, heatmap, AI aniqlik metrikasi | Frontend+Backend |
| 6 | Telegram bot | Murojaat yuborish + holat + bildirishnoma, xuddi veb kabi sodda | Bot |
| 7 | Mobile app | V2 (Expo/React Native), public API ustida | Mobile |

## Rollar

- **Fuqaro (citizen)** — akkauntsiz murojaat yuboradi, ticket+telefon bilan holat ko'radi. (Ixtiyoriy kabinet — telefon+parol.)
- **Operator** — kelgan murojaatlarni tekshiradi, AI natijasini tasdiqlaydi/to'g'rilaydi, yo'naltiradi.
- **Bo'lim xodimi (employee)** — biriktirilgan murojaat ustida ishlaydi, javob yozadi.
- **Bo'lim boshlig'i (manager)** — bo'lim murojaatlarini va KPI ni ko'radi, javobni tasdiqlaydi.
- **Admin** — hamma narsa: foydalanuvchilar, bo'limlar, kategoriyalar, sozlamalar, keyword tasdiqlash.

(TZ dagi "Super Admin" va "System Admin" bu bosqichda bitta `admin` roliga birlashtirilgan — 1 tuman miqyosida yetarli. Kelajakda ajratish mumkin.)

## MVP chegarasi (nima kiradi / kirmaydi)

**Kiradi (P1–P3):** guest murojaat (matn+rasm+ovoz+lokatsiya), ticket + SMS'siz holat tekshirish, gibrid AI klassifikatsiya + Ollama fallback, o'rganish sikli (keyword suggestions), admin panel v2 (javob editori, bo'limlar, SLA, timeline), 4 til, ovoz→matn, Telegram bot, QR, SMS bildirishnoma (Eskiz), analitika/heatmap, audit log, rate limit.

**Kirmaydi (V2 backlog):** mobil ilova, rasm tahlili (vision), OCR, AI ovozli operator, takroriy murojaatlarni birlashtirish, E-IMZO, tashqi davlat API integratsiyalari, prognozlash, Open Data, Kubernetes. Ro'yxat: [12-roadmap.md](12-roadmap.md) oxirida.

## Muvaffaqiyat mezonlari

1. Fuqaro murojaatni **≤3 daqiqada**, hech qanday ro'yxatdan o'tishsiz topshiradi (jonli testda 60+ yoshli odam bilan tekshiriladi).
2. AI kategoriya aniqligi pilot oyida ≥85% (operator to'g'rilashlari bo'yicha o'lchanadi), LLM chaqiruvlari ulushi vaqt o'tishi bilan kamayadi (keyword bazasi o'sadi).
3. Har murojaat deadline'ga ega; kechikkanlar dashboard'da qizil ko'rinadi.
4. Hokim/rahbar 1 sahifada bugungi manzarani ko'radi.
