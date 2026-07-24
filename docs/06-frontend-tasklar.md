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

- [x] **F2.1 (M)** Ro'yxat (`app/admin/murojaatlar/page.tsx`): `Page<T>` pagination (oldingi/keyingi), ustunlar (ticket, priority+status badge, deadline+qizil overdue matni, needs_review belgisi), filtrlar (holat/kategoriya/bo'lim/muhimlik/sana/overdue/needs_review), qidiruv (`q`). Real backend bilan sinovdan o'tkazildi (6 ta murojaat, filtrlar, badge ranglar to'g'ri).
- [x] **F2.2 (L)** Tafsilot sahifasi (`app/admin/murojaatlar/[id]/page.tsx`) qayta qurildi: chapda media/matn/fuqaro kartasi/xarita/ichki izohlar/voqealar tarixi; o'ngda holat+status tugmalari (faqat `STATUS_TRANSITIONS` ∩ rol ruxsati — masalan `in_progress`dan faqat "Ma'lumot kutilmoqda"/"Hal qilindi" ko'rinadi), AI paneli (dvigatel/ishonch/muhimlik/kayfiyat/xulosa/teglar, needs_review'da sariq ramka), bo'limga biriktirish, javob editori. Real murojaatda status o'zgartirish sinovdan o'tkazildi — voqealar tarixiga yangi yozuv qo'shildi, keyingi tugmalar to'g'ri yangilandi.
- [x] **F2.3 (M)** Javob editori: mavjud bo'lsa AI `suggested_reply` avtomatik matn maydoniga tushadi, tahrirlanadi, "Yuborish" → `POST .../replies`. Kanal checkboxlari qo'shilmadi — backend hozircha faqat `text` qabul qiladi (kanal tanlash SMS/Telegram B4 bilan birga keladi). Oldingi B3 test-javobi ("Hurmatli fuqaro, muammo ertaga bartaraf etiladi.") sahifada to'g'ri ko'rindi.
- [x] **F2.4 (M)** `app/admin/bolimlar/page.tsx` (departments CRUD, 14 ta bo'lim to'g'ri ko'rindi) va `app/admin/xodimlar/page.tsx` (users CRUD, rol+bo'lim). Ikkalasi ham `requireRoles={["admin"]}` bilan himoyalangan.
- [x] **F2.5 (M)** `app/admin/kategoriyalar/page.tsx`: 15 kategoriya ro'yxati + tanlangan kategoriyaning keyword'lari (qo'shish/o'chirish, `seed` manbali so'zlar o'chirilmaydi). `app/admin/takliflar/page.tsx`: suggestions inbox (Approve/Reject). B2 sessiyasida yaratilgan sun'iy takliflar bilan to'liq sinovdan o'tkazilgan (approve → keyword bazasiga tushishi tasdiqlangan).
- [x] **F2.6 (S)** Dashboard (`app/admin/page.tsx`) yangilandi: overdue/needs_review kartalari (qizil, agar >0), muhimlik bo'yicha taqsimot, `ai_accuracy_7d` ko'rsatkichi. Eski `/admin/statistika` (endi backend'da yo'q `/api/admin/stats/charts`ga tayangan edi) olib tashlandi — to'liq analitika F4'da qayta quriladi.
- [x] **F2.7 (S)** `AppShell` endi `user.kind !== "staff"` tekshiradi (eski `role !== "admin"` o'rniga), sidebar admin-only bo'limlarni (`Bo'limlar`/`Xodimlar`/`Kategoriyalar`/`Keyword takliflari`) faqat `role === "admin"` bo'lsa ko'rsatadi, sahifa darajasida `requireRoles` prop bilan qo'shimcha himoya.

**F2 real sinov natijasi:** login (staff) → dashboard (real statistika) → murojaatlar ro'yxati (filtrlar) → tafsilot (status o'zgartirish, ichki izoh, javob) → bo'limlar → xodimlar — barchasi Docker'dagi backend bilan xatosiz ishladi. `npm run build`/`lint` toza. **Muhim:** eski `lib/types.ts`/`lib/auth.tsx`/`lib/status.ts` to'liq yangi kontraktga almashtirildi (F1'dagi kabi qo'shimcha emas) — F1 fuqaro sahifalari bu fayllarni ishlatmagani uchun buzilmadi.

## F3 — QR landing va kabinet (P2–P3)

- [x] **F3.1 (S)** `src/app/[locale]/go/page.tsx`: `?m=<code>` bo'lsa `GET /api/public/qr/{code}` chaqirib mahalla nomi ko'rsatiladi (topilmasa/eski bo'lsa jimgina shaxsiylashtirmasdan davom etadi). 2 ulkan tugma — "🌐 Shu yerda (saytda)" (→ `/yangi?qr=<code>`) va "✈️ Telegram orqali" (→ `t.me/<NEXT_PUBLIC_TELEGRAM_BOT_USERNAME>?start=qr_<code>`, env bo'sh bo'lsa — hozirgi holat, bot hali yo'q — tugma o'chirilgan va "tez orada" matni chiqadi, soxta username o'ylab topilmadi). `/yangi` sahifasi `?qr=` parametrini o'qib mahallani avtomatik tanlaydi va `source=qr`+`qr_code` bilan yuboradi. **Yon effekt (backend):** `GET /api/public/qr/{code}`dagi skan hisoblagichi kontraktga (`docs/03-kontraktlar.md` §B5.4 izohi) mos qilib shu endpointga ko'chirildi — avval faqat `submit_complaint`da (qr_code maydoni bo'lsa) oshar edi, bu ko'pchilik "skan qilib ko'rib yubormagan" holatlarni yo'qotardi; QR mahallasiz bo'lsa endi 404 emas, shunchaki `neighborhood_name: null` qaytadi. **Docker'da real sinovdan o'tkazildi:** qo'lda `qr_codes`ga test yozuv qo'shildi (`test-qr-1` → NAMUNA-Markaziy MFY), `/go?m=test-qr-1` mahalla nomini ko'rsatdi va skanni oshirdi (0→1), "Shu yerda" tugmasi `/yangi?qr=test-qr-1`ga o'tkazdi, Step2'da mahalla avtomatik tanlangan holda ko'rindi (oltin fon + "Davom etish" darhol faol). 375px va desktopda tekshirildi.
- [ ] **F3.2 (S)** Admin QR sahifasi: mahalla tanlab QR yaratish, PNG/PDF plakat yuklab olish, skan statistikasi. **Bloklangan:** backend QR CRUD (B5.4 — `POST /api/admin/qr-codes` va PNG/PDF generatsiya) hali yo'q, faqat `GET /api/public/qr/{code}` (lookup) bor. B5.4 tugagach qilinadi.
- [x] **F3.3 (M)** Fuqaro kabineti (`src/app/[locale]/kabinet/page.tsx`): telefon+parol login/ro'yxatdan o'tish (`POST /api/auth/login|register` to'g'ridan-to'g'ri chaqiriladi — sahifa o'zi `AuthProvider`ga ulanmagan, chunki u faqat admin daraxtida va har bir fuqaro sahifasida keraksiz `/api/auth/me` so'rovi qo'shib qo'yardi), so'ng `GET /api/citizen/complaints` bilan ro'yxat (ticket+status badge+kategoriya+sana). "Yangi murojaat yuborish" va "Chiqish" tugmalari. `GuestFooter`ga barcha fuqaro sahifalarida ko'rinadigan "Mening murojaatlarim" havolasi qo'shildi (landing'ning 2-tugmali hero dizayni o'zgartirilmadi). Sana formatlash (`formatDate`) `GuestTimeline.tsx`dan umumiy `lib/formatDate.ts`ga chiqarildi — ikkalasi ham shu yerdan foydalanadi. Wizard'da "kirganman" bo'lsa avtomatik ism/telefon prefill qilinmadi (M o'lchamli task doirasidan tashqari — kabinet hali `AuthProvider`ga ulanmagani uchun wizard buni bilmaydi; kerak bo'lsa alohida kichik task). **Docker'da real sinovdan o'tkazildi:** yangi telefon bilan ro'yxatdan o'tildi → shu telefon bilan guest sifatida murojaat yuborildi (curl) → kabinetni yangilagandan keyin ro'yxatda to'g'ri ko'rindi (ticket, "Qabul qilindi" badge, kategoriya, sana) → chiqish → qayta kirish orqali sessiya tasdiqlandi. 375px va desktopda tekshirildi.

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
