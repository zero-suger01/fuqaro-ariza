# 06 — Frontend workstream (F-fazalar)

Egasi: frontend sherik. Stack: Next.js 16 App Router + Tailwind v4 (mavjud tokenlar) + next-intl + Leaflet + Recharts. Har task oldidan o'qish: [03-kontraktlar.md](03-kontraktlar.md), [10-ui-ux.md](10-ui-ux.md) (fuqaro sahifalari uchun MAJBURIY).

> Eslatma (frontend/AGENTS.md): Next.js 16.2 — API'lar training data'dan farq qilishi mumkin. Shubha bo'lsa `node_modules/next/dist/docs/` dagi hujjat o'qilsin.

Backend tayyor bo'lmagan endpointlar uchun: [03](03-kontraktlar.md) dagi JSON namunalar bilan ishlanadi (MSW yoki oddiy mock fetch, `NEXT_PUBLIC_API_MOCK=1`) — backend bitganda flag o'chiriladi.

## F1 — Fuqaro portali: guest oqim (P1) — LOYIHANING YURAGI

Sahifa spetsifikatsiyalari va matnlari: [10-ui-ux.md](10-ui-ux.md) §3–5. Fuqaro sahifalarida sidebar YO'Q — alohida engil `PublicLayout` (katta header: logo, til tanlagich, "Holatni tekshirish" havolasi).

- [ ] **F1.1 (M)** i18n poydevori: next-intl o'rnatish, locale'lar `uz|oz|ru|en` (`localePrefix: 'as-needed'`), `messages/*.json` skeleti, til tanlagich (bayroqsiz, matnli: "O'z / Ўз / Ру / En"), cookie'da saqlash, `npm run i18n:check` skripti (4 faylda kalitlar tengligi).
- [ ] **F1.2 (S)** `PublicLayout` + routing qayta qurish: `/` endi public landing; eski fuqaro dashboard `/kabinet` ga ko'chadi (P2'gacha yashirin); `/admin/*` o'z joyida qoladi.
- [ ] **F1.3 (M)** Landing (`/`): hero ("Murojaatingizni bir necha daqiqada yuboring"), 2 ta ulkan tugma: "Murojaat yuborish", "Murojaat holatini tekshirish"; pastda 3 qadam rasmli tushuntirish; footer (telefon, manzil). [10](10-ui-ux.md) §3.
- [ ] **F1.4 (L)** Murojaat wizard'i (`/yangi`) — 3 qadam, [10](10-ui-ux.md) §4 spec bo'yicha:
  - 1-qadam "Nima muammo?": katta textarea + 🎤 ovoz tugmasi (F1.5) + 📷 rasm qo'shish; kategoriya so'ralmaydi ("Qo'shimcha" accordion ichida ixtiyoriy select + video).
  - 2-qadam "Qayerda?": mahalla select (qidiruvli, katta), manzil matni, ixtiyoriy "Xaritadan belgilash" (MapPicker qayta ishlatiladi; markaz — Uychi).
  - 3-qadam "Siz haqingizda": ism, telefon (avtoformat `+998 (__) ___-__-__`), "Yuborish".
  - Har qadamda bitta ustun, katta tugmalar "Davom etish"/"Orqaga", progress nuqtalari. Draft localStorage'da (sahifa yopilsa yo'qolmasin).
- [ ] **F1.5 (M)** Ovoz yozish komponenti: MediaRecorder (webm/opus), max 120 s, yozish animatsiyasi, STT poll oqimi ([03](03-kontraktlar.md) §3.3), natija textarea'ga qo'shiladi ("Tekshirib oling" eslatmasi bilan). Qurilma qo'llamasa tugma yashirinadi.
- [ ] **F1.6 (M)** Muvaffaqiyat ekrani: ulkan ticket raqami, "Rasmga olib qo'ying" eslatmasi, SMS kelishi haqida matn, "Holatni tekshirish" tugmasi. + `POST /api/public/complaints` integratsiyasi (multipart, progress indikator).
- [ ] **F1.7 (M)** Holat sahifasi (`/holat`): 2 input (ticket, telefon) → 4 qadamli katta vizual timeline ([03](03-kontraktlar.md) §3.2 javobidan), javob matni bloki, rad etilgan holat, need_info banneri. URL query orqali prefill (`/holat?ticket=...`).
- [ ] **F1.8 (S)** Mobil navigatsiya tuzatish (K2): public sahifalar mobile-first; admin uchun mobil drawer menyu.

**F1 Acceptance (C1):** telefonda (375px) ro'yxatdan o'tmasdan murojaat yuboriladi (rasm bilan), ticket ko'rinadi, holat tekshiriladi — hammasi 4 tilda, `npm run build` xatosiz.

## F2 — Admin panel v2 (P2)

