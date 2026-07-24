# 01 — Hozirgi holat (codebase auditi)

Audit sanasi: 2026-07-24, `main` (B1+B2+B3 backend to'liq, B4 deyarli to'liq — faqat Telegram/B4.2 qolgan; F1+F2 frontend to'liq — AI coder solo sessiya). Bu hujjat — "nima bor, nima yo'q" ning haqiqiy manzarasi. Yangi tasklar shu gap'lardan kelib chiqqan.

## 1. Nima bor (ishlaydi)

### Backend — FastAPI (Python), `backend/`

- **Stack:** FastAPI 0.115, SQLAlchemy 2, Alembic, PostgreSQL (5433), Redis (6379) + ARQ worker (jobs + kunlik/30-daqiqalik cronlar), MinIO (boto3, `python-magic` fayl validatsiyasi, Pillow+`pillow-heif` EXIF strip), JWT (python-jose), bcrypt, `faster-whisper` (STT), `httpx` (Ollama, Eskiz, Turnstile).
- **DB sxemasi to'liq [04-database.md](04-database.md) ga mos:** citizens, users(staff), departments, categories, category_keywords, neighborhoods, complaints(+barcha yangi ustunlar), complaint_files, complaint_events, replies, ai_analyses, keyword_suggestions, stt_jobs, ticket_counters, qr_codes, settings, audit_logs. Alembic 5 ta migratsiya — bo'sh bazadan `alembic upgrade head` toza o'tadi.
- **Seed** (`app/seed.py`, idempotent): 14 bo'lim + 15 kategoriya (4 tilda), 106 keyword, admin (`+998900000000`/`admin123`), 3 ta settings. `app/tools/import_neighborhoods.py` — CSV import ishlaydi va sinovdan o'tgan: `backend/data/uychi_mfy_SAMPLE.csv` (8 ta "NAMUNA —" belgili o'ylab topilgan nom) import qilindi, `/api/public/neighborhoods` va wizard Step2'da to'g'ri ko'rinmoqda. **Bu haqiqiy ma'lumot emas** — internetdan Uychi tumani rasmiy 62 ta MFY ro'yxatini ishonchli topib bo'lmadi, hokimlikdan real ro'yxat kutilmoqda (tafsilot: [04-database.md](04-database.md) §neighborhoods).
- **Guest oqim (auth YO'Q):** `POST /api/public/complaints`, `GET /api/public/complaints/track`, `GET /api/public/categories|neighborhoods|qr/{code}`, `POST/GET /api/public/stt[/{id}]`.
- **AI (to'liq gibrid pipeline):** normalize→keyword(margin+threshold)→LLM fallback(Ollama, graceful)→STT(faster-whisper)→kunlik o'rganish sikli. Real sinovlar: klassifikatsiya, Ollama fallback, STT transkripsiya, suggestions approve — barchasi ishlagani tasdiqlangan.
- **Admin API:** complaints (pagination+filtrlar+detail+status+assign+replies+comments), departments/categories/keywords/users CRUD, keyword-suggestions, dashboard. RBAC bo'lim cheklovi (employee/manager) va rol asosidagi status ruxsatlari ishlaydi.
- **Fuqaro kabineti:** `GET /api/citizen/complaints`.
- **Auth:** `/api/auth/register|login|me` (staff YOKI citizen, JWT `kind` claim).
- **Bildirishnoma va xavfsizlik (B4, qisman):** Eskiz SMS (`app/services/sms.py`, token Redis'da keshlanadi) — 4 tilli shablonlar (`app/i18n/messages.py`) qabul/status/javob uchun, `notifications` jadvaliga `sent`/`failed` yozadi, `ESKIZ_EMAIL/PASSWORD` sozlanmasa jimgina o'tkazib yuboradi. Rate limit (`app/core/ratelimit.py`, Redis fixed-window): submit 5/soat/telefon+20/kun/IP, STT 10/soat/IP, track 30/soat/IP (kontraktdan tashqari, enumeration himoyasi uchun qo'shildi) → 429 `rate_limited`. CAPTCHA (`app/services/captcha.py`, Cloudflare Turnstile) — `TURNSTILE_SECRET_KEY` bo'lmasa o'chirilgan (hozirgi holat). **Docker'da real sinovdan o'tkazildi:** 6-submit/soat → 429, SMS urinishlari `failed` sifatida to'g'ri yozilmoqda.
- **Xato formati:** global handler — hamma xato `{"detail","code"}`.
- **Testlar:** `pytest -m smoke` — 4/4 yashil.
- **Infra:** `docker-compose.yml` — Postgres + MinIO + Redis.

### Frontend — Next.js, `frontend/`

- **Fuqaro qismi (F1) — TO'LIQ ISHLAYDI, real backend bilan sinovdan o'tkazilgan:** next-intl (`uz|oz|ru|en`, `localePrefix: as-needed`, `src/proxy.ts` — Next.js 16'da `middleware`→`proxy` nomlanishi o'zgargani hisobga olingan), `src/app/[locale]/` ostida landing (`/`), 3-qadamli murojaat wizard'i (`/yangi`: matn+ovoz(STT)+rasm→mahalla+manzil+xarita→ism+telefon), muvaffaqiyat ekrani, holat sahifasi (`/holat`, vertikal 4-qadamli timeline). `GuestShell`/`GuestHeader`/`GuestButton`/`GuestLinkButton` — qayta ishlatiluvchi fuqaro UI kiti. Draft `localStorage`'da saqlanadi. **Docker'dagi real backend bilan uchdan-uchga sinovdan o'tkazilgan:** murojaat yuborildi → `UY-2026-000006` qaytdi → holat sahifasida to'g'ri ko'rindi, 4 tilda va 375px/desktop'da tekshirilgan. `npm run build`, `npm run lint`, `npm run i18n:check` — barchasi toza.
- **Admin qismi (F2) — TO'LIQ QAYTA QURILDI, real backend bilan sinovdan o'tkazilgan:** `lib/types.ts`/`lib/auth.tsx`/`lib/status.ts` yangi kontraktga to'liq almashtirildi (F1'dagi qo'shimcha emas, o'rnini bosuvchi — chunki F2 bu fayllarni butunlay egallaydi). Murojaatlar ro'yxati (pagination, filtrlar, priority/status badge, overdue/needs_review belgisi), tafsilot sahifasi (media, AI paneli, rol+state-machine asosidagi status tugmalari, biriktirish, javob editori, ichki izohlar, voqealar tarixi), bo'limlar CRUD, xodimlar CRUD, kategoriya/keyword boshqaruvi, keyword-suggestions inbox, yangilangan dashboard (overdue/needs_review/ai_accuracy_7d). RBAC: sidebar va sahifalar `role`ga qarab cheklangan (admin-only bo'limlar operator/employee/manager'ga ko'rinmaydi). Eski `/admin/statistika` va `/admin/tashkilotlar` (backend'da endi yo'q eski endpointlarga tayangan edi) olib tashlandi. **Docker'dagi real backend bilan to'liq oqim sinovdan o'tkazildi:** login → dashboard → ro'yxat → tafsilot → status o'zgartirish (voqealar tarixida yangi yozuv bilan tasdiqlangan) → bo'limlar → xodimlar.
- Saqlanadigan narsalar: dizayn tokenlari (navy+gold), `MapPicker`, `Button`/`Card`/`Badge`/`Input` UI kiti (F2 shular ustiga qurildi, `GuestButton` esa F1'da shu naqshga mos alohida yozildi).

### Infra

- `docker-compose.yml`: Postgres + MinIO + Redis. App konteynerlari, CI/CD, nginx hali yo'q (D2-D8). `.claude/launch.json` qo'shildi (frontend dev server preview uchun).

## 2. Hal qilingan muammolar

K1 (majburiy ro'yxatdan o'tish), K2 (mobil nav — fuqaro sahifalarida endi to'liq mobile-first), K3 (ticket raqami), K4 (login'siz holat tekshirish), K5 (pagination), K6 (fayl validatsiyasi), K9 (keyword'lar DB'da), K10 (AI async), K12 (email uniqueness) — hal qilindi.

K7 (rate limit/captcha) — hal qilindi (B4.3/B4.7).

**Hali ochiq:** K8 (statistika UTC — B5.6), K11 (JWT localStorage), admin mobil drawer menyu (F1.8, hali qilinmagan).

## 3. TZ va yangi talablar bo'yicha YO'Q narsalar (yangilangan gap-jadval)

| Soha | Yo'q narsa | Qayerda hal qilinadi |
|---|---|---|
| Fuqaro UX | **Tayyor** (F1) — wizard, holat, i18n, ovoz. Qolgan: QR landing `/go` (F3.1), fuqaro kabineti UI `/kabinet` (F3.3), admin mobil drawer (F1.8) | [06](06-frontend-tasklar.md) F3 |
| Admin panel | **Tayyor** (F2) — ro'yxat, tafsilot, status/biriktirish/javob, bo'lim/xodim/kategoriya/keyword CRUD, dashboard, RBAC. Qolgan: heatmap/KPI (F4), QR sahifasi (F3.2) | [06](06-frontend-tasklar.md) F4 |
| i18n | Backend + fuqaro FE tayyor (F1). Admin hali faqat uz (rejalashtirilganidek) | — |
| AI | Asosiy pipeline tayyor. Qolgan: rasm tahlili/OCR (V2, backlog), mohir.ai provider (stub) | [07-ai-layer.md](07-ai-layer.md) §7 |
| Workflow | **Eskalatsiya croni tayyor** (deadline o'tgan → manager, 24h javobsiz → admin) | — |
| Bildirishnoma | **SMS (Eskiz) tayyor** (real kalitlar kelganda ishlaydi). Telegram hali stub | [05](05-backend-tasklar.md) B4.2 |
| Analitika | Heatmap, KPI (group_by), Excel eksport — na backend, na FE | [05](05-backend-tasklar.md) B5, [06](06-frontend-tasklar.md) F4 |
| Xavfsizlik | **Rate limit, captcha, fayl xavfsizligi (EXIF strip) va audit log — barchasi tayyor.** | — |
| Kanallar | Telegram bot, QR generatsiya (PNG/PDF), mobil ilova | [08](08-telegram-bot.md), B5.4, [09](09-mobile.md) |
| DevOps | App dockerfile'lari, nginx, CI, backup | D2-D8 |
| Mahalla ma'lumoti | `neighborhoods` jadvalida faqat 8 ta NAMUNA (test) yozuv bor — real Uychi tumani MFY ro'yxati hali hokimlikdan olinmagan | `python -m app.tools.import_neighborhoods <csv>` (real CSV kelganda NAMUNA yozuvlarni tozalab qayta import qilish) |

## 4. Keyingi qadam (tavsiya)

Guest oqim VA admin panel (backend+frontend) endi **to'liq ishlaydi va sinovdan o'tgan** — loyihaning yadrosi (checkpoint C1) tayyor. Qolgan eng yuqori qiymatli yo'nalishlar:

1. ~~**Mahalla CSV import**~~ — mexanizm sinovdan o'tkazildi (8 ta NAMUNA yozuv bilan, `backend/data/uychi_mfy_SAMPLE.csv`). Hokimlikdan real 62 ta MFY ro'yxati kelganda: yangi CSV → `python -m app.tools.import_neighborhoods <csv>` → NAMUNA yozuvlarni o'chirish.
2. ~~**B4.1/B4.3/B4.4/B4.5/B4.6/B4.7**~~ — SMS (Eskiz), rate limit, EXIF strip, eskalatsiya croni, audit log, captcha — barchasi tayyor va sinovdan o'tkazildi. Qolgan yagona B4 tasklari: Telegram (B4.2, `telegram_chat_id` bilan avval bot ulanishi kerak — [08-telegram-bot.md](08-telegram-bot.md) bilan birga qilinsa mantiqan to'g'ri).
3. **F3** — QR landing (`/go`), fuqaro kabineti (`/kabinet`) — Telegram bot (T-fazalar) bilan birga qilinsa mantiqan to'g'ri keladi.
4. **Jonli UX testi** — checkpoint C1/C3 talabi: kamida bitta 60+ yoshli odam yordamisiz murojaat yubora olishi kerak. Wizard tayyor, endi real sinov mumkin.
5. **F4/B5** — analitika (heatmap/KPI/eksport) — pilot ma'lumot to'planganidan keyin qiymatliroq.
