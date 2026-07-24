# 01 — Hozirgi holat (codebase auditi)

Audit sanasi: 2026-07-24, `main` (B1 + B2 + B3 — backend poydevor, guest oqimi, AI qatlami, javoblar/xodimlar/kabinet tugallangan, AI coder solo sessiya). Bu hujjat — "nima bor, nima yo'q" ning haqiqiy manzarasi. Yangi tasklar shu gap'lardan kelib chiqqan.

## 1. Nima bor (ishlaydi)

### Backend — FastAPI (Python), `backend/`

- **Stack:** FastAPI 0.115, SQLAlchemy 2, Alembic, PostgreSQL (5433), Redis (6379) + ARQ worker (jobs + kunlik cron), MinIO (boto3, `python-magic` fayl validatsiyasi), JWT (python-jose), bcrypt, `faster-whisper` (STT), `httpx` (Ollama).
- **DB sxemasi to'liq [04-database.md](04-database.md) ga mos:** citizens, users(staff), departments, categories, category_keywords, neighborhoods, complaints(+barcha yangi ustunlar), complaint_files, complaint_events, replies, ai_analyses, keyword_suggestions, stt_jobs, ticket_counters, qr_codes, settings, audit_logs. Alembic 5 ta migratsiya (`m1_new_tables`…`m5_indexes_checks`) — bo'sh bazadan `alembic upgrade head` toza o'tadi (sinovdan o'tkazilgan). Enum'lar native PG ENUM emas — varchar + CHECK constraint.
- **Seed** (`app/seed.py`, idempotent): 14 bo'lim + 15 kategoriya (4 tilda: uz/oz/ru/en), 106 keyword, admin (`+998900000000`/`admin123`), 3 ta settings. `app/tools/import_neighborhoods.py` — CSV import.
- **Guest oqim (auth YO'Q):** `POST /api/public/complaints` (citizen upsert, fayl validatsiya magic-byte bilan, MinIO, ticket generatsiya, `created` event, ARQ'ga classify enqueue), `GET /api/public/complaints/track` (4 qadamli timeline, enumeration himoya), `GET /api/public/categories|neighborhoods|qr/{code}`, `POST/GET /api/public/stt[/{id}]` (ovoz→matn).
- **AI (to'liq gibrid pipeline):** `app/services/ai/normalize.py` (kirill→lotin), `classifier.py` (DB keyword, margin+threshold scoring, xavfli-so'z priority), `llm.py` (Ollama fallback, JSON validatsiya, 2x retry, graceful fail), `learning.py` (kunlik keyword-mining), `stt.py` (faster-whisper/mohir.ai provider interfeysi). `app/worker.py` (ARQ): `classify_complaint`, `transcribe_audio`, kunlik `suggest_keywords_job` (02:00 cron). **Real sinovlar:** "svet yo'q, chiroq o'chgan"→elektr (0.99); Ollama o'chirilganda submit/worker baribir ishladi (needs_review=true, checkpoint C2); audio yuklab STT orqali transkripsiya qilindi (whisper modeli avtomatik yuklandi); suggestions inbox approve→keyword bazaga tushdi.
- **Workflow:** `app/services/workflow.py` — `STATUS_TRANSITIONS` xaritasi, event+notification; `rejected` uchun note majburiy.
- **Admin API** (JWT, RBAC `operator/employee/manager/admin`): complaints (pagination+filtrlar+detail+status+assign+replies+comments), departments CRUD, categories CRUD, category keywords CRUD, keyword-suggestions (list/approve/reject), users CRUD (admin-only), dashboard (overdue/needs_review/by_priority/ai_accuracy_7d). **Bo'lim cheklovi ishlaydi:** employee/manager faqat `assigned_department_id`i o'ziniki bo'lgan murojaatlarni ko'radi/boshqaradi (list filtrlanadi, boshqacha bo'lsa 403); status o'tishlari ham rolga qarab cheklangan (`ROLE_ALLOWED_STATUSES`). Docker'da real ikki xodim bilan sinovdan o'tkazildi.
- **Fuqaro kabineti:** `GET /api/citizen/complaints` — faqat o'z murojaatlari (guest sifatida yuborilgan murojaat keyin `register` qilingach kabinetda ko'rinishi tekshirilgan).
- **Auth:** `/api/auth/register` (fuqaro kabineti), `/login` (staff YOKI citizen, JWT `kind` claim), `/me`.
- **Xato formati:** global exception handler — hamma xato `{"detail","code"}` shaklida.
- **Testlar:** `tests/test_smoke.py`, `pytest -m smoke` — 4/4 yashil (toza bazadan).
- **Infra:** `docker-compose.yml` — Postgres + MinIO + Redis (healthcheck bilan).

### Frontend — Next.js, `frontend/` — **ESKI HOLATDA, YANGI BACKEND BILAN ISHLAMAYDI**

