# 05 — Backend workstream (B-fazalar)

Egasi: backend sherik. Stack: FastAPI + SQLAlchemy + Alembic + Redis/ARQ + MinIO. Har task oldidan o'qish: [03-kontraktlar.md](03-kontraktlar.md), [04-database.md](04-database.md); AI tasklari uchun [07-ai-layer.md](07-ai-layer.md).

O'lchamlar: S ≤ 2 soat, M ≤ 1 kun, L = 2–3 kun (AI coder bilan odatda tezroq). Tartib — yuqoridan pastga; `[x]` bajarilganda belgilanadi va yoniga 1 qator izoh yoziladi.

## B1 — Poydevor: yangi sxema + guest oqimi (P1)

- [x] **B1.1 (M)** Alembic migratsiyalar M1–M5 ([04](04-database.md) §4) + modellarni yangilash (`app/models/`): citizen, department, category, keyword, neighborhood, complaint(+ustunlar), file, event, reply, ai_analysis, suggestion, stt_job, counters, qr, settings, audit. Enum'lar native PG ENUM emas, varchar+CHECK (M5) sifatida qilindi — kelajakda yangi status/kategoriya kodi qo'shish migratsiyasiz bo'ladi. M2'da organizations→departments 1:1 nom ko'chirish o'rniga canonical 14 bo'lim/15 kategoriya to'g'ridan-to'g'ri kiritildi (izoh: migration fayli ichida). Bo'sh bazadan `alembic upgrade head` toza o'tadi (sinovdan o'tkazildi).
- [x] **B1.2 (S)** `app/seed.py` yangilandi (14 bo'lim, 15 kategoriya 4 tilda, 106 keyword, admin, settings — idempotent) + `app/tools/import_neighborhoods.py`. Acceptance tekshirildi: bo'sh bazada `alembic upgrade head && python -m app.seed` xatosiz.
- [x] **B1.3 (M)** `app/services/tickets.py`: `INSERT...ON CONFLICT DO NOTHING` + `UPDATE...RETURNING` bilan row-safe counter, format `UY-YYYY-NNNNNN`.
- [x] **B1.4 (L)** `POST /api/public/complaints` (`app/routers/public.py`): citizen upsert, `python-magic` bilan fayl validatsiyasi, MinIO saqlash, ticket, `status=new`, `created` event, ARQ'ga `classify_complaint` enqueue. Auth yo'q. curl bilan sinovdan o'tkazildi (rasm bilan ham).
- [x] **B1.5 (M)** `GET /api/public/complaints/track`: status_simple, 4 qadamli timeline (`status_changed` + `assigned` eventlaridan hisoblanadi), reply_text, enumeration himoya (404 noto'g'ri telefon uchun ham).
- [x] **B1.6 (S)** `GET /api/public/categories`, `/neighborhoods`, `/qr/{code}` — barchasi ishlaydi.
- [x] **B1.7 (M)** `app/worker.py` (ARQ) + `docker-compose.yml`ga redis. `classify_complaint` keyword-only (DB'dagi `category_keywords`, normalize.py orqali). Worker orqali sinovdan o'tkazildi — "svet yo'q, chiroq o'chgan" → elektr, confidence 0.99.
- [x] **B1.8 (M)** `app/services/workflow.py`: `STATUS_TRANSITIONS` xaritasi, event+notification har o'tishda. `rejected` uchun note majburiyligi curl bilan tasdiqlandi (422 `validation_error`).
- [x] **B1.9 (M)** `app/routers/admin.py` to'liq qayta yozildi: pagination envelope (`Page[T]`), filtrlar (status/category/department_id/assigned_user_id/source/priority/overdue/needs_review/q/date), tafsilotda citizen/ai/files/events/department. Departments CRUD ham qo'shildi (admin-only). curl bilan list→detail→assign→status sinovdan o'tkazildi.
- [x] **B1.10 (S)** `app/services/deadline.py`: critical→min(sla,2h), high→sla/2, medium/low→sla. `classify_complaint` worker ai_processed bosqichida hisoblaydi.
- [x] **B1.11 (S)** `tests/test_smoke.py` (`pytest -m smoke`): health, guest submit→track→admin list→status change→reject-without-note, categories/neighborhoods, validation error shape. Toza bazadan (migrate+seed) 4/4 yashil.

**B1 Acceptance (checkpoint C1):** curl bilan ro'yxatdan o'tmasdan murojaat yuboriladi → ticket qaytadi → track ishlaydi → admin ro'yxatda ko'rinadi → status o'zgartirilsa track'da aks etadi.

## B2 — AI qatlam integratsiyasi (P2) — spec: [07-ai-layer.md](07-ai-layer.md)

- [x] **B2.1 (M)** Klassifikator v2 (`app/services/ai/classifier.py`): `confidence = top1/(top1+top2+1)`, margin sharti (`top1-top2>=2`), `AI_CONFIDENCE_THRESHOLD` bilan qaror (`confident: bool` maydoni). Xavfli so'zlar (`settings.danger_keywords`, DB'dan) → priority `high`. Callerlar (worker) endi `confident=False` bo'lsa LLM'ga murojaat qiladi.
- [x] **B2.2 (M)** `app/services/ai/llm.py`: Ollama `/api/chat` (`format=json`, `temperature=0`, `keep_alive=-1`), 2 marta retry, Pydantic (`LlmResult`) bilan priority/sentiment validatsiya (noto'g'ri qiymat → default), `LlmError` — hamma xato shu orqali propagatsiya qiladi.
- [x] **B2.3 (S)** `app/worker.py` `classify_complaint` to'liq: keyword ishonchsiz bo'lsa LLM chaqiriladi, ikkala natija ham `ai_analyses`ga yoziladi (`engine=keyword`/`llm`), LLM'ning noma'lum `category_code`si `boshqa`+`needs_review=true`ga tushadi, Ollama umuman javob bermasa keyword natija saqlanadi + `needs_review=true`. Docker'da real sinovdan o'tkazildi: Ollama o'chirilgan holatda submit va worker muvaffaqiyatli ishladi (checkpoint C2 talabi).
- [x] **B2.4 (M)** `app/services/ai/stt.py` (provider interfeys: `whisper` — `faster-whisper`, CPU int8; `mohirai` — stub, API kaliti bo'lmasa xato), ffmpeg orqali 16kHz mono wav konvert. `stt_jobs` + `POST/GET /api/public/stt[/{id}]`. `transcribe_audio` ARQ ishi. **Real sinovdan o'tkazildi**: audio yuklandi → worker `tiny` model'ni Hugging Face'dan avtomatik yukladi → transkripsiya bajarildi (`requests` kutubxonasi requirements'ga qo'shildi — faster-whisper'ning yashirin bog'liqligi edi).
- [x] **B2.5 (M)** `app/services/ai/learning.py` (`mine_keyword_suggestions`) + `app/worker.py`da ARQ cron (02:00). Admin endpointlar: `GET /keyword-suggestions`, `POST .../approve` (→ `category_keywords` `source=auto`), `POST .../reject`. Sun'iy LLM-tahlil ma'lumoti bilan sinovdan o'tkazildi: 11 nomzod chiqdi, approve qilingani darhol keyword bazasiga tushdi, ikkinchi marta approve 400 `already_reviewed` qaytardi.
- [x] **B2.6 (S)** `GET/POST/PATCH /api/admin/categories`, `GET/POST/DELETE /api/admin/categories/{id}/keywords` — admin-only (GET operator+). curl bilan sinovdan o'tkazildi (kirill matn ham to'g'ri normalizatsiya qilindi).
- [x] **B2.7 (S)** `dashboard_stats`ga `overdue`, `needs_review`, `by_priority`, `ai_accuracy_7d` (oxirgi 7 kun, `ai_category_id` vs `category_id`) qo'shildi. `needs_review` filtri admin ro'yxatida B1.9'dan beri bor edi.

**B2 Acceptance (checkpoint C2, qisman — SMS/javob sikli hali B3/B4):** Ollama o'chirilganda ham submit va AI pipeline ishlaydi ✅; keyword topolmagan matn → suggestions inbox → approve → xuddi shu matn endi keyword bilan topiladi ✅; ovozli murojaat → matn (STT) ✅. **Hali yo'q:** admin javob yozganda SMS/Telegram yuborish (B3.1/B4.1-2), rate limit (B4.3).

## B3 — Javoblar, kabinet, xodimlar (P2)

- [x] **B3.1 (M)** `POST /api/admin/complaints/{id}/replies` (employee+): reply saqlanadi, `reply_sent` event, fuqaroga in-app notify (SMS/Telegram — B4.1/B4.2 kelganda `channels` maydoniga qo'shiladi). AI draft `ai_analyses.suggested_reply` dan olinadi (LLM ishlagan bo'lsa). curl bilan sinovdan o'tkazildi.
- [x] **B3.2 (M)** `GET/POST/PATCH /api/admin/users` (admin-only), parol bcrypt bilan hash. `auth/me`ga `kind`/`role`/`department_id` B1'dan beri bor edi.
- [x] **B3.3 (S)** `POST /api/admin/complaints/{id}/comments` (`comment_added` event, fuqaroga ko'rinmaydi). RBAC bo'lim cheklovi: `_check_department_access` — employee/manager faqat `assigned_department_id`i o'ziniki bo'lgan murojaatlarni ko'radi/yozadi (list ham filtrlanadi, detail/status/assign/reply/comment'da 403 `forbidden`). Status o'tishlari rolga qarab cheklandi (`ROLE_ALLOWED_STATUSES`): operator→assigned/rejected, employee→in_progress/need_info/resolved, manager→+rejected/closed, admin→cheklovsiz. **Docker'da real sinovdan o'tkazildi:** boshqa bo'lim xodimi begona murojaatga kirsa 403, o'z bo'limida to'liq ishlaydi (status+reply).
- [x] **B3.4 (M)** `GET /api/citizen/complaints` (`app/routers/citizen.py`) — faqat login qilgan fuqaroning o'z murojaatlari (status_simple+category). `/api/auth/register` va `/login` B1'da tayyor edi. curl bilan sinovdan o'tkazildi (guest sifatida yuborilgan murojaat keyin register qilingach kabinetda ko'rindi — telefon bo'yicha bog'lanish ishladi).

## B4 — Bildirishnoma va xavfsizlik (P2–P3)

- [x] **B4.1 (M)** Eskiz SMS provayderi (`app/services/sms.py`): token Redis'da keshlanadi (~25 kun TTL, 401'da bir marta yangilab qayta urinadi), `send_sms` hech qachon exception ko'tarmaydi (xato bo'lsa `False`). Shablonlar 4 tilda (`app/i18n/messages.py`): qabul (ticket raqami bilan), status o'zgarishi (har bir status uchun alohida matn, shu jumladan need_info), rasmiy javob. `notify_citizen` (`app/services/notifications.py`) endi `sms_text` qabul qiladi — in-app yozuv + SMS urinishi (`notifications.channel=sms`, `status=sent/failed`) + `complaint_events.sms_sent` bitta joyda. Ulangan nuqtalar: ariza yuborilganda (public.py), har status o'tishida (workflow.py), biriktirilganda (workflow.py assign), javob yozilganda (admin.py). **Docker'da real sinovdan o'tkazildi:** `ESKIZ_EMAIL`/`ESKIZ_PASSWORD` sozlanmagani uchun `notifications.status=failed` to'g'ri yoziladi, matn shablonlari ticket raqami bilan to'g'ri render bo'ladi (production kalitlari kelganda xatti-harakat avtomatik `sent`ga o'tadi — kod o'zgarishi kerak emas).
- [ ] **B4.2 (S)** Telegram xabar yuborish (Bot API http chaqiruv, `telegram_chat_id` bo'lsa).
- [x] **B4.3 (M)** Rate limit — Redis'da qo'lda (`app/core/ratelimit.py`, fixed-window `INCR`+`EXPIRE`): submit 5/soat/telefon + 20/kun/IP, STT 10/soat/IP ([03](03-kontraktlar.md) §3 aynan). `track` uchun kontraktda raqam yo'q, lekin enumeration xavfi borligi uchun 30/soat/IP qo'shildi (izoh koddagi docstringda). Hammasi 429 `rate_limited`. **Docker'da real sinovdan o'tkazildi:** bitta telefon bilan 6-marta submit qilinganda 5-tasi 201, 6-tasi 429 qaytardi; `pytest -m smoke` ta'sirlanmadi (bitta submit/test).
- [ ] **B4.4 (S)** Fayl xavfsizligi yakuni: MIME+magic tekshiruv hamma yuklashlarda, EXIF strip (rasm), nom sanitizatsiya.
- [x] **B4.5 (M)** Eskalatsiya cron (`app/services/escalation.py` + `app/worker.py` `escalate_overdue_job`, ARQ cron har 30 daqiqada `minute={0,30}`): `deadline_at < now AND status NOT IN TERMINAL_STATUSES` (`TERMINAL_STATUSES` endi `app/core/constants.py`da, `admin.py`dagi overdue filtr/dashboard bilan bir xil ta'rif) bo'yicha aniqlanadi. Birinchi topilganda `assigned_department_id`dagi (yoki hali biriktirilmagan bo'lsa hammasi) `manager` rollariga in-app notification + `complaint_events.escalated` (`payload.level=manager`) yoziladi; shu event 24 soatdan oshsa va hali `level=admin` yozuvi bo'lmasa — barcha `admin`larga ham xuddi shunday ikkinchi bosqich ishlaydi. `escalated` eventining o'zi bosqichni "bajarildi" belgisi bo'lgani uchun cron necha marta ishga tushsa ham qayta xabar yubormaydi (idempotent). **Docker'da real sinovdan o'tkazildi:** bitta arizaning `deadline_at`sini orqaga surib to'g'ridan-to'g'ri `escalate_overdue()` chaqirildi → manager bosqichi ishladi (0 ta manager bo'lgani uchun `notified:0`, lekin event yozildi), qayta chaqirilganda takrorlanmadi, `escalated` eventi 25 soat orqaga suriladi → admin bosqichi ishladi va admin userga in-app notification keldi. `pytest -m smoke` 4/4 yashil.
- [ ] **B4.6 (S)** Audit log middleware (admin mutatsiyalari), `GET /api/admin/audit-logs`.
- [x] **B4.7 (S)** CAPTCHA (`app/services/captcha.py`, Cloudflare Turnstile `siteverify`): `TURNSTILE_SECRET_KEY` sozlanmasa butunlay o'chirilgan (hozirgi holat — frontendda widget hali ulanmagan, real site key yo'q), sozlansa `POST /api/public/complaints`ning yangi ixtiyoriy `captcha_token` maydoni tekshiriladi, muvaffaqiyatsiz bo'lsa 422 `captcha_failed`. Cloudflare o'zi ishlamay qolsa fuqaro bloklanmaydi (log qilib o'tkazib yuboriladi). Birlik test bilan sinovdan o'tkazildi (soxta secret → `captcha_failed` ko'tariladi). **Qolgan ish:** frontendga Turnstile widget ulash — real site key kelganda, alohida F-task.

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