Mavjud admin sahifalar saqlanadi, yangi sxema/endpointlarga moslanadi:

- [ ] **F2.1 (M)** Ro'yxat: pagination envelope, yangi ustunlar (ticket, priority badge, deadline countdown/qizil overdue, bo'lim, needs_review belgisi), yangi filtrlar, global search input.
- [ ] **F2.2 (L)** Tafsilot sahifasi qayta qurish ([10](10-ui-ux.md) §6): chapda — media galereya (rasm/video/audio player), matn, xarita, fuqaro kartasi; o'ngda — AI paneli (kategoriya+confidence, priority, sentiment, summary, teglar, needs_review ogohlantirish), status boshqaruvi (state-machine'ga mos tugmalar), biriktirish (bo'lim+xodim), timeline (events).
- [ ] **F2.3 (M)** Javob editori: AI draft preload, tahrir, "Yuborish" (kanallar checkbox: SMS/Telegram) → `POST .../replies`; yuborilgach timeline'da.
- [ ] **F2.4 (M)** Bo'limlar CRUD sahifasi (tashkilotlar sahifasi o'rniga), xodimlar CRUD (rol, bo'lim), faqat admin ko'radi.
- [ ] **F2.5 (M)** Keyword boshqaruvi: kategoriya→keywordlar jadvali (qo'shish/o'chirish), **Suggestions inbox**: kutilayotgan takliflar (phrase, occurrences, namuna matnlar, taklif kategoriya) → Approve/Reject tugmalari.
- [ ] **F2.6 (S)** Dashboard yangilash: overdue/needs_review kartalari, ai_accuracy_7d, priority breakdown.
- [ ] **F2.7 (S)** RBAC UI: rolga qarab menyu/tugmalar (employee o'z bo'limi, manager KPI ko'radi...). `auth/me` dagi `role` dan.

## F3 — QR landing va kabinet (P2–P3)

- [ ] **F3.1 (S)** `/go` sahifasi ([10](10-ui-ux.md) §7): 2 ulkan tugma — "🌐 Veb orqali yuborish" (→ `/yangi?qr=<code>`) va "✈️ Telegram orqali" (→ `t.me/<bot>?start=qr_<code>`); `?m=<code>` bo'lsa mahalla nomi ko'rsatiladi va wizard'ga prefill.
- [ ] **F3.2 (S)** Admin QR sahifasi: mahalla tanlab QR yaratish, PNG/PDF plakat yuklab olish, skan statistikasi.
- [ ] **F3.3 (M)** Fuqaro kabineti (`/kabinet`, ixtiyoriy): telefon+parol login, o'z murojaatlari ro'yxati; wizard'da "kirganman" bo'lsa ism/telefon prefill. (Eski `/murojaatlarim`, `/bildirishnomalar` sahifalari shu bo'limga ko'chadi.)

## F4 — Analitika UI (P3)

- [ ] **F4.1 (M)** Xarita dashboard: barcha murojaatlar Leaflet'da (marker cluster) + heatmap layer (leaflet.heat), filtrlar (sana, kategoriya, status).
- [ ] **F4.2 (M)** KPI sahifalari: bo'lim/xodim/mahalla jadvallari (SLA %, o'rtacha vaqtlar), AI KPI bloki (aniqlik trendi, LLM ulushi kamayishi grafigi).
- [ ] **F4.3 (S)** Excel eksport tugmasi (filtrlangan ro'yxat).

## F5 — Sayqal (P3)

- [ ] **F5.1 (S)** Accessibility audit: [10](10-ui-ux.md) §8 checklist (kontrast, focus, aria, 200% zoom).
- [ ] **F5.2 (S)** PWA-lite: manifest + ikonlar ("Bosh ekranga qo'shish" uchun), meta/OG teglar, favicon.
- [ ] **F5.3 (S)** Bo'sh/xato holatlar: offline xabar, 404, server xato sahifalari — sodda tilda.
- [ ] **F5.4 (S)** Lighthouse mobil ≥90 (performance/a11y) public sahifalarda.

## Doimiy qoidalar

- Fuqaro sahifalarida [10-ui-ux.md](10-ui-ux.md) §2 qoidalari MAJBURIY (shrift ≥18px, tugma ≥56px, bitta ustun, texnik so'z yo'q).
- Hamma matnlar faqat `messages/*.json` orqali — komponentda hardcoded string taqiqlanadi (admin sahifalari P2'gacha istisno: uz hardcoded qolishi mumkin, lekin yangi matnlar baribir kalit bilan yozilsin).
- API chaqiruvlar faqat `lib/api.ts` orqali; tiplar `lib/types.ts` da [03](03-kontraktlar.md) ga mos yangilanadi (bitta PR'da).
- Har task: `npm run lint && npm run build` yashil; mobil (375px) va desktop (1280px) tekshirilgan.
