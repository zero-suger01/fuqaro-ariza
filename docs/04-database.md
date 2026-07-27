# 04 — Database: maqsadli sxema va migratsiya rejasi

PostgreSQL 16. Hamma id — UUID v4. Hamma vaqt — `timestamptz`. Enum qiymatlari [03-kontraktlar.md](03-kontraktlar.md) §2 dagi kanonik kodlar (DB'da `varchar` + CHECK yoki SQLAlchemy Enum — **string qiymat kontraktdagidek bo'lishi shart**).

## 1. Jadval ro'yxati (maqsad)

```
citizens, users(staff), departments, categories,
neighborhoods, complaints, complaint_files, complaint_events, replies,
citizen_messages, complaint_subtasks,
ai_analyses, stt_jobs, notifications, audit_logs,
qr_codes, ticket_counters, settings
```

> v1.3: `category_keywords` va `keyword_suggestions` jadvallari **olib tashlandi** (keyword dvigateli yo'q, [07](07-ai-layer.md) §1). Migratsiya: M8.
> v1.4: `citizen_messages` va `complaint_subtasks` qo'shildi. Migratsiya: M9.

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

**v1.4:** `must_change_password bool NOT NULL default false` — seed'dan yaratilgan admin uchun `true`. Login javobida qaytadi; `true` bo'lsa FE parol almashtirish sahifasiga majburan yo'naltiradi. Standart parol bilan production'ga chiqib ketishning oldini oladi.

**v1.7:** `avatar_url varchar(500) NULL` — xodim profil rasmi, S3/MinIO'da saqlanadi (`avatars/{user_id}.{ext}` deterministik kalit — qayta yuklash eskisini almashtiradi). Migratsiya: `alembic/versions/m14_staff_avatar.py`. Parolni tiklash kodi jadvalga tushmaydi — Redis'da vaqtinchalik (`pwreset:code:{phone}`, TTL 10 daqiqa, [03](03-kontraktlar.md) §4).

### departments — ichki bo'limlar va tashqi tashkilotlar (mavjud `organizations` o'rniga)

| Ustun | Tur |
|---|---|
| id, code varchar(50) UNIQUE, names jsonb, phone, email, is_external bool, is_active bool, created_at |
| **v1.4:** `wip_limit int NULL` — bo'limning bir vaqtda ola oladigan aktiv ish soni. Faqat **ko'rsatkich**, hech narsani bloklamaydi: oshgani dashboard jadvalida `over_limit` bilan belgilanadi ([03](03-kontraktlar.md) §5 `stats/queues`). |

### categories — kategoriyalar (enum EMAS, jadval)

| Ustun | Tur | Izoh |
|---|---|---|
| id | uuid PK | |
| code | varchar(50) UNIQUE | `suv`, `yol`... (kontrakt §2.3) |
| names | jsonb | `{"uz": "...", "oz": "...", "ru": "...", "en": "..."}` |
| descriptions | jsonb NULL | **M15** — LLM promptiga uzatiladigan CHEGARA izohi (`{"uz": "..."}`). Fuqaroga ko'rsatilmaydi. Uslub: «nima kiradi; nima kirmaydi -> qaysi kod». NULL bo'lsa prompt faqat nom bilan ishlaydi ([07](07-ai-layer.md) §1.1) |
| icon | varchar(50) | lucide ikon nomi |
| sla_hours | int NOT NULL default 72 | deadline hisobi uchun |
| department_id | uuid FK NULL | standart mas'ul bo'lim (AI routing shu orqali) |
| sort_order | int, is_active bool | |

### neighborhoods — mahallalar

`id, name varchar(150), is_active bool`. Seed: Uychi tumani MFY ro'yxati (hokimlikdan olinadi; boshlanishiga CSV import buyrug'i). **Hozircha `backend/data/uychi_mfy_SAMPLE.csv` (8 ta "NAMUNA —" prefiksli o'ylab topilgan nom) import qilingan — faqat wizard/UI mexanizmini tekshirish uchun, real ma'lumot EMAS.** Internetdan tumanning to'liq rasmiy 62 ta MFY ro'yxatini ishonchli topib bo'lmadi (qisman/ziddiyatli manbalar chiqdi). Hokimlikdan haqiqiy ro'yxat kelganda: yangi CSV yaratib `python -m app.tools.import_neighborhoods <csv>` ishga tushirish, so'ng namuna yozuvlarni `DELETE FROM neighborhoods WHERE name LIKE 'NAMUNA %'` bilan tozalash kerak.

### complaints — asosiy jadval (mavjudi kengayadi)

Qo'shiladi:

| Ustun | Tur | Izoh |
|---|---|---|
| ticket_number | varchar(20) UNIQUE NOT NULL | 85123456 |
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

**v1.4 da qo'shiladi (M9):**

| Ustun | Tur | Izoh |
|---|---|---|
| accepted_at | timestamptz NULL | xodim «Qabul qilaman» bosgan payt ([03](03-kontraktlar.md) §2.1). `avg_first_action_hours_7d` shu ustundan hisoblanadi — avval avto-accept tufayli ko'rsatkich soxta edi |
| info_requested_at | timestamptz NULL | `need_info` ga oxirgi o'tish payti — «24 soatdan ortiq javobsiz» navbatini indeks bilan hisoblash uchun |
| info_provided_at | timestamptz NULL | fuqaro (yoki xodim manual) oxirgi ma'lumot bergan payt |
| satisfaction | bool NULL | fuqaro bahosi ([03](03-kontraktlar.md) §3.6); NULL = baho berilmagan |
| reopened_count | int NOT NULL default 0 | fuqaro e'tirozi bilan necha marta qayta ochilgan |

O'zgaradi: `status` yangi kodlarga (§4 xarita); `description` min uzunlik 10 (validatsiya API darajasida). O'chadi: `organization_id` (→ assigned_department_id), `district` (bitta tuman), `category/ai_category` enum ustunlari.

Deadline formulasi: `critical → min(sla_hours, 2h)`, `high → sla_hours/2`, `medium/low → sla_hours`.

> **v1.4:** `deadline_at` endi **intake paytida** (`services/complaint_intake.py`) boshlang'ich qiymat bilan to'ldiriladi (fuqaro tanlagan yoki `boshqa` kategoriyasining `sla_hours`, `priority=medium`), LLM tahlildan keyin qayta hisoblanadi. Avval u faqat LLM'dan keyin yozilardi — LLM ishlamasa murojaat `deadline_at IS NULL` bo'lib qolib, SLA/eskalatsiya so'rovlariga (`deadline_at IS NOT NULL` sharti) umuman tushmasdi.

### complaint_files — barcha media (mavjud `images` o'rniga)

`id, complaint_id FK (CASCADE), kind varchar(10) [image|video|audio|document], url varchar(1000), mime varchar(100), size_bytes int, duration_s int NULL, created_at`.

### complaint_events — timeline + murojaat auditi

`id, complaint_id FK idx, event_type varchar(30) (kontrakt §8), actor_type varchar(10), actor_id uuid NULL, payload jsonb, created_at idx`.

### replies — rasmiy javoblar

`id, complaint_id FK, ai_draft text NULL (asos bo'lgan draft), text text NOT NULL, sent_by uuid FK users, channels jsonb (["sms","telegram"]), sent_at timestamptz`.

### citizen_messages — fuqarodan xodimga (v1.4, `replies` ning teskarisi)

| Ustun | Tur | Izoh |
|---|---|---|
| id | uuid PK | |
| complaint_id | uuid FK (CASCADE) idx | |
| text | text NOT NULL | |
| source | varchar(10) NOT NULL | `web` \| `telegram` \| `manual` ([03](03-kontraktlar.md) §3.5) |
| recorded_by | uuid FK users NULL | faqat `manual` uchun — kim yozib qo'ygan |
| created_at | timestamptz idx | |

Fuqaro keyin yuborgan **rasm/fayllar uchun alohida jadval yo'q** — `complaint_files` allaqachon `complaint_id` ga bog'langan, keyingi yuklamalar o'sha murojaatga tushadi va tafsilot sahifasida umumiy galereyada ko'rinadi.

### complaint_subtasks — idoralararo topshiriqlar (v1.4, S2)

| Ustun | Tur | Izoh |
|---|---|---|
| id | uuid PK | |
| complaint_id | uuid FK (CASCADE) idx | ota murojaat |
| department_id | uuid FK NOT NULL | bajaruvchi bo'lim |
| assigned_user_id | uuid FK users NULL | bo'lim ichidagi mas'ul |
| status | varchar(10) NOT NULL default 'open' | `open` \| `done` \| `cancelled` |
| note | text NOT NULL | nima qilinishi kerak |
| deadline_at | timestamptz NULL | |
| created_by | uuid FK users NULL | admin; **v1.5: `NULL` = AI yaratgan** ([07](07-ai-layer.md) §1.1). `complaint_events.actor_id` bilan bir xil naqsh — AI harakatida xodim bo'lmaydi |
| created_at / closed_at | timestamptz | |

Ota murojaat ochiq (`open`) sub-task bilan `resolved` ga o'ta olmaydi → 422 `subtasks_open`. Fuqaroga sub-tasklar ko'rinmaydi — javob **bitta va umumiy**.

Sub-taskni admin qo'lda yoki **AI avtomatik** yaratadi (v1.5): LLM `secondary_category_codes` qaytarsa, worker har bir kod uchun mos bo'limga topshiriq ochadi. AI yozuvida `created_by IS NULL`.

### ai_analyses — har AI yugurishi (tarix)

`id, complaint_id FK idx, engine varchar(10) [llm], suggested_category_id FK, confidence float, priority varchar(10), sentiment varchar(10), summary text, suggested_reply text, tags jsonb, model varchar(60) NULL, latency_ms int, created_at`.

(v1.3/M8: `confident` ustuni tashlandi — u faqat keyword dvigateli uchun kerak edi.)

AI aniqlik KPI: `ai_analyses.suggested_category_id` vs murojaatning yakuniy `category_id` (admin to'g'rilagani).

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

`complaints`: (status), (category_id), (assigned_department_id), (citizen_id), (created_at), (deadline_at), (ticket_number UNIQUE), (neighborhood_id). `complaint_events`: (complaint_id, created_at). `citizens`: (phone UNIQUE), (telegram_chat_id UNIQUE).

**v1.4 (M9):** `complaints`: (status, info_requested_at) — «javobsiz `need_info`» navbati; (assigned_user_id, status) — «Mening ishlarim» navbati. `citizen_messages`: (complaint_id, created_at). `complaint_subtasks`: (complaint_id), (department_id, status).

## 4. Mavjud sxemadan migratsiya (Alembic, tartib bilan)

Bitta katta migratsiya EMAS — kichik bosqichlar, har biri alohida tekshiriladi (M1–M5 boshlang'ich; keyin `m6_role_model_v2` — B6, `m7_llm_always` — R0):

1. **M1 — yangi jadvallar** (tarixiy; `category_keywords`/`keyword_suggestions` M8'da tashlandi)**:** citizens, departments, categories, category_keywords, neighborhoods, complaint_files, complaint_events, replies, ai_analyses, keyword_suggestions, stt_jobs, ticket_counters, qr_codes, settings, audit_logs. Seed data migratsiya ichida EMAS — `python -m app.seed` yangilanadi.
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
6. **M7 — LLM-always (R0):** `ai_analyses.confident boolean NULL` qo'shildi (M8'da qayta tashlandi — pastga qarang). Fayl: `alembic/versions/m7_llm_always.py`.
7. **M8 — LLM-only (v1.3):** `category_keywords` va `keyword_suggestions` jadvallari DROP, `ai_analyses.confident` ustuni DROP, `ai_analyses` dagi eski `engine='keyword'` yozuvlari o'chiriladi (ular endi hech qayerda o'qilmaydi va KPI hisobini buzadi). **Ma'lumot yo'qoladi:** 106 ta seed keyword va taklif navbati — ikkalasi ham qayta tiklanmaydi, lekin seed keywordlar `app/seed.py` tarixida qolgan va taklif navbati hosila ma'lumot edi. `downgrade()` sxemani qaytaradi (bo'sh jadvallar bilan). Fayl: `alembic/versions/m8_llm_only.py`.

