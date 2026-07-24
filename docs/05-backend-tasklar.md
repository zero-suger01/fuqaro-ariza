# 05 — Backend workstream (B-fazalar)

Egasi: backend sherik. Stack: FastAPI + SQLAlchemy + Alembic + Redis/ARQ + MinIO. Har task oldidan o'qish: [03-kontraktlar.md](03-kontraktlar.md), [04-database.md](04-database.md); AI tasklari uchun [07-ai-layer.md](07-ai-layer.md).

O'lchamlar: S ≤ 2 soat, M ≤ 1 kun, L = 2–3 kun (AI coder bilan odatda tezroq). Tartib — yuqoridan pastga; `[x]` bajarilganda belgilanadi va yoniga 1 qator izoh yoziladi.

## B1 — Poydevor: yangi sxema + guest oqimi (P1)

- [ ] **B1.1 (M)** Alembic migratsiyalar M1–M5 ([04](04-database.md) §4) + modellarni yangilash (`app/models/`): citizen, department, category, keyword, neighborhood, complaint(+ustunlar), file, event, reply, ai_analysis, suggestion, stt_job, counters, qr, settings, audit.
- [ ] **B1.2 (S)** `app/seed.py` yangilash + `app/tools/import_neighborhoods.py` (CSV: name ustuni). Acceptance: bo'sh bazada `alembic upgrade head && python -m app.seed` xatosiz; kategoriyalar 4 tilda.
- [ ] **B1.3 (M)** Ticket generatori (`app/services/tickets.py`): `ticket_counters` row-lock, format `{TICKET_PREFIX}-{YYYY}-{NNNNNN}`. Test: parallel 50 so'rovda dublikat yo'q.
- [ ] **B1.4 (L)** `POST /api/public/complaints` ([03](03-kontraktlar.md) §3.1): citizen upsert (phone bo'yicha), fayl validatsiya (magic-byte, limitlar §2.4), MinIO'ga saqlash (`complaint_files`), ticket, `status=new`, `created` event, ARQ'ga `classify_complaint` ishi. Auth YO'Q.
- [ ] **B1.5 (M)** `GET /api/public/complaints/track` ([03](03-kontraktlar.md) §3.2): status_simple mapping, 4 qadamli timeline (`complaint_events` dan hisoblanadi), reply_text, enumeration himoya.
- [ ] **B1.6 (S)** `GET /api/public/categories`, `GET /api/public/neighborhoods`, `GET /api/public/qr/{code}`.
- [ ] **B1.7 (M)** Redis + ARQ skeleti: `app/worker.py`, `docker-compose.yml` ga redis servisi, `arq app.worker.WorkerSettings` ishga tushishi. Birinchi ish: `classify_complaint` (hozircha keyword-only, [07](07-ai-layer.md) A1 dan keyin to'liq).
- [ ] **B1.8 (M)** Status state-machine (`app/services/workflow.py`): ruxsat etilgan o'tishlar ([03](03-kontraktlar.md) §2.1), har o'tishda event + notification. `PATCH /api/admin/complaints/{id}/status` shu servis orqali; `rejected` uchun note majburiy.
- [ ] **B1.9 (M)** Admin ro'yxat/tafsilotni yangi sxemaga o'tkazish: pagination envelope, yangi filtrlar, tafsilotda citizen/ai/files/events. (FE bilan birga smoke-test — checkpoint C1.)
- [ ] **B1.10 (S)** `deadline_at` hisoblash (kategoriya SLA + priority formulasi [04](04-database.md)) — assign paytida yoki ai_processed'da.
- [ ] **B1.11 (S)** pytest skeleti + smoke testlar: submit→track→admin list→status change. `pytest -m smoke` CI'da ishlaydi.

**B1 Acceptance (checkpoint C1):** curl bilan ro'yxatdan o'tmasdan murojaat yuboriladi → ticket qaytadi → track ishlaydi → admin ro'yxatda ko'rinadi → status o'zgartirilsa track'da aks etadi.

## B2 — AI qatlam integratsiyasi (P2) — spec: [07-ai-layer.md](07-ai-layer.md)

- [ ] **B2.1 (M)** Klassifikator v2: normalizatsiya (kirill→lotin, apostrof, stopword), DB keywordlar, weight + margin scoring ([07](07-ai-layer.md) §3).
- [ ] **B2.2 (M)** Ollama klienti (`app/services/ai/llm.py`): prompt, `format=json`, timeout/retry, `ai_analyses` ga yozish.
- [ ] **B2.3 (S)** `classify_complaint` worker ishi to'liq: keyword → (threshold ostida) LLM → complaint yangilash (`ai_processed`, priority, deadline, needs_review) → event.
- [ ] **B2.4 (M)** STT: `app/services/ai/stt.py` (provider interfeys: whisper lokal / mohirai), `stt_jobs` + public endpointlar ([03](03-kontraktlar.md) §3.3), ffmpeg konvert.
- [ ] **B2.5 (M)** O'rganish sikli: kunlik cron (ARQ cron 02:00) `suggest_keywords` ([07](07-ai-layer.md) §4), admin endpointlar (suggestions list/approve/reject; approve → category_keywords `source=auto`).
- [ ] **B2.6 (S)** Kategoriya/keyword CRUD endpointlari (admin).
- [ ] **B2.7 (S)** AI aniqlik metrikasi: dashboard'ga `ai_accuracy_7d` (operator to'g'rilashlariga qarab), `needs_review` filtri.

## B3 — Javoblar, kabinet, xodimlar (P2)

- [ ] **B3.1 (M)** `POST /api/admin/complaints/{id}/replies`: reply saqlash, event, fuqaroga yetkazish (SMS/telegram/track). AI draft `ai_analyses.suggested_reply` dan olinadi.
- [ ] **B3.2 (M)** Staff CRUD (`/api/admin/users`), RBAC dependency'lar (operator/employee/manager/admin, bo'lim cheklovi). `auth/me` ga `kind`, `role`, `department_id`.
- [ ] **B3.3 (S)** Ichki izohlar (mavjud comments) eventga ulash; employee faqat o'z bo'limini ko'rishi testlari.
- [ ] **B3.4 (M)** Fuqaro kabineti (ixtiyoriy): telefon+parol register (citizens.password_hash), login, `GET /api/citizen/complaints` — faqat o'z murojaatlari. (SMS OTP P3'gacha yo'q — shu sabab kabinetda faqat shu akkaunt bilan yuborilganlar ko'rinadi; hujjat: [03](03-kontraktlar.md) §4.)