Ikkita sessiyada ham frontend'ga tegilmadi. Eski sahifalar (`/ariza/yangi`, `/murojaatlarim`, `/admin`, `lib/api.ts`, `lib/types.ts`) hali eski `/api/complaints`, `/api/admin/*` (eski shakl), `ComplaintCategory`/`ComplaintStatus` enum'lariga mo'ljallangan — bular backend'da endi YO'Q. **Keyingi sessiya: F-workstream to'liq qayta qurilishi kerak** ([06-frontend-tasklar.md](06-frontend-tasklar.md) F1.*). Saqlab qolinadigan narsalar: dizayn tokenlari (navy+gold), UI kitchasi, `MapPicker`.

### Infra

- `docker-compose.yml`: Postgres + MinIO + Redis. App konteynerlari, CI/CD, nginx hali yo'q (D2-D8).

## 2. Hal qilingan muammolar

K1 (majburiy ro'yxatdan o'tish), K3 (ticket raqami), K4 (login'siz holat tekshirish), K5 (pagination), K6 (fayl validatsiyasi), K9 (keyword'lar DB'da + admin CRUD), K10 (AI async), K12 (email uniqueness) — barchasi backend darajasida hal qilindi.

**Hali ochiq:** K2 (mobil nav — frontend), K7 (rate limit/captcha — B4.3/B4.7), K8 (statistika UTC — B5.6), K11 (JWT localStorage — frontend).

## 3. TZ va yangi talablar bo'yicha YO'Q narsalar (yangilangan gap-jadval)

| Soha | Yo'q narsa | Qayerda hal qilinadi |
|---|---|---|
| Fuqaro UX | Guest wizard UI, sodda 4-bosqichli holat ko'rinishi, katta shrift/tugmalar, public landing (backend tayyor, **frontend yo'q**) | [06](06-frontend-tasklar.md) F1.*, [10](10-ui-ux.md) |
| i18n | Backend `?lang=` qabul qiladi, lekin FE next-intl hali yo'q | [06](06-frontend-tasklar.md) |
| AI | Asosiy pipeline (keyword+LLM+STT+o'rganish sikli) tayyor. Qolgan: rasm tahlili/OCR (V2, backlog), mohir.ai provider (stub, API kaliti kelganda) | [07-ai-layer.md](07-ai-layer.md) §7 |
| Workflow | Eskalatsiya (deadline o'tganlarni manager'ga yuborish) yo'q | [05](05-backend-tasklar.md) B4.5 |
| Tashkiliy | Xodimlar CRUD, RBAC bo'lim cheklovi, javoblar, ichki izohlar — hammasi tayyor (B3) | — |
| Bildirishnoma | SMS (Eskiz), Telegram — hali stub (faqat in-app) | [05](05-backend-tasklar.md) B4.1-B4.2 |
| Analitika | Heatmap, KPI (group_by), Excel eksport | [05](05-backend-tasklar.md) B5 |
| Qidiruv | Global search `q` bor (ILIKE), pg_trgm optimizatsiya yo'q | B5.3 |
| Xavfsizlik | Rate limit, captcha, audit log yozish (jadval bor, middleware yo'q) | B4.3-B4.7 |
| Kanallar | Telegram bot, QR landing generatsiya (jadval+endpoint skeleti bor, PNG/PDF generatsiya yo'q), mobil ilova | [08](08-telegram-bot.md), B5.4, [09](09-mobile.md) |
| DevOps | App dockerfile'lari, nginx, CI, backup | D2-D8 |
| Frontend | **BUTUN F-workstream** — yangi backend kontraktiga moslashtirish kerak | [06](06-frontend-tasklar.md) |

## 4. Keyingi qadam (tavsiya)

Backend endi B1+B2+B3 tugallangan holda — guest oqim, AI (keyword+LLM+STT+o'rganish sikli), admin core (complaints/departments/categories/users/replies/comments), RBAC bo'lim cheklovi va fuqaro kabineti ishlaydi. Eng katta bo'shliq endi **frontend**:

1. **F1.\*** (kuchli tavsiya) — fuqaro guest wizard'ini yangi `/api/public/*` kontraktiga yozish. Backend uzoq vaqtdan beri frontend'siz — real UX tekshiruvi (checkpoint C1/C2, jumladan "60+ yoshli odam yordamsiz murojaat yubora oladi" talabi) faqat FE bilan mumkin.
2. **B4.\*** — SMS/Telegram bildirishnoma, rate limit, captcha, eskalatsiya, audit log — pilotdan oldin xavfsizlik/ishonchlilik uchun muhim.
3. **B5.\*** — analitika (heatmap/KPI/eksport), QR generatsiya.

B4/B5 mustaqil bo'laklar — istalgan tartibda davom ettirish mumkin, lekin frontend yo'qligi endi loyihaning eng katta xavfi (backend ko'r-ko'rona qurilmoqda, real foydalanuvchi hech narsa ko'rmaydi).
