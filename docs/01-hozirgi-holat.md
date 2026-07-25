# 01 — Hozirgi holat (codebase auditi)

Audit sanasi: **2026-07-25**, `main` (B1–B6 + R1–R2 backend to'liq; F1–F4 + R1–R2 frontend to'liq; T1/T3.1/T3.2 Telegram bot kod jihatdan tayyor). Bu hujjat — "nima bor, nima yo'q" ning haqiqiy manzarasi.

**S1–S2 (2026-07-25, QA tekshiruvi asosida — kontrakt v1.4):** `QA-TEST` murojaati fuqarodan yopilgungacha yurgizildi va 5 ta P0 nuqson tasdiqlandi, kodda oltinchisi topildi. Tuzatilgani: (1) `need_info` sikli **uchala kanalda** yopildi — `/holat` formasi, Telegram bot, manual (xodim telefonda eshitganini yozadi); savol matni majburiy va fuqaroga yetkaziladi; web/Telegram javob murojaatni avtomatik `in_progress` ga qaytaradi. (2) Avto-`accepted` bekor qilindi — **«Qabul qilaman»** tugmasi, `assigned_user_id` va `accepted_at` shu yerda qo'yiladi. (3) `assign()` egalikni saqlaydi (avval AI/review uni `None` ga qaytarardi) va `accepted` holatda qayta yo'naltirish 422 bermaydi. (4) `deadline_at` intake paytida qo'yiladi — LLM ishlamasa ham murojaat SLA radarida. (5) Seed admin faqat env bilan, birinchi kirishda parol almashtirish majburiy, demo yozuvlar `--demo` ostida. (6) Testlar **alohida bazada**, per-test rollback bilan — dev bazaga chiqindi qoldirmaydi. Qo'shimcha: operatsion bosh ekran (5 navbat kartasi + bo'limlar kesimi), guruhli menyu, idoralararo sub-tasklar, fuqaro bahosi va qayta ochish, `stuck_ai` fallback navbati, audit log UI. Tafsilot: [05](05-backend-tasklar.md) S1–S2, [06](06-frontend-tasklar.md) S1–S2.

**R1–R2 (2026-07-25, premortem asosida):** AI endi "fallback" emas — LLM har murojaatda ishlab, xulosa + tayyor javob drafti yaratadi ([07](07-ai-layer.md) §1); xodim ish navbatini ko'radi va murojaatni bir bosishda yopadi; `resolved` javobsiz mumkin emas; bildirishnoma qo'ng'irog'i ulandi; lifecycle (auto-close/archive), SLA-75% ogohlantirishi, AI salomatlik indikatori va 4 avtomatlashtirish KPI qo'shildi. Tafsilot: [05](05-backend-tasklar.md) R1–R2, [06](06-frontend-tasklar.md) R1–R2.

Qolgan to'siqlar: real `TELEGRAM_BOT_TOKEN` (@BotFather), Eskiz SMS kalitlari, DevOps (D2–D8), jonli 60+ UX testi.

## 1. Nima bor (ishlaydi)

### Backend — FastAPI (Python), `backend/`

- **Stack:** FastAPI 0.115, SQLAlchemy 2, Alembic, PostgreSQL (5433), Redis (6379) + ARQ worker (jobs + kunlik/30-daqiqalik cronlar), MinIO (boto3, `python-magic` fayl validatsiyasi, Pillow+`pillow-heif` EXIF strip), JWT (python-jose), bcrypt, `faster-whisper` (STT), `httpx` (Ollama, Eskiz, Turnstile), `segno`+`reportlab` (QR PNG/PDF, Noto Sans shrifti kirill uchun).
- **DB sxemasi to'liq [04-database.md](04-database.md) ga mos:** citizens, users(staff), departments, categories, neighborhoods, complaints(+barcha yangi ustunlar), complaint_files, complaint_events, replies, ai_analyses, stt_jobs, ticket_counters, qr_codes, settings, audit_logs. (`category_keywords`/`keyword_suggestions` v1.3/M8 da tashlangan.) Alembic migratsiyalari M1–M8 — bo'sh bazadan `alembic upgrade head` toza o'tadi.
- **Seed** (`app/seed.py`, idempotent): 14 bo'lim + 15 kategoriya (4 tilda), admin, 3 ta settings. `app/tools/import_neighborhoods.py` — CSV import ishlaydi va sinovdan o'tgan: `backend/data/uychi_mfy_SAMPLE.csv` (8 ta "NAMUNA —" belgili o'ylab topilgan nom) import qilindi, `/api/public/neighborhoods` va wizard Step2'da to'g'ri ko'rinmoqda. **Bu haqiqiy ma'lumot emas** — internetdan Uychi tumani rasmiy 62 ta MFY ro'yxatini ishonchli topib bo'lmadi, hokimlikdan real ro'yxat kutilmoqda (tafsilot: [04-database.md](04-database.md) §neighborhoods).
- **Guest oqim (auth YO'Q):** `POST /api/public/complaints`, `GET /api/public/complaints/track`, `GET /api/public/categories|neighborhoods|qr/{code}`, `POST/GET /api/public/stt[/{id}]`.
- **AI (v1.3 — LLM yagona dvigatel):** `analyze_complaint` bitta yugurishda kategoriya + ustuvorlik + bo'limga yo'naltirish + xulosa/javob drafti; qayta urinish zanjiri + har 15 daqiqada sweeper cron; STT (faster-whisper) alohida. Keyword lug'ati, normalizatsiya va o'rganish sikli olib tashlangan.
- **Admin API:** complaints (pagination+filtrlar+detail+status+assign+review+replies+comments), departments/categories/users CRUD, dashboard/ai-health/kpi/heatmap. RBAC (B6, 2 rol — `department_staff` bo'lim cheklovi bilan, `admin` hammasi) va rol asosidagi status ruxsatlari ishlaydi. AI ishonchli bo'lganda murojaat avtomatik bo'limga biriktiriladi (B6, `classify_complaint` worker).
- **Fuqaro kabineti:** `GET /api/citizen/complaints`.
- **Auth:** `/api/auth/register|login|me` (staff YOKI citizen, JWT `kind` claim).
- **QR CRUD (B5.4):** `GET/POST /api/admin/qr-codes` (admin-only) — `segno` bilan PNG, `reportlab`+Noto Sans (kirill uchun) bilan A4 plakat PDF, MinIO'ga deterministik kalit bilan saqlanadi (`qr-posters/{code}.png|.pdf` — yangi DB ustuni shart emas). `GET /api/public/qr/{code}` skan hisoblagichini oshiradi (F3.1 sessiyasida ko'chirilgan).
- **Analitika (B5.1-B5.5):** `GET /api/admin/stats/heatmap?date_from=&date_to=` (B6'dan beri admin-only) — `[{lat,lng,weight}]`, koordinatalar ~11m aniqlikda guruhlanadi. `GET /api/admin/stats/kpi?group_by=department|user|neighborhood|category&date_from=&date_to=` (B6'dan beri admin-only) — har guruh uchun `total`/`resolved`/`avg_first_response_hours`/`avg_resolution_hours`/`sla_percent`. `GET /api/admin/stats/dashboard`ga `by_neighborhood`, `ai_auto_routed_7d`, `ai_routing_corrected_7d` qo'shildi. `GET /api/admin/stats/map-points` (F4.1 uchun, alohida murojaat nuqtalari) va `GET /api/admin/stats/ai-trend` (F4.2 uchun, kunlik aniqlik/LLM ulushi) — kontraktda yo'q edi, F4 talabini qondirish uchun qo'shildi (ikkalasi ham B6'dan beri admin-only). `GET /api/admin/complaints/export.xlsx` (B5.5, openpyxl, admin-only). Global qidiruv (`?q=` ILIKE) allaqachon B1.9'da tayyor edi.
- **Bildirishnoma va xavfsizlik (B4, qisman):** Eskiz SMS (`app/services/sms.py`, token Redis'da keshlanadi) — 4 tilli shablonlar (`app/i18n/messages.py`) qabul/status/javob uchun, `notifications` jadvaliga `sent`/`failed` yozadi, `ESKIZ_EMAIL/PASSWORD` sozlanmasa jimgina o'tkazib yuboradi. Rate limit (`app/core/ratelimit.py`, Redis fixed-window): submit 5/soat/telefon+20/kun/IP, STT 10/soat/IP, track 30/soat/IP (kontraktdan tashqari, enumeration himoyasi uchun qo'shildi) → 429 `rate_limited`. CAPTCHA (`app/services/captcha.py`, Cloudflare Turnstile) — `TURNSTILE_SECRET_KEY` bo'lmasa o'chirilgan (hozirgi holat). **Docker'da real sinovdan o'tkazildi:** 6-submit/soat → 429, SMS urinishlari `failed` sifatida to'g'ri yozilmoqda.
- **Xato formati:** global handler — hamma xato `{"detail","code"}`.
- **Testlar:** `pytest -m smoke` — 4/4 yashil.
- **Infra:** `docker-compose.yml` — Postgres + MinIO + Redis.

### Frontend — Next.js, `frontend/`

- **Fuqaro qismi (F1) — TO'LIQ ISHLAYDI, real backend bilan sinovdan o'tkazilgan:** next-intl (`uz|oz|ru|en`, `localePrefix: as-needed`, `src/proxy.ts` — Next.js 16'da `middleware`→`proxy` nomlanishi o'zgargani hisobga olingan), `src/app/[locale]/` ostida landing (`/`), 3-qadamli murojaat wizard'i (`/yangi`: matn+ovoz(STT)+rasm→mahalla+manzil+xarita→ism+telefon), muvaffaqiyat ekrani, holat sahifasi (`/holat`, vertikal 4-qadamli timeline). `GuestShell`/`GuestHeader`/`GuestButton`/`GuestLinkButton` — qayta ishlatiluvchi fuqaro UI kiti. Draft `localStorage`'da saqlanadi. **Docker'dagi real backend bilan uchdan-uchga sinovdan o'tkazilgan:** murojaat yuborildi → `UY-2026-000006` qaytdi → holat sahifasida to'g'ri ko'rindi, 4 tilda va 375px/desktop'da tekshirilgan. `npm run build`, `npm run lint`, `npm run i18n:check` — barchasi toza.
- **Admin qismi (F2) — TO'LIQ QAYTA QURILDI, real backend bilan sinovdan o'tkazilgan:** `lib/types.ts`/`lib/auth.tsx`/`lib/status.ts` yangi kontraktga to'liq almashtirildi (F1'dagi qo'shimcha emas, o'rnini bosuvchi — chunki F2 bu fayllarni butunlay egallaydi). Murojaatlar ro'yxati (pagination, filtrlar, priority/status badge, overdue/needs_review belgisi), tafsilot sahifasi (media, AI paneli, rol+state-machine asosidagi status tugmalari, biriktirish, javob editori, ichki izohlar, voqealar tarixi), bo'limlar CRUD, xodimlar CRUD, kategoriya/keyword boshqaruvi, keyword-suggestions inbox, yangilangan dashboard (overdue/needs_review/ai_accuracy_7d). RBAC: sidebar va sahifalar `role`ga qarab cheklangan (B6, 2 rol — admin-only bo'limlar `department_staff`ga ko'rinmaydi, nav'ida faqat "Murojaatlar" qoladi). Eski `/admin/statistika` va `/admin/tashkilotlar` (backend'da endi yo'q eski endpointlarga tayangan edi) olib tashlandi. **Docker'dagi real backend bilan to'liq oqim sinovdan o'tkazildi:** login → dashboard → ro'yxat → tafsilot → status o'zgartirish (voqealar tarixida yangi yozuv bilan tasdiqlangan) → bo'limlar → xodimlar.
- **F3 — TO'LIQ (F3.1+F3.2+F3.3):** `/go` (QR landing, mahalla nomi + "Shu yerda"/"Telegram" tugmalari, Telegram env sozlanmasa "tez orada"), `/kabinet` (telefon+parol login/ro'yxat, `GET /api/citizen/complaints` ro'yxati), `/admin/qr` (admin-only — mahalla tanlab QR yaratish, PNG/PDF yuklab olish, skan soni). `lib/formatDate.ts` umumiy sana formatlagichga chiqarildi (`GuestTimeline`+`kabinet`+`admin/qr` uchtasi ishlatadi). **Docker'da real sinovdan o'tkazildi** (tafsilot: [06](06-frontend-tasklar.md) F3.1/F3.2/F3.3).
- **F4 — TO'LIQ (F4.1+F4.2+F4.3):** `/admin/xarita` (marker cluster + issiqlik xaritasi, `react-leaflet-cluster`+`leaflet.heat`), `/admin/kpi` (manager+, group_by tablari + AI trend grafigi, Recharts), Excel eksport tugmasi murojaatlar ro'yxatida. **Muhim topilma:** wizard xaritasining standart "Uychi markazi" koordinatasi (F1.4'dan beri) noto'g'ri edi — Chust tumaniga to'g'ri kelardi. Tuzatildi (tafsilot: [06](06-frontend-tasklar.md) F4). **Docker'da real sinovdan o'tkazildi**, shu jumladan RBAC (B6'dan beri KPI ham, xarita ham admin-only — `department_staff` ikkalasiga ham kira olmaydi).
- Saqlanadigan narsalar: dizayn tokenlari (navy+gold), `MapPicker`, `Button`/`Card`/`Badge`/`Input` UI kiti (F2 shular ustiga qurildi, `GuestButton` esa F1'da shu naqshga mos alohida yozildi).

### Infra

- `docker-compose.yml`: Postgres + MinIO + Redis. App konteynerlari, CI/CD, nginx hali yo'q (D2-D8). `.claude/launch.json` qo'shildi (frontend dev server preview uchun).

## 2. Hal qilingan muammolar

K1 (majburiy ro'yxatdan o'tish), K2 (mobil nav — fuqaro sahifalarida endi to'liq mobile-first), K3 (ticket raqami), K4 (login'siz holat tekshirish), K5 (pagination), K6 (fayl validatsiyasi), K9 (keyword'lar DB'da), K10 (AI async), K12 (email uniqueness) — hal qilindi.

K7 (rate limit/captcha) — hal qilindi (B4.3/B4.7).

K8 (statistika UTC) — hal qilindi (B5.6, R1 bilan birga: `app/core/timezone.py`).

**Hali ochiq:** K11 (JWT localStorage), admin mobil drawer menyu (F1.8, hali qilinmagan).

## 3. TZ va yangi talablar bo'yicha YO'Q narsalar (yangilangan gap-jadval)

| Soha | Yo'q narsa | Qayerda hal qilinadi |
|---|---|---|
| Fuqaro UX | **Tayyor** (F1+F3.1+F3.3) — wizard, holat, i18n, ovoz, QR landing, kabinet. Qolgan: admin mobil drawer (F1.8) | [06](06-frontend-tasklar.md) F1.8 |
| Admin panel | **To'liq tayyor** (F2+F3.2+F4+R2) — ish navbati (Navbatim), tasdiqlash navbati, approve-first tafsilot, bo'lim/xodim/kategoriya/keyword/QR CRUD, dashboard (AI health + avtomatlashtirish KPI), xarita, KPI, Excel eksport, RBAC | — |
| i18n | Backend + fuqaro FE tayyor (F1). Admin hali faqat uz (rejalashtirilganidek) | — |
| AI | **LLM yagona dvigatel (R3, v1.3)** — keyword lug'ati, o'rganish sikli va normalizatsiya olib tashlandi; har murojaatni LLM o'zi kategoriyalaydi, yo'naltiradi va javob drafti yozadi. Ollama o'chsa murojaat yo'qolmaydi (qayta urinish + sweeper cron). Qolgan: rasm tahlili/OCR (V2, backlog), mohir.ai provider (stub) | [07-ai-layer.md](07-ai-layer.md) §7 |
| Workflow | **To'liq avtomatlashtirilgan (B6+R1+R2+S1+S2):** AI ishonchli bo'lsa avtomatik biriktiradi; `accepted` xodimning «Qabul qilaman» amali bilan qo'yiladi (v1.4 — avval sahifa ochilishida edi) va egalikni belgilaydi; `need_info` ikki tomonlama (3 kanal); `resolved` javobsiz va ochiq sub-task bilan mumkin emas; fuqaro e'tirozi murojaatni qayta ochadi; SLA-75% ogohlantirish → deadline o'tgan → 24h javobsiz admin; `resolved`+7 kun → `closed`, +30 kun → `archived` | — |
| Bildirishnoma | **SMS (Eskiz) va Telegram (B4.2) yuborish tayyor** (real kalitlar kelganda ishlaydi). **Xodim bildirishnomalari endi UI'da ko'rinadi (R1.7 qo'ng'iroq)** — avval faqat jadvalga yozilardi. Bot API (`/api/bot/*`) tayyor | [05](05-backend-tasklar.md) B4.2, [08](08-telegram-bot.md) |
| Analitika | **To'liq tayyor** (heatmap, KPI, mahalla kesimi, global qidiruv, Excel eksport — backend+FE) | — |
| Xavfsizlik | **Rate limit, captcha, fayl xavfsizligi (EXIF strip) va audit log — barchasi tayyor.** | — |
| Kanallar | **QR generatsiya (PNG/PDF), Bot API va Telegram bot (aiogram, kod tayyor) bor.** Real bot tokeni va mobil ilova qolgan | [08](08-telegram-bot.md), [09](09-mobile.md) |
| DevOps | App dockerfile'lari, nginx, CI, backup | D2-D8 |
| Mahalla ma'lumoti | `neighborhoods` jadvalida faqat 8 ta NAMUNA (test) yozuv bor — real Uychi tumani MFY ro'yxati hali hokimlikdan olinmagan | `python -m app.tools.import_neighborhoods <csv>` (real CSV kelganda NAMUNA yozuvlarni tozalab qayta import qilish) |

## 4. Keyingi qadam (tavsiya)

Guest oqim, admin panel, QR/kabinet, analitika VA **avtomatlashtirish qatlami (R1–R2)** endi to'liq ishlaydi va real sinovdan o'tgan. Kod tomondan pilotga tayyorlik uchun qolgani — tashkiliy kalitlar va DevOps:

**Eng ustuvor uchtasi (kodsiz hal bo'lmaydi):**

1. **Eskiz SMS kalitlari** (`ESKIZ_EMAIL`/`ESKIZ_PASSWORD`) — kod tayyor, kalitsiz har bildirishnoma `failed` yoziladi. Fuqaro hozircha holatni faqat o'zi tekshirib biladi.
2. **`TELEGRAM_BOT_TOKEN`** (@BotFather) — bot kodi tayyor, tokensiz Telegram kanali butunlay uxlab yotibdi.
3. **DevOps (D2–D8)** — app dockerfile'lari, nginx, HTTPS, CI, backup. Bularsiz serverga chiqib bo'lmaydi.

**Server tanlashda muhim (R1 o'lchovi):** LLM generatsiya endi har murojaatda ishlaydi, shuning uchun server quvvati to'g'ridan-to'g'ri javob tezligiga ta'sir qiladi. CPU'da 8B model ≈ 137 s/murojaat (kuniga 50 murojaat ≈ 1.9 soat uzluksiz yuk) — bitta tuman uchun maqbul, lekin GPU bo'lsa 2–5 s. To'liq jadval va `LLM_TIMEOUT_S` qoidasi: [07](07-ai-layer.md) §4.

Qolgan (avvalgi ro'yxat, o'zgarishsiz):

1. ~~**Mahalla CSV import**~~ — mexanizm sinovdan o'tkazildi (8 ta NAMUNA yozuv bilan, `backend/data/uychi_mfy_SAMPLE.csv`). Hokimlikdan real 62 ta MFY ro'yxati kelganda: yangi CSV → `python -m app.tools.import_neighborhoods <csv>` → NAMUNA yozuvlarni o'chirish.
2. ~~**B4 (B4.1-B4.7)**~~ — SMS (Eskiz), Telegram xabar yuborish + Bot API (`/api/bot/*`, B4.2), rate limit, EXIF strip, eskalatsiya croni, audit log, captcha — barchasi tayyor va sinovdan o'tkazildi. B4 to'liq yopildi.
3. ~~**F3.1/F3.2/F3.3 + B5.4**~~ — QR landing (`/go`), admin QR yaratish/PDF (`/admin/qr`) va fuqaro kabineti (`/kabinet`) barchasi tayyor va sinovdan o'tkazildi. F3 endi to'liq.
4. ~~**B5.1-B5.5 + F4.1-F4.3**~~ — heatmap, KPI, mahalla kesimi, global qidiruv, Excel eksport (backend) + xarita/KPI/eksport sahifalari (frontend) — barchasi tayyor va sinovdan o'tkazildi. Yo'l-yo'lakay wizard xaritasining noto'g'ri standart koordinatasi (F1.4'dan beri, Uychi o'rniga Chust) topilib tuzatildi.
5. ~~**T1 + T3.1/T3.2 (Telegram bot — asosiy oqim)**~~ — standalone `bot/` (aiogram 3) jarayoni kod jihatdan tayyor: til tanlash, kontakt bog'lash, murojaat FSM (matn/ovoz/rasm/mahalla/lokatsiya), "Murojaatlarim", QR deep-link, xatolarni yumshoq ko'rsatish, `/help` + 4 tilda buyruqlar menyusi. Real backend'ga qarshi qo'lda sinovdan o'tkazildi (to'liq zanjir: til→kontakt→tavsif→mahalla→tasdiq→real ticket). **Qolgan yagona to'siq:** @BotFather'dan `TELEGRAM_BOT_TOKEN` — u kelmaguncha bot Telegram serveriga ulanib ishga tushmaydi (real Telegram orqali sinov qilib bo'lmaydi). Qolgan ishlar: T3.3 (Dockerfile/compose), T2.2 (fuqaro botdan "qo'shimcha ma'lumot"ga javob yozishi — alohida kontrakt kengaytmasi kerak).
6. **Jonli UX testi** — checkpoint C1/C3 talabi: kamida bitta 60+ yoshli odam yordamisiz murojaat yubora olishi kerak. Wizard tayyor, endi real sinov mumkin.
7. **DevOps (D2-D8)** — app dockerfile'lari, nginx, CI, backup hali yo'q; pilot serverga chiqishdan oldin kerak bo'ladi.
