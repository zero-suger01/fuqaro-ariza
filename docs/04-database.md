# 04 — Database: maqsadli sxema va migratsiya rejasi

PostgreSQL 16. Hamma id — UUID v4. Hamma vaqt — `timestamptz`. Enum qiymatlari [03-kontraktlar.md](03-kontraktlar.md) §2 dagi kanonik kodlar (DB'da `varchar` + CHECK yoki SQLAlchemy Enum — **string qiymat kontraktdagidek bo'lishi shart**).

## 1. Jadval ro'yxati (maqsad)

```
citizens, users(staff), departments, categories, category_keywords,
neighborhoods, complaints, complaint_files, complaint_events, replies,
ai_analyses, keyword_suggestions, stt_jobs, notifications, audit_logs,
qr_codes, ticket_counters, settings
```

## 2. Jadval spetsifikatsiyalari

### citizens — fuqarolar (parolsiz ham yashaydi)

| Ustun | Tur | Izoh |
|---|---|---|
| id | uuid PK | |
| phone | varchar(16) UNIQUE NOT NULL | E.164 |
| first_name / last_name | varchar(100) / varchar(100) NULL | |
| language | varchar(4) NOT NULL default 'uz' | uz/oz/ru/en |
| password_hash | varchar(255) NULL | NULL = guest (kabinet ochmagan) |
| is_phone_verified | bool default false | SMS OTP dan keyin true (P2) |
| telegram_chat_id | bigint NULL UNIQUE | bot bog'laganda |
| created_at | timestamptz | |

Guest submit: telefon bo'yicha upsert (ism yangilanadi, mavjud bo'lsa qayta yaratilmaydi).

### users — FAQAT xodimlar

Mavjud jadval o'zgaradi: `role` → `department_staff|admin` (B6, `alembic/versions/m6_role_model_v2.py`; dastlab `operator|employee|manager|admin` edi, `operator/employee/manager` birlashtirildi); qo'shiladi: `department_id uuid NULL FK`, `is_active bool default true`. Fuqaro-akkauntlar bu jadvaldan `citizens` ga ko'chiriladi (§4).

### departments — ichki bo'limlar va tashqi tashkilotlar (mavjud `organizations` o'rniga)

| Ustun | Tur |
|---|---|
| id, code varchar(50) UNIQUE, names jsonb, phone, email, is_external bool, is_active bool, created_at |

### categories — kategoriyalar (enum EMAS, jadval)

| Ustun | Tur | Izoh |
|---|---|---|
| id | uuid PK | |
| code | varchar(50) UNIQUE | `suv`, `yol`... (kontrakt §2.3) |
| names | jsonb | `{"uz": "...", "oz": "...", "ru": "...", "en": "..."}` |
| icon | varchar(50) | lucide ikon nomi |
| sla_hours | int NOT NULL default 72 | deadline hisobi uchun |
| department_id | uuid FK NULL | standart mas'ul bo'lim (AI routing shu orqali) |
| sort_order | int, is_active bool | |

### category_keywords — klassifikator lug'ati (DB'da, kodda EMAS)

| Ustun | Tur | Izoh |
|---|---|---|
| id, category_id FK | | |
| keyword_norm | varchar(120) | **normalizatsiyadan o'tgan** shakl (lotin, kichik, ' birxillashtirilgan) |
| weight | smallint default 1 | kuchli so'zga 2–3 |
| source | varchar(10) | seed/admin/auto |
| created_at | | |

UNIQUE (category_id, keyword_norm).

### neighborhoods — mahallalar