8. **M9 — egalik va ma'lumot sikli (v1.4):** `complaints` ga `accepted_at`, `info_requested_at`, `info_provided_at`, `satisfaction`, `reopened_count`; `departments.wip_limit`; `users.must_change_password`; yangi jadvallar `citizen_messages`, `complaint_subtasks`; yangi indekslar (§3). **Backfill:** mavjud `accepted`/`in_progress`+ statusdagi murojaatlar uchun `accepted_at` — `complaint_events` dagi `status_changed → accepted` eventining vaqti (yo'q bo'lsa NULL qoladi). `ck_complaints_status` CHECK'iga tegilmaydi — yangi status qo'shilmagan, faqat yangi **o'tishlar** (`resolved→in_progress`, `closed→in_progress`) qo'shilgan, ular esa ilova darajasida. Fayl: `alembic/versions/m9_ownership_and_info_loop.py`.

9. **M10 — AI sub-tasklari (v1.5):** `complaint_subtasks.created_by` `NOT NULL` → `NULL`. Sabab: AI ko'p bo'limli murojaatni o'zi bo'lganda topshiriqni **xodim emas, AI** yaratadi ([07](07-ai-layer.md) §1.1) va `created_by` ga yozadigan `users.id` yo'q. `complaint_events.actor_id` allaqachon shu naqshda (AI harakatida NULL). Ma'lumot yo'qolmaydi; `downgrade()` ustunni qayta `NOT NULL` qiladi va buning uchun avval AI yaratgan qatorlarni **o'chiradi** (ular uchun to'g'ri `created_by` qiymati yo'q — docstring'da ogohlantirilgan). Fayl: `alembic/versions/m10_ai_subtasks.py`.

