# 06 — Frontend workstream (F-fazalar)

Egasi: frontend sherik. Stack: Next.js 16 App Router + Tailwind v4 (mavjud tokenlar) + next-intl + Leaflet + Recharts. Har task oldidan o'qish: [03-kontraktlar.md](03-kontraktlar.md), [10-ui-ux.md](10-ui-ux.md) (fuqaro sahifalari uchun MAJBURIY).

> Eslatma (frontend/AGENTS.md): Next.js 16.2 — API'lar training data'dan farq qilishi mumkin. Shubha bo'lsa `node_modules/next/dist/docs/` dagi hujjat o'qilsin.

Backend tayyor bo'lmagan endpointlar uchun: [03](03-kontraktlar.md) dagi JSON namunalar bilan ishlanadi (MSW yoki oddiy mock fetch, `NEXT_PUBLIC_API_MOCK=1`) — backend bitganda flag o'chiriladi.

## F1 — Fuqaro portali: guest oqim (P1) — LOYIHANING YURAGI

Sahifa spetsifikatsiyalari va matnlari: [10-ui-ux.md](10-ui-ux.md) §3–5. Fuqaro sahifalarida sidebar YO'Q — alohida engil `PublicLayout` (katta header: logo, til tanlagich, "Holatni tekshirish" havolasi).

- [x] **F1.1 (M)** next-intl 4.13 o'rnatildi, `src/i18n/{routing,navigation,request}.ts`, locale'lar `uz|oz|ru|en` (`localePrefix: 'as-needed'`), `messages/{uz,oz,ru,en}.json` (80 kalit), til tanlagich (matnli "O'z · Ўз · Ру · En", `GuestHeader`), `npm run i18n:check` (`scripts/i18n-check.mjs`). **Diqqat:** Next.js 16'da `middleware.ts`→`proxy.ts`, `middleware()`→`proxy()` nomlanishi o'zgargan (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`) — `src/proxy.ts` shunga mos yozildi.
- [x] **F1.2 (S)** `src/app/[locale]/` segmenti qo'shildi (`GuestShell`/`GuestHeader`/`GuestFooter`, sidebar'siz, max-width 640px). Eski `app/page.tsx` (fuqaro dashboard), `app/ariza/yangi`, `app/murojaatlarim`, `app/bildirishnomalar` o'chirildi (yangi backend bilan ishlamas edi, `/kabinet` F3.3'da qayta quriladi). `app/admin/*`, `/login`, `/register` — tegilmadi, `[locale]` tashqarisida qoladi (`proxy.ts` matcher orqali).
- [x] **F1.3 (M)** Landing (`src/app/[locale]/page.tsx`) — hero, 2 ulkan tugma, 3 qadam, footer. Docker'dagi real backend bilan brauzerda (uz/oz/ru/en, 375px+desktop) sinovdan o'tkazildi.
- [x] **F1.4 (L)** Wizard (`src/app/[locale]/yangi/page.tsx` + `components/wizard/*`) — 3 qadam to'liq: Step1 (textarea+ovoz+rasm+qo'shimcha accordion:kategoriya/video), Step2 (mahalla qidiruv ro'yxati+manzil+MapPicker), Step3 (ism+telefon avtoformat). Draft `lib/wizardDraft.ts` orqali localStorage'da (faqat matn maydonlari — fayllar serializatsiya qilinmaydi), `DraftPrompt` resume/discard. **To'liq end-to-end sinovdan o'tkazildi**: real backendga submit → ticket `UY-2026-000006` qaytdi → track sahifada to'g'ri ko'rindi.
- [x] **F1.5 (M)** `components/wizard/VoiceRecorder.tsx`: MediaRecorder (webm/opus), 120s limit+sekundlar, `/api/public/stt` + poll, natija matnga qo'shiladi. `isRecordingSupported()` bilan qurilma qo'llamasa yashiriladi.
- [x] **F1.6 (M)** `components/wizard/SuccessScreen.tsx`: ulkan ticket, nusxalash tugmasi, eslatmalar, "Holatini tekshirish"/"Bosh sahifa". Real submit bilan sinovdan o'tkazildi.
- [x] **F1.7 (M)** `src/app/[locale]/holat/page.tsx` + `components/guest/GuestTimeline.tsx`: vertikal 4 qadam, javob/rad/need_info kartalar, `?ticket=` prefill. Real backend bilan sinovdan o'tkazildi (sana formati `24-iyul, 16:54` — Intl'ning uz-UZ oy nomlari to'liq qo'llamagani uchun qo'lda formatlandi).
- [ ] **F1.8 (S)** Admin uchun mobil drawer menyu — F2 doirasida (bu sessiyada admin'ga tegilmadi).

**F1 Acceptance (C1):** ✅ 375px va desktop'da, uz/oz/ru/en tillarida, real backend bilan (Docker) ro'yxatdan o'tmasdan murojaat yuborildi, ticket qaytdi, `/holat` orqali holat tekshirildi. `npm run build` va `npm run lint` xatosiz. Faqat ochiq qism: F1.8 (admin mobil menyu, F2 bilan birga qilinadi) va jonli 60+ yoshli foydalanuvchi sinovi (checkpoint C1/C3 talabi, real odam bilan).

**Muhim topilma (keyingi ishlar uchun):** `GuestButton`ni `<Link>` ichiga o'rash `<button>`ni `<a>` ichiga joylab, navigatsiyani buzadi (noto'g'ri HTML, brauzerda click ishlamaydi). Yechim: `GuestLinkButton` (bir xil ko'rinish, lekin yagona `<a>` elementi) qo'shildi — navigatsiya uchun doim shundan foydalanilsin, `GuestButton`+`Link` kombinatsiyasi emas.

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