`id, name varchar(150), is_active bool`. Seed: Uychi tumani MFY ro'yxati (hokimlikdan olinadi; boshlanishiga CSV import buyrug'i). **Hozircha `backend/data/uychi_mfy_SAMPLE.csv` (8 ta "NAMUNA —" prefiksli o'ylab topilgan nom) import qilingan — faqat wizard/UI mexanizmini tekshirish uchun, real ma'lumot EMAS.** Internetdan tumanning to'liq rasmiy 62 ta MFY ro'yxatini ishonchli topib bo'lmadi (qisman/ziddiyatli manbalar chiqdi). Hokimlikdan haqiqiy ro'yxat kelganda: yangi CSV yaratib `python -m app.tools.import_neighborhoods <csv>` ishga tushirish, so'ng namuna yozuvlarni `DELETE FROM neighborhoods WHERE name LIKE 'NAMUNA %'` bilan tozalash kerak.

### complaints — asosiy jadval (mavjudi kengayadi)

Qo'shiladi:

| Ustun | Tur | Izoh |
|---|---|---|
| ticket_number | varchar(20) UNIQUE NOT NULL | UY-2026-000145 |
| citizen_id | uuid FK NOT NULL | user_id o'rnini bosadi |
| category_id | uuid FK NOT NULL | enum ustunlar o'chadi |
| priority | varchar(10) default 'medium' | |
| source | varchar(10) default 'web' | web/telegram/qr/operator |
| language | varchar(4) default 'uz' | |
| neighborhood_id | uuid FK NULL | matnli `neighborhood` ustuni o'chadi |
| assigned_department_id / assigned_user_id | uuid FK NULL | |
| deadline_at | timestamptz NULL | created_at + SLA (kategoriya, priority) |
| needs_review | bool default false | AI ishonchsiz bo'lsa `true` — avto-routing ishlamaydi (B6), admin diqqatiga qoladi |
| ai_category_id | uuid FK NULL, ai_confidence float NULL | denormalizatsiya (oxirgi tahlil) |
| rejected_reason | text NULL | |

O'zgaradi: `status` yangi kodlarga (§4 xarita); `description` min uzunlik 10 (validatsiya API darajasida). O'chadi: `organization_id` (→ assigned_department_id), `district` (bitta tuman), `category/ai_category` enum ustunlari.

Deadline formulasi: `critical → min(sla_hours, 2h)`, `high → sla_hours/2`, `medium/low → sla_hours`.

### complaint_files — barcha media (mavjud `images` o'rniga)

`id, complaint_id FK (CASCADE), kind varchar(10) [image|video|audio|document], url varchar(1000), mime varchar(100), size_bytes int, duration_s int NULL, created_at`.

### complaint_events — timeline + murojaat auditi

`id, complaint_id FK idx, event_type varchar(30) (kontrakt §8), actor_type varchar(10), actor_id uuid NULL, payload jsonb, created_at idx`.

### replies — rasmiy javoblar

`id, complaint_id FK, ai_draft text NULL (asos bo'lgan draft), text text NOT NULL, sent_by uuid FK users, channels jsonb (["sms","telegram"]), sent_at timestamptz`.

### ai_analyses — har AI yugurishi (tarix)

`id, complaint_id FK idx, engine varchar(10) [keyword|llm], suggested_category_id FK, confidence float, priority varchar(10), sentiment varchar(10), summary text, suggested_reply text, tags jsonb, model varchar(60) NULL, latency_ms int, created_at`.

AI aniqlik KPI: `ai_analyses.suggested_category_id` vs murojaatning yakuniy `category_id` (admin to'g'rilagani).

### keyword_suggestions — o'rganish sikli navbati

`id, phrase_norm varchar(120), suggested_category_id FK NULL, occurrences int, sample_complaint_ids jsonb, status varchar(10) [pending|approved|rejected], created_at, reviewed_by uuid NULL, reviewed_at NULL`. UNIQUE (phrase_norm, suggested_category_id).

### stt_jobs

`id, status varchar(10) [pending|done|failed], audio_url varchar(1000), language varchar(4), text text NULL, error varchar(200) NULL, ip varchar(45), created_at, finished_at`.

### notifications (mavjudi kengayadi)

Qo'shiladi: `citizen_id uuid FK NULL` (user_id NULL bo'lishi mumkin bo'ladi), `channel` mavjud, `status varchar(10) [queued|sent|failed] default sent`, `meta jsonb` (sms id va h.k.).

### audit_logs — xodim harakatlari (global, P3)

`id, user_id FK, action varchar(50), entity varchar(30), entity_id uuid, meta jsonb, ip varchar(45), created_at idx`.

### qr_codes

`id, code varchar(20) UNIQUE (qisqa slug), neighborhood_id FK NULL, note varchar(200), scans int default 0, created_at`.

### ticket_counters

`year int PK, last_value int`. Ticket olish: `UPDATE ... SET last_value = last_value + 1 RETURNING` (row lock — poyga xavfsiz). Yil yo'q bo'lsa INSERT 1.

### settings

`key varchar(50) PK, value jsonb`. (`ai_confidence_threshold`, `sla_escalation_hours`, ...) — env'dan ustun turadi, admin UI P3.

## 3. Indekslar (minimal majburiy)

`complaints`: (status), (category_id), (assigned_department_id), (citizen_id), (created_at), (deadline_at), (ticket_number UNIQUE), (neighborhood_id). `complaint_events`: (complaint_id, created_at). `category_keywords`: (keyword_norm). `citizens`: (phone UNIQUE), (telegram_chat_id UNIQUE).

## 4. Mavjud sxemadan migratsiya (Alembic, tartib bilan)

Bitta katta migratsiya EMAS — 5 ta kichik, har biri alohida tekshiriladi:

1. **M1 — yangi jadvallar:** citizens, departments, categories, category_keywords, neighborhoods, complaint_files, complaint_events, replies, ai_analyses, keyword_suggestions, stt_jobs, ticket_counters, qr_codes, settings, audit_logs. Seed data migratsiya ichida EMAS — `python -m app.seed` yangilanadi.
2. **M2 — data ko'chirish (data migration):**
   - `users.role='user'` qatorlar → `citizens` (phone, ism, password_hash ko'chadi); `users` da faqat staff qoladi (`admin` → role `admin`).
   - `organizations` → `departments` (`is_external=true`, names.uz = name).
   - Kategoriya enum → `categories` qatorlariga (10 mavjud kod + 5 yangi: transport, kommunal, kadastr, soliq, ijtimoiy).
   - `images` → `complaint_files (kind='image')`.

   > **Amalda qilingan (2026-07-24, B1.1):** `organizations` nomlarini 1:1 `departments`ga ko'chirish o'rniga, M2 to'g'ridan-to'g'ri canonical 14 bo'lim + 15 kategoriya ro'yxatini (4 tilda, `app/seed.py` bilan bir xil) kiritadi, `complaints.assigned_department_id` esa M3'da murojaatning (backfill qilingan) kategoriyasining standart bo'limidan olinadi. Sabab: eski `organizations` jadvalida yangi taksonomiyaning (transport/kommunal/kadastr/soliq/ijtimoiy) ko'pi umuman yo'q edi, nomga qarab moslashtirish esa mo'rt bo'lardi. Amaldagi (bo'sh) dev bazada buning ma'lumot yo'qotish oqibati yo'q. Tafsilot: `backend/alembic/versions/m2_data_migration.py` docstring'i.
3. **M3 — complaints ustunlari:** yangi ustunlar qo'shish; `citizen_id` to'ldirish (user→citizen xarita orqali); `category_id` to'ldirish (enum kod → categories.code); `ticket_number` generatsiya (created_at yili bo'yicha ketma-ket); status xaritasi:
   `yangi→new, korib_chiqilmoqda→ai_processed, masul_tashkilotga_yuborildi→assigned, jarayonda→in_progress, hal_qilindi→resolved, rad_etildi→rejected`.
4. **M4 — eski ustun/jadvallarni o'chirish:** complaints.user_id/organization_id/district/category(enum)/ai_category(enum); jadvallar: organizations, images. Eski enum tiplar DROP.
5. **M5 — indekslar + CHECK'lar.**

> Dev bazalar odatda bo'sh — lekin migratsiya baribir data-safe yoziladi (server pilotida kerak bo'ladi). Har migratsiyadan keyin: `alembic upgrade head && python -m app.seed && pytest -k smoke`.

## 5. Seed (yangilangan `app/seed.py`)

1) 15 kategoriya (names 4 tilda, icon, sla_hours, department bog'lash); 2) ~10 bo'lim (Suvsoz, Hudgaz, Elektr tarmoqlari, Yo'l xo'jaligi, Obodonlashtirish, Ekologiya, Qurilish inspeksiyasi, Kadastr, Soliq, Hokimlik murojaat bo'limi); 3) keyword seed — [07-ai-layer.md](07-ai-layer.md) §3 dagi kengaytirilgan lug'at (mavjud classifier.py lug'ati + kirill/sheva variantlari), `source='seed'`; 4) admin user; 5) `settings` standartlari; 6) mahalla CSV import buyrug'i: `python -m app.tools.import_neighborhoods data/uychi_mfy.csv`.
