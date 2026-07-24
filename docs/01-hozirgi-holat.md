# 01 — Hozirgi holat (codebase auditi)

Audit sanasi: 2026-07-24, `main` (B1 — backend poydevor + guest oqimi tugallangan, AI coder solo sessiya). Bu hujjat — "nima bor, nima yo'q" ning haqiqiy manzarasi. Yangi tasklar shu gap'lardan kelib chiqqan.

## 1. Nima bor (ishlaydi)

### Backend — FastAPI (Python), `backend/`

- **Stack:** FastAPI 0.115, SQLAlchemy 2, Alembic, PostgreSQL (5433), Redis (6379) + ARQ worker, MinIO (boto3, `python-magic` fayl validatsiyasi), JWT (python-jose), bcrypt.
- **DB sxemasi to'liq [04-database.md](04-database.md) ga mos:** citizens, users(staff), departments, categories, category_keywords, neighborhoods, complaints(+barcha yangi ustunlar), complaint_files, complaint_events, replies, ai_analyses, keyword_suggestions, stt_jobs, ticket_counters, qr_codes, settings, audit_logs. Alembic 5 ta migratsiya (`m1_new_tables`…`m5_indexes_checks`) — bo'sh bazadan `alembic upgrade head` toza o'tadi (sinovdan o'tkazilgan). Enum'lar native PG ENUM emas — varchar + CHECK constraint (yangi status/kategoriya kodi qo'shish uchun migratsiya kerak emas, faqat CHECK yangilanadi).
- **Seed** (`app/seed.py`, idempotent): 14 bo'lim + 15 kategoriya (4 tilda: uz/oz/ru/en), 106 keyword (`app/services/ai/normalize.py` orqali normalizatsiyalangan, kirill+lotin+sheva variantlari bilan), admin (`+998900000000`/`admin123`), 3 ta settings. `app/tools/import_neighborhoods.py` — CSV import.
- **Guest oqim (auth YO'Q):** `POST /api/public/complaints` (citizen upsert, fayl validatsiya magic-byte bilan, MinIO, ticket generatsiya, `created` event, ARQ'ga classify enqueue), `GET /api/public/complaints/track` (4 qadamli timeline, enumeration himoya), `GET /api/public/categories|neighborhoods|qr/{code}`.
- **AI (keyword-only, B2 LLM fallback hali yo'q):** `app/services/ai/normalize.py` (kirill→lotin, apostrof, punktuatsiya), `app/services/ai/classifier.py` (DB'dagi `category_keywords`dan scoring). `app/worker.py` (ARQ) — `classify_complaint` ishi: keyword tahlil → `ai_analyses` yozuv → kategoriya/`deadline_at`/`needs_review` → `status=ai_processed` → event. curl bilan sinovdan o'tkazilgan (masalan "svet yo'q, chiroq o'chgan" → `elektr`, confidence 0.99).
- **Workflow:** `app/services/workflow.py` — `STATUS_TRANSITIONS` xaritasi ([03](03-kontraktlar.md) §2.1), har o'tishda event+notification; `rejected` uchun note majburiy (422 `invalid_transition`/`validation_error` tekshirilgan).
- **Admin API** (JWT, RBAC `operator/employee/manager/admin`): `GET/PATCH /api/admin/complaints[...]` (pagination envelope, filtrlar: status/category/department_id/assigned_user_id/source/priority/overdue/needs_review/q/date), `POST .../assign`, `PATCH .../status`, `GET/POST/PATCH /api/admin/departments` (admin-only), `GET /api/admin/stats/dashboard`.
- **Auth:** `/api/auth/register` (fuqaro kabineti), `/login` (staff YOKI citizen, JWT'da `kind` claim), `/me` (kind bo'yicha javob).
- **Xato formati:** global exception handler'lar (`app/main.py`) — hamma xato `{"detail","code"}` shaklida (`AppError` + default kod xaritasi).
- **Testlar:** `tests/test_smoke.py`, `pytest -m smoke` — health, guest submit→track→admin list→status→reject-without-note, categories/neighborhoods, validation shape. Toza bazadan 4/4 yashil.
- **Infra:** `docker-compose.yml` — Postgres + MinIO + Redis (barchasi healthcheck bilan).

### Frontend — Next.js, `frontend/` — **ESKI HOLATDA, YANGI BACKEND BILAN ISHLAMAYDI**