10. **M15 — kategoriya tavsiflari (v1.8):** `categories.descriptions` jsonb NULL. LLM promptiga uzatiladigan chegara izohi. Sabab: [07](07-ai-layer.md) §1.1 promptni «kod — **tavsif**» deb ta'riflardi va §5 aniqlikni oshirish vositasi sifatida «kategoriya tavsiflarini aniqlashtirish»ni ko'rsatardi, lekin bunday ustun umuman yo'q edi va prompt faqat `kod: nom` yuborardi — hujjat mavjud bo'lmagan vositaga tayanardi. Nullable, orqaga mos. Fayl: `alembic/versions/m15_category_descriptions.py`.

> Dev bazalar odatda bo'sh — lekin migratsiya baribir data-safe yoziladi (server pilotida kerak bo'ladi). Har migratsiyadan keyin: `alembic upgrade head && python -m app.seed && pytest -k smoke`.

## 5. Seed (yangilangan `app/seed.py`)

1) 15 kategoriya (names 4 tilda, icon, sla_hours, department bog'lash); 2) ~10 bo'lim (Suvsoz, Hudgaz, Elektr tarmoqlari, Yo'l xo'jaligi, Obodonlashtirish, Ekologiya, Qurilish inspeksiyasi, Kadastr, Soliq, Hokimlik murojaat bo'limi); 3) ~~keyword seed~~ (v1.3: keyword dvigateli yo'q); 4) admin user — **v1.4: faqat `ADMIN_SEED_PHONE` + `ADMIN_SEED_PASSWORD` env berilganda**; 5) `settings` standartlari; 6) mahalla CSV import buyrug'i: `python -m app.tools.import_neighborhoods data/uychi_mfy.csv`.

**v1.4 — seed xavfsizligi.** Avval seed hardcode qilingan `+998900000000 / admin123` adminini har doim yaratardi — bu hisob production'ga o'zgarishsiz chiqib ketishi mumkin edi. Endi:

- Admin **faqat** `ADMIN_SEED_PHONE` va `ADMIN_SEED_PASSWORD` ikkalasi berilganda yaratiladi; berilmasa yaratilmaydi va konsolga ogohlantirish chiqadi. Standart parol kodda qolmaydi.
- Yaratilgan adminga `must_change_password=true` qo'yiladi — birinchi kirishda parol almashtirish majburiy.
- Demo/test yozuvlari (sinov bo'limlari, sinov xodimlari, namuna murojaatlar) **faqat `python -m app.seed --demo`** bilan yaratiladi. Bayroqsiz seed faqat kataloglarni (bo'limlar, kategoriyalar, settings) qo'yadi — production'da xavfsiz.
- Productionga chiqishdan oldingi cheklist: [11-devops.md](11-devops.md) §1.
