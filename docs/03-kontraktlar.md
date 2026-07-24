# 03 — Kontraktlar (yagona haqiqat manbai)

> **QOIDA:** Bu fayldagi biror narsani o'zgartirmasdan turib kodda enum/endpoint/format o'zgartirish TAQIQLANADI. O'zgarish tartibi: shu faylga PR → ikkinchi sherik "OK" → kod. AI coder'lar bu faylni faqat O'QIYDI.
>
> Versiya: **v1.2** (2026-07-25). O'zgarishlar pastdagi "Changelog" ga yoziladi.

## 1. Umumiy formatlar

| Narsa | Format | Misol |
|---|---|---|
| Ticket raqami | `{PREFIX}-{YYYY}-{NNNNNN}`; prefiks env `TICKET_PREFIX` (standart `UY`); counter har yil 1 dan | `UY-2026-000145` |
| Telefon | DB va API'da E.164: `+998XXXXXXXXX` (13 belgi). Ko'rsatishda FE formatlaydi: `+998 (90) 123-45-67` | `+998901234567` |
| Vaqt | API'da ISO 8601 UTC (`Z` bilan). Ko'rsatish har doim `Asia/Tashkent` | `2026-07-24T09:30:00Z` |
| ID | UUID v4 (string) | |
| Til kodi | `uz` (lotin, standart), `oz` (kirill), `ru`, `en` | |
| Pul/foiz | ishlatilmaydi / 0–1 float (confidence) | `0.87` |

**Xato javobi** (hamma endpointlar): HTTP status + JSON `{"detail": "Inson o'qiydigan xabar (so'rov tilida)", "code": "machine_code"}`. `code` — barqaror mashina kodi (`not_found`, `validation_error`, `rate_limited`, `forbidden`, `stt_failed`, `reply_required`...). FE `detail` ni ko'rsatadi, `code` bo'yicha logika qiladi.