Bu sessiyada frontend'ga tegilmadi. Eski sahifalar (`/ariza/yangi`, `/murojaatlarim`, `/admin`, `lib/api.ts`, `lib/types.ts`) hali eski `/api/complaints`, `/api/admin/*` (eski shakl), `ComplaintCategory`/`ComplaintStatus` enum'lariga mo'ljallangan — bular backend'da endi YO'Q (o'chirildi). **Keyingi sessiya: F-workstream to'liq qayta qurilishi kerak** ([06-frontend-tasklar.md](06-frontend-tasklar.md) F1.*, guest wizard + admin panelni yangi kontraktga moslash). Saqlab qolinadigan narsalar o'zgarmadi: dizayn tokenlari (navy+gold), UI kitchasi, `MapPicker`.

### Infra

- `docker-compose.yml`: Postgres + MinIO + Redis. App konteynerlari, CI/CD, nginx hali yo'q (D2-D8).

## 2. Hal qilingan muammolar (bu sessiyada)

K1 (majburiy ro'yxatdan o'tish) — backend'da yo'q endi (guest submit). K3 (ticket raqami) — bor (`UY-2026-000001`). K4 (login'siz holat tekshirish) — bor (`/api/public/complaints/track`). K5 (pagination) — bor (`Page[T]` envelope). K6 (fayl validatsiyasi) — bor (`python-magic` + hajm limiti). K9 (keyword'lar kodga qotirilgan) — endi DB'da (`category_keywords`, admin CRUD hali yo'q — B2.6). K10 (AI sinxron) — endi async (ARQ worker). K12 (email uniqueness) — auth.py qayta yozilganda yo'qoldi.

**Hali ochiq:** K2 (mobil nav — frontend, tegilmadi), K7 (rate limit/captcha — B4.3/B4.7), K8 (statistika UTC — B5.6), K11 (JWT localStorage — frontend).

## 3. TZ va yangi talablar bo'yicha YO'Q narsalar (yangilangan gap-jadval)

| Soha | Yo'q narsa | Qayerda hal qilinadi |
|---|---|---|
| Fuqaro UX | Guest wizard UI, sodda 4-bosqichli holat ko'rinishi, katta shrift/tugmalar, public landing (backend tayyor, **frontend yo'q**) | [06](06-frontend-tasklar.md) F1.*, [10](10-ui-ux.md) |
| i18n | uz/oz/ru/en — backend `?lang=` qabul qiladi (categories), lekin FE next-intl hali yo'q | [06](06-frontend-tasklar.md) |
| AI | Lokal LLM fallback (Ollama+Gemma), o'rganish sikli, ovoz→matn (STT) — hammasi B2 | [07-ai-layer.md](07-ai-layer.md) |
| Workflow | Eskalatsiya (B4.5), javoblar UI (backend `replies` jadval+model tayyor, endpoint yo'q — B3.1) | [05](05-backend-tasklar.md) B3-B4 |
| Tashkiliy | Xodimlar CRUD endpoint yo'q (B3.2), RBAC dependency'lar tayyor | [05](05-backend-tasklar.md) B3.2 |
| Bildirishnoma | SMS (Eskiz), Telegram — hali stub (faqat in-app) | [05](05-backend-tasklar.md) B4.1-B4.2 |
| Media | Video/audio upload backend qabul qiladi va saqlaydi, lekin STT transkripsiya yo'q | [07](07-ai-layer.md) §6, B2.4 |
| Analitika | Heatmap, KPI, Excel eksport | [05](05-backend-tasklar.md) B5 |
| Qidiruv | Global search `q` bor (ticket/telefon/matn ILIKE), pg_trgm optimizatsiya yo'q | B5.3 |
| Xavfsizlik | Rate limit, captcha, audit log yozish (jadval bor, middleware yo'q) | B4.3-B4.7 |
| Kanallar | Telegram bot, QR landing generatsiya (jadval+endpoint skeleti bor, PNG/PDF generatsiya yo'q), mobil ilova | [08](08-telegram-bot.md), B5.4, [09](09-mobile.md) |
| DevOps | App dockerfile'lari, nginx, CI, backup | D2-D8 |
| Frontend | **BUTUN F-workstream** — yangi backend kontraktiga moslashtirish kerak | [06](06-frontend-tasklar.md) |

## 4. Keyingi qadam (tavsiya)

1. **F1.\*** — fuqaro guest wizard'ini yangi `/api/public/*` kontraktiga yozish (eng yuqori qiymat — checkpoint C1 uchun frontend yarmi shu).
2. Yoki **B2.\*** — AI qatlamini chuqurlashtirish (Ollama fallback, STT) davom ettirish.
3. Ikkovi ham backend B1 ustiga qurilgani uchun mustaqil — birga ishlasa parallel bo'ladi.