## B4 — Bildirishnoma va xavfsizlik (P2–P3)

- [ ] **B4.1 (M)** Eskiz SMS provayderi (`app/services/sms.py`): token olish/kesh, yuborish, `notifications` yozuvi (status sent/failed). Shablonlar 4 tilda: qabul (ticket), status o'zgarishi, javob, need_info.
- [ ] **B4.2 (S)** Telegram xabar yuborish (Bot API http chaqiruv, `telegram_chat_id` bo'lsa).
- [ ] **B4.3 (M)** Rate limit (slowapi yoki Redis'da qo'lda): public endpointlar limiti ([03](03-kontraktlar.md) §3), 429 + `code=rate_limited`.
- [ ] **B4.4 (S)** Fayl xavfsizligi yakuni: MIME+magic tekshiruv hamma yuklashlarda, EXIF strip (rasm), nom sanitizatsiya.
- [ ] **B4.5 (M)** Eskalatsiya cron: deadline o'tgan (`overdue`) murojaatlar → manager'ga notification + `escalated` event; 24h javobsiz bo'lsa admin'ga.
- [ ] **B4.6 (S)** Audit log middleware (admin mutatsiyalari), `GET /api/admin/audit-logs`.
- [ ] **B4.7 (S)** CAPTCHA (Cloudflare Turnstile) public submit uchun — env bilan yoqiladi/o'chadi (bot endpointlariga taalluqli emas).

## B5 — Analitika, qidiruv, QR (P3)

- [ ] **B5.1 (M)** Heatmap endpoint (lat/lng weight, sana filtri) + mahalla kesimi stats.
- [ ] **B5.2 (M)** KPI endpoint: group_by department/user/neighborhood/category; o'rtacha birinchi javob vaqti, o'rtacha hal vaqti, SLA % (deadline ichida yopilganlar).
- [ ] **B5.3 (S)** Global search `q` (ticket, telefon, matn ILIKE; keyin kerak bo'lsa pg_trgm).
- [ ] **B5.4 (S)** QR CRUD: `qr_codes` yaratish, `segno` bilan PNG/PDF (A4 plakat — matn 3 tilda) generatsiya, MinIO'ga saqlash, scans hisoblagich (`GET /api/public/qr/{code}` da +1).
- [ ] **B5.5 (S)** Excel eksport (`openpyxl`): admin ro'yxat filtrlari bilan `GET /api/admin/complaints/export.xlsx`.
- [ ] **B5.6 (S)** Statistika vaqt zonasi tuzatish (Asia/Tashkent) — [01](01-hozirgi-holat.md) K8.

## Doimiy qoidalar (har taskda)

- Har endpoint Pydantic schema bilan (`app/schemas/`), Swagger'da ko'rinadi, [03](03-kontraktlar.md) dagi shaklga AYNAN mos.
- Har yangi jadval/ustun — avval [04](04-database.md) da bor bo'lishi kerak (yo'q bo'lsa: docs PR birinchi).
- Har status o'tishi faqat `workflow.py` orqali (routerlarda to'g'ridan-to'g'ri `complaint.status = ...` taqiqlanadi).
- Xato javoblari: `{"detail", "code"}` formati.
- Migratsiya + seed + `pytest -m smoke` yashil bo'lmaguncha task yopilmaydi.