**Pagination envelope** (ro'yxat qaytaruvchi admin endpointlar): so'rov `?page=1&page_size=20` (max 100); javob:

```json
{ "items": [...], "total": 137, "page": 1, "page_size": 20 }
```

## 2. Enum'lar (kanonik kodlar — hamma joyda AYNAN shu stringlar)

### 2.1 ComplaintStatus (to'liq, admin ko'radi)

| Kod | Ma'nosi (uz) | Kim qo'yadi | Faza |
|---|---|---|---|
| `new` | Qabul qilindi | tizim (submit) | P1 |
| `ai_processed` | AI tahlil qildi, operator navbatida | worker | P1 |
| `assigned` | Bo'limga yo'naltirildi | operator/admin | P1 |
| `accepted` | Bo'lim qabul qildi | bo'lim xodimi | P3 |
| `in_progress` | Ijroda | bo'lim xodimi | P1 |
| `need_info` | Fuqarodan ma'lumot kutilmoqda | xodim | P2 |
| `resolved` | Hal qilindi | xodim/manager | P1 |
| `rejected` | Rad etildi (sabab majburiy) | operator/manager | P1 |
| `closed` | Yopildi (fuqaro tasdig'i yoki 7 kun sukut) | tizim/operator | P2 |
| `archived` | Arxivlandi | tizim | P3 |

Ruxsat etilgan o'tishlar: `new→ai_processed→assigned→(accepted)→in_progress→resolved→closed→archived`; `rejected` — `new/ai_processed/assigned/accepted` dan (v1.2.1: `accepted` avtomatik qo'yilgani uchun rad etish imkoni saqlanadi); `need_info` — `assigned/accepted/in_progress` dan va qaytishi `in_progress` ga. Boshqa o'tish = 422 `invalid_transition`.

**`accepted` avtomatik (R0/Q2):** biriktirilgan murojaatni o'z bo'limi xodimi tafsilot sahifasida BIRINCHI marta ochganida FE avtomatik `PATCH status=accepted` yuboradi (actor — o'sha xodim). Alohida tugma UI'dan olib tashlanadi; qo'lda bosish shart emas. «Bo'lim qachon ko'rdi» audit izi saqlanadi, ortiqcha bosish yo'qoladi.

### 2.2 Fuqaro uchun soddalashtirilgan status (`status_simple`)

Fuqaroga HECH QACHON 10 status ko'rsatilmaydi. Backend `status_simple` ni hisoblab beradi:

| `status_simple` | Qamraydi | Fuqaro ko'radigan yozuv (uz) |
|---|---|---|
| `qabul_qilindi` | new, ai_processed | "Qabul qilindi" |
| `korilmoqda` | assigned, accepted | "Ko'rib chiqilmoqda" |
| `ijroda` | in_progress, need_info | "Ijroda" (need_info bo'lsa qo'shimcha banner) |
| `yakunlandi` | resolved, closed, archived | "Yakunlandi" |
| `rad_etildi` | rejected | "Rad etildi" + sabab |

### 2.3 Boshqa enum'lar

- **Priority:** `low` | `medium` | `high` | `critical`
- **Sentiment:** `negative` | `neutral` | `positive`
- **Source:** `web` | `telegram` | `qr` | `operator` (operator — telefon orqali kelganini qo'lda kiritsa)
- **FileKind:** `image` | `video` | `audio` | `document`
- **StaffRole:** `department_staff` | `admin` (B6 — dastlab `operator`|`employee`|`manager`|`admin` edi, birinchi uchtasi birlashtirildi)
- **AiEngine:** `keyword` | `llm`
- **NotificationChannel:** `in_app` | `sms` | `telegram` | `email`
- **KeywordSource:** `seed` | `admin` | `auto`
- **Kategoriya kodlari** (DB jadval, bu seed ro'yxat): `chiqindi`, `yol`, `transport`, `elektr`, `gaz`, `suv`, `kommunal`, `daraxt`, `ekologiya`, `qurilish`, `obodonlashtirish`, `kadastr`, `soliq`, `ijtimoiy`, `boshqa`. Yangi kategoriya admin paneldan qo'shiladi (migratsiyasiz), lekin kod olib TASHLANMAYDI.

### 2.4 Fayl limitlari (server tekshiradi, FE oldindan ogohlantiradi)

| Tur | Max hajm | Max soni | MIME whitelist |
|---|---|---|---|
| image | 10 MB | 5 ta | image/jpeg, image/png, image/webp, image/heic |
| video | 50 MB | 1 ta | video/mp4, video/quicktime |
| audio | 10 MB / ≤120 s | 1 ta | audio/ogg, audio/webm, audio/mpeg, audio/mp4, audio/wav |

Server magic-byte tekshiradi (`python-magic`); mos kelmasa 422 `invalid_file`.

## 3. Public API (auth YO'Q, rate limit BOR)

### 3.1 `POST /api/public/complaints` — murojaat yuborish (multipart/form-data)

Maydonlar: `description` (str, 10–5000; audio yuborilsa bo'sh bo'lishi mumkin — STT matni bilan to'ldiriladi), `first_name` (str, 1–100), `last_name` (str, 0–100, ixtiyoriy), `phone` (E.164, majburiy), `language` (uz|oz|ru|en, standart uz), `source` (web|telegram|qr, standart web), `category_code` (ixtiyoriy — fuqaro tanlasa), `latitude`/`longitude` (ixtiyoriy float), `address` (str, ixtiyoriy), `neighborhood_id` (uuid, ixtiyoriy), `images` (fayl[]), `video` (fayl), `audio` (fayl), `qr_code` (str, ixtiyoriy — QR plakat identifikatori).

Javob `201`:

```json
{
  "id": "e0a1...",
  "ticket_number": "UY-2026-000145",
  "status": "new",
  "status_simple": "qabul_qilindi",
  "created_at": "2026-07-24T09:30:00Z",
  "track_url": "/holat?ticket=UY-2026-000145"
}
```

Muhim: javob AI natijasini KUTMAYDI (AI async). Rate limit: 5 ta / soat / telefon, 20 ta / kun / IP → 429 `rate_limited`.

### 3.2 `GET /api/public/complaints/track?ticket=UY-2026-000145&phone=%2B998901234567` — holat

Telefon murojaat egasinikiga mos kelmasa ham 404 `not_found` (enumeration himoyasi). Javob `200`:

```json
{
  "ticket_number": "UY-2026-000145",
  "status_simple": "ijroda",
  "need_info": false,
  "category": {"code": "suv", "name": "Suv va kanalizatsiya"},
  "department": {"code": "suvsoz", "name": "Suvsoz (suv ta'minoti) korxonasi"},
  "created_at": "2026-07-24T09:30:00Z",
  "deadline_at": "2026-07-27T09:30:00Z",
  "timeline": [
    {"step": "qabul_qilindi", "at": "2026-07-24T09:30:00Z", "done": true},
    {"step": "korilmoqda",   "at": "2026-07-24T10:02:00Z", "done": true},
    {"step": "ijroda",       "at": "2026-07-24T12:15:00Z", "done": true},
    {"step": "yakunlandi",   "at": null,                    "done": false}
  ],
  "reply_text": null,
  "rejected_reason": null
}
```

`timeline` — doim 4 qadam (rad etilganda `rejected_reason` to'ladi va FE qizil holat ko'rsatadi). `reply_text` — yuborilgan rasmiy javob matni (bo'lsa). `department` — biriktirilgan mas'ul bo'lim (nomi kategoriya bilan bir xil til qoidasida); hali yo'naltirilmagan bo'lsa `null` — fuqaro «murojaatim qayerda» degan savolga javob oladi (R0/Q5).

### 3.3 Ovoz→matn: `POST /api/public/stt` (multipart: `audio`, `language`)

Javob `202`: `{"job_id": "..."}`. Keyin `GET /api/public/stt/{job_id}` → `{"status": "pending"|"done"|"failed", "text": "...", "code": null|"stt_failed"}`. FE 1 soniyada poll qiladi, 90 s timeout. Rate limit: 10/soat/IP.

### 3.4 Lug'atlar

- `GET /api/public/categories?lang=uz` → `[{"code": "suv", "name": "Suv va kanalizatsiya", "icon": "droplet"}, ...]` (faqat `is_active`).
- `GET /api/public/neighborhoods` → `[{"id": "...", "name": "Bog'ishamol MFY"}, ...]`.
- `GET /api/public/qr/{qr_code}` → `{"neighborhood_id": "...", "neighborhood_name": "..."}` (QR landing prefill uchun; topilmasa 404).

## 4. Auth API (xodimlar + ixtiyoriy fuqaro kabineti)

Mavjud `/api/auth/register|login|me` saqlanadi. `register` endi **fuqaro kabineti** uchun (telefon+parol; xodimni faqat admin yaratadi). `me` javobiga `kind: "citizen"|"staff"` va staff uchun `role`, `department_id`, `department_name` (B6, bor bo'lsa — UI'da bo'lim nomini ko'rsatish uchun) qo'shiladi. Kabinet P2'da — P1'da FE login sahifasini faqat xodimlar uchun ko'rsatadi.

## 5. Admin API (`/api/admin/*`, JWT + StaffRole tekshiruvi)

Mavjud endpointlar saqlanadi, quyidagilar o'zgaradi/qo'shiladi (— bilan belgilanganlar breaking):

| Metod va yo'l | Nima | Kim | Faza |
|---|---|---|---|
| `GET /api/admin/complaints` — **pagination envelope'ga o'tadi** + yangi filtrlar: `priority`, `department_id`, `assigned_user_id`, `source`, `overdue=true`, `needs_review=true`, `q` (ticket/telefon/matn); har bir qatorda `department` (B6, biriktirilgan bo'lim) | ro'yxat | department_staff+ | P1 |
| `GET /api/admin/complaints/{id}` — javobga `ticket_number`, `citizen`, `priority`, `deadline_at`, `ai` (oxirgi tahlil), `files`, `events`, `replies`, `department`, `assigned_user` qo'shiladi | tafsilot | department_staff+ | P1 |
| `PATCH /api/admin/complaints/{id}/status` body: `{"status": "...", "note": "...?", "reply_text": "...?"}` — o'tish qoidalari tekshiriladi; `rejected` uchun `note` majburiy. **R0/Q2:** `reply_text` faqat `status=resolved` bilan qabul qilinadi — berilsa server AVVAL rasmiy javob yaratadi (`POST .../replies` bilan bir xil yon effektlar), KEYIN statusni o'tkazadi (bitta tranzaksiya). `resolved` uchun javob MAJBURIY: yo shu so'rovda `reply_text`, yo murojaatda oldin yuborilgan javob — aks holda 422 `reply_required` (telefonda hal bo'lsa ham 1–2 jumlalik yakun yoziladi) | status | roliga qarab | P1 |
| `POST /api/admin/complaints/{id}/assign` body: `{"department_id": "...", "assigned_user_id": "...?"}` — B6: AI ishonchli bo'lganda (`needs_review=false`) `classify_complaint` worker shu mantiqni o'zi (`actor_type=ai`) chaqiradi; bu endpoint endi faqat admin uchun — ishonchsiz/yo'naltirilmagan murojaatlarni qo'lda yo'naltirish yoki AI xato yo'naltirsa qayta yo'naltirish (tuzatish) uchun | biriktirish/qayta yo'naltirish | admin | P1 |
| `POST /api/admin/complaints/{id}/review` body: `{"category_code": "...?", "department_id": "...?"}` (ikkalasi ixtiyoriy) — **R0/Q3:** needs_review navbatini BIR bosishda yopish: kategoriya (default — AI taklifi, ya'ni oxirgi tahlilning `suggested_category`), bo'lim (default — yakuniy kategoriyaning bo'limi) o'rnatiladi, murojaat biriktiriladi (mavjud `assign` mantiqi, `actor_type=staff`), `needs_review=false`, `reviewed` event yoziladi. Javob: yangilangan tafsilot obyekti. `assign` o'z o'rnida qoladi (erkin qayta yo'naltirish); `review` — uning «AI taklifiga rozilik» o'rami | AI tekshiruv navbati | admin | R2 |
| `POST /api/admin/complaints/{id}/replies` body: `{"text": "..."}` → SMS/telegram/status sahifaga chiqadi; javob eventga yoziladi. **R0:** server javob yaratilayotgan paytdagi AI draftini (murojaatning oxirgi `ai_analyses.suggested_reply`) `replies.ai_draft`ga snapshot qiladi — draft-qabul KPI shu ustundan hisoblanadi, client hech narsa yubormaydi | rasmiy javob | department_staff+ | P2 |
| `GET/POST/PATCH /api/admin/departments` | bo'limlar CRUD | admin (GET — department_staff+) | P1 |
| `GET/POST/PATCH /api/admin/categories` (+ `sla_hours`, `department_id`, `names`, `is_active`) | kategoriya CRUD | admin (GET — department_staff+) | P2 |
| `GET/POST/DELETE /api/admin/categories/{id}/keywords` | keyword boshqarish | admin (GET — department_staff+) | P2 |
| `GET /api/admin/keyword-suggestions` / `POST .../{id}/approve` / `POST .../{id}/reject` | o'rganish sikli | admin | P2 |
| `GET/POST/PATCH /api/admin/users` (staff CRUD, rol, bo'lim) | xodimlar | admin | P2 |
| `GET /api/admin/stats/dashboard` — javobga `overdue`, `needs_review`, `by_priority`, `ai_accuracy_7d`, `by_neighborhood: [{neighborhood_id,neighborhood_name,count}]`, `ai_auto_routed_7d`, `ai_routing_corrected_7d` (B6, AI qancha avtomatik yo'naltirdi va admin qanchasini to'g'irladi); **R0:** `zero_touch_7d` (0–1: 7 kunda yaratilganlardan AI biriktirgan va admin qayta yo'naltirMAgan ulush), `draft_reply_share_7d` (0–1: `ai_draft`i bor javoblar ichida `text` o'sha draft bilan ≥50% o'xshash — difflib ratio — bo'lganlari ulushi), `avg_first_action_hours_7d` (biriktirilishdan xodimning birinchi harakatigacha — status/reply/comment, actor=staff — o'rtacha soat; ma'lumot bo'lmasa null), `resolved_with_reply_7d` (0–1: 7 kunda resolved bo'lganlardan javob matni ham yuborilganlari ulushi) qo'shiladi | dashboard | admin | P2 |
| `GET /api/admin/stats/heatmap?date_from=&date_to=` → `[{lat, lng, weight}]` (koordinatalar ~11m aniqlikda guruhlanadi) | xarita | admin | P3 |
| `GET /api/admin/stats/kpi?group_by=department\|user\|neighborhood\|category&date_from=&date_to=` → `[{key,label,total,resolved,avg_first_response_hours,avg_resolution_hours,sla_percent}]` | KPI | admin | P3 |
| `GET /api/admin/stats/ai-health` → `{"ollama_ok": bool, "model": "gemma4:12b", "last_llm_success_at": ISO\|null, "llm_queue_depth": int, "llm_errors_1h": int, "stt_ok": bool}` — **R0/Q4:** `ollama_ok`: oxirgi 10 daqiqada muvaffaqiyatli LLM javobi bor YOKI sinov ping o'tdi; `llm_queue_depth`: ARQ navbatida kutayotgan generatsiya ishlari. Dashboard'da doimiy indikator — LLM jim o'lishi endi ko'rinadigan hodisa | AI salomatligi | admin | R1 |
| `GET /api/admin/audit-logs` | audit | admin | P3 |
| `GET /api/admin/qr-codes` / `POST /api/admin/qr-codes` (mahallaga QR yaratish, PNG/PDF url qaytadi) | QR | admin | P3 |

RBAC matritsasi (B6, 2 rol): `department_staff` — bitta `department_id`ga bog'langan, faqat o'z bo'limiga tushgan (AI avtomatik yoki admin qo'lda biriktirgan) murojaatlarni ko'radi, status o'zgartiradi (in_progress/need_info/resolved/rejected/closed), javob yozadi, ichki izoh qoldiradi; boshqa bo'limga qayta yo'naltira olmaydi. `admin` — hammasi: tizim boshqaruvi (bo'lim/kategoriya/keyword/xodim CRUD), barcha murojaatlarni ko'rish/statusini o'zgartirish, bo'limga biriktirish/qayta yo'naltirish, dashboard/heatmap/KPI/AI-trend/Excel eksport (workflow va AI yo'naltirish monitoringi). Buzilsa 403 `forbidden`.

### 5.1 Staff bildirishnomalari (`/api/notifications`, staff JWT) — R0

Eskalatsiya, SLA ogohlantirishi va biriktirish xabarlari shu yerga tushadi; R1'da Topbar qo'ng'irog'i (o'qilmaganlar soni + dropdown) shu APIga ulanadi.

- `GET /api/notifications` → oxirgi 50 ta (R0: limit qo'shiladi — hozir cheksiz): `[{"id", "message", "complaint_id", "is_read", "created_at"}]` (R0: javobga `created_at` qo'shiladi).
- `PATCH /api/notifications/{id}/read` → bitta bildirishnoma o'qildi (mavjud).
- `POST /api/notifications/read-all` → hammasi o'qildi (YANGI, R1).

## 6. Bot API (`/api/bot/*`, header `X-Bot-Token: <BOT_API_TOKEN>`)

| Endpoint | Nima |
|---|---|
| `POST /api/bot/citizens/link` `{"phone": "+998...", "telegram_chat_id": 123, "first_name": "...", "language": "uz"}` | Kontakt ulashilganda fuqaroni bog'laydi (telefon Telegramdan verified keladi) |
| `POST /api/bot/complaints` | 3.1 bilan bir xil maydonlar + `telegram_chat_id`; source=telegram |
| `GET /api/bot/complaints?telegram_chat_id=123` | Shu chat yuborgan murojaatlar (ticket, status_simple) |

Bildirishnomalar: backend worker statusi o'zgarganda `citizens.telegram_chat_id` bo'lsa Telegram Bot API orqali xabar yuboradi (bot protsessi shart emas).

## 7. i18n kontrakti

- Locale kodlari: `uz`, `oz`, `ru`, `en`. URL: `/` (uz, prefikssiz), `/oz/...`, `/ru/...`, `/en/...` (next-intl `localePrefix: 'as-needed'`). Tanlov cookie'da saqlanadi.
- Xabar fayllari: `frontend/src/messages/{uz,oz,ru,en}.json`. Kalitlar nuqtali namespace: `wizard.step1.title`. **Qoida:** kalit 4 faylga bir vaqtda qo'shiladi (`npm run i18n:check` skripti tekshiradi). `oz` fayli lotin→kirill transliteratsiya skripti bilan generatsiya qilinadi, keyin qo'lda ko'rib chiqiladi.
- Backend: so'rov tili `?lang=` yoki `Accept-Language` (fallback uz). Xato `detail` va SMS/Telegram shablonlari 4 tilda (`app/i18n/messages.py`).
- DB'dagi nomlar (kategoriya, bo'lim): JSONB `names = {"uz": "...", "oz": "...", "ru": "...", "en": "..."}`; API `?lang` bo'yicha `name` maydonini yechib beradi.

## 8. Eventlar (`complaint_events.event_type`)

`created`, `ai_processed`, `status_changed` (payload: from, to, note), `assigned` (payload: department_id, user_id), `comment_added` (ichki izoh), `reply_sent`, `info_requested`, `sms_sent`, `telegram_sent`, `escalated`, `sla_warning` (R0 — payload: deadline_at, percent; muddatning ~75% o'tganda, terminal bo'lmagan statusda, murojaat boshiga BIR marta; eskalatsiya croni yozadi), `reviewed` (R0 — payload: category_code, department_id; admin needs_review'ni yopganda). `actor_type`: `citizen` | `staff` | `system` | `ai`.

## 9. Muhit o'zgaruvchilari (kontraktga kiruvchi nomlar)

Backend: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `TICKET_PREFIX=UY`, `S3_*` (mavjud), `OLLAMA_URL=http://localhost:11434`, `OLLAMA_MODEL=gemma3:12b`, `AI_CONFIDENCE_THRESHOLD=0.75`, `LLM_TIMEOUT_S=300`, `LLM_MAX_ATTEMPTS=2` (R1 — [07](07-ai-layer.md) §4 o'lchovlari), `STT_PROVIDER=whisper|mohirai`, `STT_WHISPER_MODEL=medium`, `MOHIRAI_API_KEY`, `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `BOT_API_TOKEN`, `PUBLIC_BASE_URL`, `TURNSTILE_SECRET_KEY` (B4.7, bo'sh = captcha o'chirilgan).
Frontend: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (F3.1, bo'sh = `/go`dagi Telegram tugmasi "tez orada" holatida). Bot: `TELEGRAM_BOT_TOKEN`, `BACKEND_URL`, `BOT_API_TOKEN`.

## Changelog

- **v1.0** (2026-07-24) — dastlabki kontrakt. Eski `ComplaintStatus`/kategoriya enum'laridan migratsiya xaritasi: [04-database.md](04-database.md) §4.
- **v1.1** (2026-07-24, B6) — **breaking:** `StaffRole` 4 tadan 2 taga tushirildi (`operator`+`employee`+`manager` → `department_staff`, `admin` saqlanadi). `POST /api/admin/complaints/{id}/assign` endi admin-only (AI ishonchli bo'lganda avtomatik biriktiradi). `stats/dashboard`, `stats/heatmap`, `stats/kpi` endi admin-only (avval operator/manager ham kira olardi). `/api/auth/me` javobiga `department_name` qo'shildi. `stats/dashboard`ga `ai_auto_routed_7d`/`ai_routing_corrected_7d` qo'shildi. Migratsiya: `alembic/versions/m6_role_model_v2.py`.
- **v1.2** (2026-07-25, R0 — premortem asosida) — (1) AI pipeline «LLM har doim» rejimiga o'tadi ([07](07-ai-layer.md) §1 to'liq yangilandi: keyword = routing, LLM = generatsiya; `needs_review` endi FAQAT «routing insonga muhtoj» degani — keyword ishonchli bo'lsa LLM xatosi uni true qilmaydi). (2) **Breaking:** `resolved`ga o'tish javobsiz mumkin emas — 422 `reply_required`; `PATCH status` ixtiyoriy `reply_text` qabul qiladi (resolved bilan). (3) `accepted`ni FE avtomatik qo'yadi (birinchi ochilishda). (4) Track javobiga `department` qo'shildi. (5) Yangi: `POST /api/admin/complaints/{id}/review`, `GET /api/admin/stats/ai-health`, `POST /api/notifications/read-all` (+notifications rasmiylashtirildi, §5.1); dashboardga `zero_touch_7d`/`draft_reply_share_7d`/`avg_first_action_hours_7d`/`resolved_with_reply_7d`; eventlarga `sla_warning`/`reviewed`. (6) DB: M7 (`ai_analyses.confident`) — [04](04-database.md) §4. Migratsiya: `alembic/versions/m7_llm_always.py`.
