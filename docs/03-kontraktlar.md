# 03 — Kontraktlar (yagona haqiqat manbai)

> **QOIDA:** Bu fayldagi biror narsani o'zgartirmasdan turib kodda enum/endpoint/format o'zgartirish TAQIQLANADI. O'zgarish tartibi: shu faylga PR → ikkinchi sherik "OK" → kod. AI coder'lar bu faylni faqat O'QIYDI.
>
> Versiya: **v1.5** (2026-07-25). O'zgarishlar pastdagi "Changelog" ga yoziladi.

## 1. Umumiy formatlar

| Narsa | Format | Misol |
|---|---|---|
| Ticket raqami | 8 ta raqam: qat'iy `85` prefiksi + 6 ta tasodifiy raqam (`secrets.randbelow`, DB'da unique tekshiriladi, to'qnashsa qayta urinadi). v1.8: eski ketma-ket `UY-YYYY-NNNNNN` sxemasi olib tashlandi — u ham mijoz talabi, ham xavfsizlik muammosi edi (ketma-ket raqam `/track` endi faqat ticket bo'yicha ishlagani uchun taxmin qilib topish mumkin edi). `ticket_counters` jadvali (M13) o'chirildi. | `85123456` |
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

Ruxsat etilgan o'tishlar: `new→ai_processed→assigned→(accepted)→in_progress→resolved→closed→archived`; `rejected` — `new/ai_processed/assigned/accepted` dan; `need_info` — `assigned/accepted/in_progress` dan va qaytishi `in_progress` ga; **`resolved→in_progress` va `closed→in_progress` — faqat fuqaro e'tirozi bilan** (§3.6 feedback, `reopened` event; xodim bu o'tishni qo'lda qila olmaydi). Boshqa o'tish = 422 `invalid_transition`.

**`accepted` — «Qabul qilaman» (v1.4, avvalgi avto-accept BEKOR):** biriktirilgan murojaatni o'z bo'limi xodimi ko'rgach **«Qabul qilaman» tugmasini bosadi** → `POST /complaints/{id}/claim` (§5): `assigned_user_id` o'sha xodimga yoziladi, `accepted_at` belgilanadi, status `accepted` bo'ladi, `claimed` event yoziladi. Sahifani ochish hech qanday holatni o'zgartirMAYDI.

> **Nega o'zgardi (v1.2 → v1.4):** avto-accept «ko'rdim»ni «qabul qildim» bilan tenglashtirardi — SLA va `avg_first_action_hours_7d` sun'iy yaxshi ko'rinardi, mas'ul xodim esa aniqlanmasdi. Sahifa ochilishi FE'da bo'lgani uchun bot/mobil/boshqa klient bu bosqichni butunlay o'tkazib yuborardi. Endi bosqich serverda va egalik bilan birga qo'yiladi.

**`need_info` uchun sabab MAJBURIY:** `need_info` ga o'tishda `note` bo'sh bo'lsa → 422 `validation_error`. `note` matni `info_requested` eventiga yoziladi, fuqaroga SMS/Telegram orqali **savolning o'zi** yuboriladi va `/holat` sahifasida ko'rsatiladi. Fuqaro javob berishi (§3.5) `need_info → in_progress` o'tishini avtomatik bajaradi.

**`need_info` javob kanallari (v1.4, uchtasi teng):** web (§3.5), Telegram (§6), va manual (§5 `POST .../citizen-info`, xodim fuqaro bilan telefonda gaplashib yozib qo'yadi). Web va Telegram statusni avtomatik `in_progress` ga qaytaradi; manualda xodim statusni o'zi qaytaradi (fuqaro rostdan javob berganini faqat xodim biladi).

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
- **AiEngine:** `llm` (v1.3 — `keyword` olib tashlandi, [07](07-ai-layer.md) §1)
- **LLM javob sxemasi** (v1.5, [07](07-ai-layer.md) §1.1) — Ollama qaytaradigan JSON: `category_code` (asosiy, bitta), **`secondary_category_codes`** (0–3 ta: matnda boshqa bo'limga tegishli ALOHIDA muammo ham bo'lsa), `confidence` (0..1), `priority`, `sentiment`, `summary_uz`, `reply_draft_uz`, `tags`. `secondary_category_codes` har bir elementi uchun worker avtomatik sub-task yaratadi (§5) va `needs_review=true` qo'yadi. Server LLM'ga ishonmaydi: noma'lum kod, asosiy kategoriyaning takrori, asosiy bo'lim bilan bir xil bo'limga tushadigan kod va bo'limsiz kategoriya **tashlab yuboriladi**
- **NotificationChannel:** `in_app` | `sms` | `telegram` | `email`
- **Kategoriya kodlari** (DB jadval, bu seed ro'yxat) — **v1.8 dan boshlab kategoriya = mas'ul tashkilot (1:1)**, to'liq xarita: [14-tashkilotlar-matritsasi.md](14-tashkilotlar-matritsasi.md). 24 ta kod: `elektr`, `gaz`, `suv_kanalizatsiya`, `obodonlashtirish`, `chiqindi`, `uy_joy`, `yol`, `yol_harakati`, `jamoat_transporti`, `ekologiya`, `yer_kadastr`, `qurilish`, `sogliqni_saqlash`, `talim`, `ijtimoiy_yordam`, `jamoat_xavfsizlik`, `favqulodda`, `ijro`, `fhdyo_hujjatlar`, `soliq`, `mehnat`, `isteomolchi`, `hokimlik`, `mahalla`. Standart kod (`DEFAULT_CATEGORY_CODE`) — `hokimlik` (avval `boshqa` edi). Yangi kategoriya admin paneldan qo'shiladi (migratsiyasiz), lekin kod olib TASHLANMAYDI — matritsadan chiqqanlari `is_active=false` qilinadi (docs/14 §4).

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
  "ticket_number": "85123456",
  "status": "new",
  "status_simple": "qabul_qilindi",
  "created_at": "2026-07-24T09:30:00Z",
  "track_url": "/holat?ticket=85123456"
}
```

Muhim: javob AI natijasini KUTMAYDI (AI async). Rate limit: 5 ta / soat / telefon, 20 ta / kun / IP → 429 `rate_limited`.

### 3.2 `GET /api/public/complaints/track?ticket=85123456` — holat

v1.7: FAQAT ticket bo'yicha (telefon endi tekshirilmaydi — ongli mahsulot qarori). Mavjud bo'lmagan ticket 404 `not_found`. Javob `200`:

```json
{
  "ticket_number": "85123456",
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

### 3.5 `POST /api/public/complaints/info` — fuqaro qo'shimcha ma'lumot yuboradi (v1.4, multipart/form-data)

Maydonlar: `ticket` (str, majburiy), `phone` (E.164, majburiy), `text` (str, 1–2000), `images` (fayl[], ixtiyoriy — §2.4 limitlari).

Identifikatsiya §3.2 bilan **aynan bir xil**: ticket+telefon juftligi mos kelmasa 404 `not_found` (enumeration himoyasi, murojaat mavjudligi oshkor qilinmaydi). Rate limit: 10/soat/IP → 429 `rate_limited`.

Javob `200`:

```json
{ "status_simple": "ijroda", "need_info": false, "accepted": true }
```

Yon effektlar: `citizen_messages` yozuvi (`source=web`), `info_provided` event (`actor_type=citizen`), fayllar murojaatga biriktiriladi, mas'ul bo'lim xodimlariga bildirishnoma. **Agar murojaat `need_info` holatida bo'lsa — avtomatik `in_progress` ga qaytadi** (`accepted: true`). Boshqa holatda ma'lumot baribir saqlanadi va xodimga ko'rinadi, lekin status o'zgarmaydi (`accepted: false`). Terminal statuslarda (`rejected`/`archived`) → 422 `validation_error`.

### 3.6 `POST /api/public/complaints/feedback` — fuqaro bahosi va qayta ochish (v1.4)

Body: `{"ticket": "...", "phone": "+998...", "satisfied": true|false, "comment": "...?"}`. Identifikatsiya §3.5 bilan bir xil. Faqat `resolved`/`closed` holatida qabul qilinadi, aks holda 422 `validation_error`; bitta murojaatga qayta baho berilsa 409 `already_submitted`.

Javob `200`: `{"status_simple": "...", "reopened": true|false}`.

`satisfied=false` → murojaat `in_progress` ga qaytadi (`reopened` event, `reopened_count += 1`), bo'lim xodimlariga bildirishnoma. `satisfied=true` → `feedback_received` event, `resolved` bo'lsa `closed` ga o'tadi (7 kun kutilmaydi).

## 4. Auth API (xodimlar + ixtiyoriy fuqaro kabineti)

Mavjud `/api/auth/register|login|me` saqlanadi. `register` endi **fuqaro kabineti** uchun (telefon+parol; xodimni faqat admin yaratadi). `me` javobiga `kind: "citizen"|"staff"` va staff uchun `role`, `department_id`, `department_name` (B6, bor bo'lsa — UI'da bo'lim nomini ko'rsatish uchun) qo'shiladi. Kabinet P2'da — P1'da FE login sahifasini faqat xodimlar uchun ko'rsatadi.

**v1.7 — xodim o'z profilini boshqaradi:**

| Metod va yo'l | Nima | Kim |
|---|---|---|
| `PATCH /api/auth/me` body `{first_name?, last_name?, email?}` — faqat berilgan maydonlar yangilanadi. Email boshqa xodimda band bo'lsa 400 `already_exists` | profilni tahrirlash | staff |
| `POST /api/auth/me/avatar` (multipart, `file`) — `image` fayl limitiga bo'ysunadi (§2.4: 10MB, jpeg/png/webp/heic); mavjud avatarni almashtiradi. Javob: yangilangan `MeOut` | avatar yuklash | staff |
| `DELETE /api/auth/me/avatar` — `avatar_url` ni tozalaydi | avatar o'chirish | staff |
| `POST /api/auth/forgot-password` body `{phone}` — shu telefon bilan faol xodim bo'lsa SMS orqali 6 xonali kod yuboriladi (Redis, 10 daqiqa). **Enumeration himoyasi:** xodim topilmasa ham bir xil umumiy javob qaytadi. Rate limit: 3/soat/telefon, 10/soat/IP | parolni tiklash — kod so'rash | ochiq (auth shart emas) |
| `POST /api/auth/reset-password` body `{phone, code, new_password}` — kod noto'g'ri/muddati o'tgan bo'lsa 400 `validation_error`; 5 marta noto'g'ri urinishdan keyin kod bekor bo'ladi. To'g'ri bo'lsa parol yangilanadi va `login` bilan bir xil shakldagi `TokenResponse` qaytadi (avtomatik kirish) | parolni tiklash — yangilash | ochiq (auth shart emas) |

`MeOut` ga `avatar_url: str \| null` qo'shildi.

## 5. Admin API (`/api/admin/*`, JWT + StaffRole tekshiruvi)

Mavjud endpointlar saqlanadi, quyidagilar o'zgaradi/qo'shiladi (— bilan belgilanganlar breaking):

| Metod va yo'l | Nima | Kim | Faza |
|---|---|---|---|
| `GET /api/admin/complaints` — **pagination envelope'ga o'tadi** + filtrlar: `priority`, `department_id`, `assigned_user_id`, `source`, `overdue=true`, `needs_review=true`, `q` (ticket/telefon/matn); **v1.4 navbat filtrlari:** `unassigned=true` (bo'limi yoki egasi yo'q, terminal emas), `sla_risk=true` (muddatning ≥75% o'tgan, hali overdue emas), `need_info_over_hours=24` (shu soatdan ko'p `need_info` da turgan), `mine=true` (`assigned_user_id` = so'rovchi xodim), `stuck_ai=true` (`status=new` va 1 soatdan ko'p — LLM ishlamagan); har bir qatorda `department` (B6) va `assigned_user` | ro'yxat | department_staff+ | P1 |
| `GET /api/admin/complaints/{id}` — javobga `ticket_number`, `citizen`, `priority`, `deadline_at`, `ai` (oxirgi tahlil), `files`, `events`, `replies`, `department`, `assigned_user` qo'shiladi; **v1.4:** `accepted_at`, `info_requested_at`, `info_provided_at`, `citizen_messages: [{id,text,source,recorded_by,created_at}]`, `subtasks`, `satisfaction`, `reopened_count` | tafsilot | department_staff+ | P1 |
| `POST /api/admin/complaints/{id}/claim` (v1.4, body yo'q) — «Qabul qilaman»: `assigned_user_id` = so'rovchi xodim, `accepted_at` = hozir, status `assigned→accepted`, `claimed` event. Boshqa bo'lim xodimi → 403 `forbidden`; egasi allaqachon boshqa xodim → 409 `already_claimed` (admin `assign` bilan majburan qayta biriktira oladi) | qabul qilish | department_staff+ | S1 |
| `POST /api/admin/complaints/{id}/citizen-info` (v1.4) body: `{"text": "..."}` — manual kanal: xodim fuqaro bilan telefonda/jonli gaplashib olgan ma'lumotni yozib qo'yadi. `citizen_messages` (`source=manual`, `recorded_by`) + `info_provided` event (`actor_type=staff`). **Statusni o'zgartirMAYDI** — xodim `in_progress` ga o'zi qaytaradi | manual javob | department_staff+ | S1 |
| `POST /api/admin/complaints/{id}/subtasks` (v1.4) body: `{"department_id": "...", "note": "...", "deadline_at": "...?"}` → idoralararo topshiriq. `PATCH /api/admin/subtasks/{id}` body: `{"status": "open\|done\|cancelled", "note": "...?"}` — o'z bo'limi topshirig'ini xodim yopadi, admin hammasini. Ota murojaat ochiq sub-task bilan `resolved` ga o'ta olmaydi → 422 `subtasks_open`. Fuqaroga sub-tasklar KO'RINMAYDI — javob bitta va umumiy. **v1.5:** sub-taskni **AI ham yaratadi** (`secondary_category_codes`, §2.3) — bunday yozuvda `created_by = null` va javobda `created_by_ai = true` | sub-tasklar | yaratish: admin yoki AI; yopish: department_staff+ | S2 |
| `PATCH /api/admin/complaints/{id}/status` body: `{"status": "...", "note": "...?", "reply_text": "...?"}` — o'tish qoidalari tekshiriladi; `rejected` uchun `note` majburiy. **R0/Q2:** `reply_text` faqat `status=resolved` bilan qabul qilinadi — berilsa server AVVAL rasmiy javob yaratadi (`POST .../replies` bilan bir xil yon effektlar), KEYIN statusni o'tkazadi (bitta tranzaksiya). `resolved` uchun javob MAJBURIY: yo shu so'rovda `reply_text`, yo murojaatda oldin yuborilgan javob — aks holda 422 `reply_required` (telefonda hal bo'lsa ham 1–2 jumlalik yakun yoziladi) | status | roliga qarab | P1 |
| `POST /api/admin/complaints/{id}/assign` body: `{"department_id": "...", "assigned_user_id": "...?"}` — B6: AI ishonchli bo'lganda (`needs_review=false`) `classify_complaint` worker shu mantiqni o'zi (`actor_type=ai`) chaqiradi; bu endpoint endi faqat admin uchun — ishonchsiz/yo'naltirilmagan murojaatlarni qo'lda yo'naltirish yoki AI xato yo'naltirsa qayta yo'naltirish (tuzatish) uchun | biriktirish/qayta yo'naltirish | admin | P1 |
| `POST /api/admin/complaints/{id}/review` body: `{"category_code": "...?", "department_id": "...?", "reason": "..."}` — AI past ishonch bilan yo'naltirgan murojaatni bir bosishda **tasdiqlash** (faqat `reason=ok`) yoki to'g'irlash: kategoriya/bo'lim o'rnatiladi, kerak bo'lsa qayta biriktiriladi, `needs_review=false`, `reviewed` event. **v1.3:** bu hech narsani bloklamaydi — murojaat allaqachon yo'naltirilgan va ijroda; bu faqat nazorat vositasi. **v1.4: `reason` MAJBURIY** — `ok` \| `wrong_category` \| `wrong_department` \| `wrong_priority` \| `other` (`other` bilan `reason_text` ham majburiy); sababsiz tuzatish AI sifatini o'lchashni imkonsiz qiladi. Bo'sh `reason` → 422 `validation_error` | AI nazorati | admin | R2 |
| `POST /api/admin/complaints/{id}/replies` body: `{"text": "..."}` → SMS/telegram/status sahifaga chiqadi; javob eventga yoziladi. **R0:** server javob yaratilayotgan paytdagi AI draftini (murojaatning oxirgi `ai_analyses.suggested_reply`) `replies.ai_draft`ga snapshot qiladi — draft-qabul KPI shu ustundan hisoblanadi, client hech narsa yubormaydi | rasmiy javob | department_staff+ | P2 |
| `GET/POST/PATCH /api/admin/departments` | bo'limlar CRUD | admin (GET — department_staff+) | P1 |
| `GET/POST/PATCH /api/admin/categories` (+ `sla_hours`, `department_id`, `names`, `is_active`) | kategoriya CRUD | admin (GET — department_staff+) | P2 |
| `GET/POST/PATCH /api/admin/users` (staff CRUD, rol, bo'lim) | xodimlar | admin | P2 |
| `GET /api/admin/stats/dashboard` — javobga `overdue`, `needs_review`, `by_priority`, **`ai_accuracy_7d` + `ai_reviewed_7d` (v1.8)**, `by_neighborhood: [{neighborhood_id,neighborhood_name,count}]`, `ai_auto_routed_7d`, `ai_routing_corrected_7d` (B6, AI qancha avtomatik yo'naltirdi va admin qanchasini to'g'irladi); **R0:** `zero_touch_7d` (0–1: 7 kunda yaratilganlardan AI biriktirgan va admin qayta yo'naltirMAgan ulush), `draft_reply_share_7d` (0–1: `ai_draft`i bor javoblar ichida `text` o'sha draft bilan ≥50% o'xshash — difflib ratio — bo'lganlari ulushi), `avg_first_action_hours_7d` (biriktirilishdan xodimning birinchi harakatigacha — status/reply/comment, actor=staff — o'rtacha soat; ma'lumot bo'lmasa null), `resolved_with_reply_7d` (0–1: 7 kunda resolved bo'lganlardan javob matni ham yuborilganlari ulushi) qo'shiladi | dashboard | admin | P2 |
| `GET /api/admin/stats/queues` (v1.4) — **operatsion bosh ekran uchun**: `{"unassigned": int, "ai_exceptions": int, "sla_risk": int, "overdue": int, "awaiting_info": int, "stuck_ai": int, "by_department": [{"department_id","department_name","new","in_progress","sla_risk","overdue","unowned","wip_limit","over_limit"}]}`. Har karta `GET /complaints` ning mos filtri bilan bir xil shartda hisoblanadi — raqam bosilganda aynan o'sha ro'yxat ochiladi. `awaiting_info` — `need_info` da 24 soatdan ko'p turganlar; `stuck_ai` — `status=new` va 1 soatdan ko'p (LLM ishlamagan, [07](07-ai-layer.md) §2) | operatsion navbat | admin | S1 |
| `GET /api/admin/stats/heatmap?date_from=&date_to=` → `[{lat, lng, weight}]` (koordinatalar ~11m aniqlikda guruhlanadi) | xarita | admin | P3 |
| `GET /api/admin/stats/kpi?group_by=department\|user\|neighborhood\|category&date_from=&date_to=` → `[{key,label,total,resolved,avg_first_response_hours,avg_resolution_hours,sla_percent}]` | KPI | admin | P3 |
| `GET /api/admin/stats/ai-health` → `{"ollama_ok": bool, "model": "...", "last_llm_success_at": ISO\|null, "llm_queue_depth": int, "llm_errors_1h": int, "pending_analysis": int, "stt_ok": bool}` — `ollama_ok`: oxirgi 10 daqiqada muvaffaqiyatli LLM javobi bor YOKI sinov ping o'tdi; `pending_analysis` (v1.3): hali tahlil qilinmagan (`status=new`) murojaatlar soni — LLM yagona dvigatel bo'lgani uchun bu eng muhim signal. Dashboard'da doimiy indikator | AI salomatligi | admin | R1 |
| `GET /api/admin/audit-logs` | audit | admin | P3 |
| `GET /api/admin/qr-codes` / `POST /api/admin/qr-codes` (mahallaga QR yaratish, PNG/PDF url qaytadi) | QR | admin | P3 |

RBAC matritsasi (B6, 2 rol): `department_staff` — bitta `department_id`ga bog'langan, faqat o'z bo'limiga tushgan (AI avtomatik yoki admin qo'lda biriktirgan) murojaatlarni ko'radi, **o'ziga qabul qiladi (`claim`)**, status o'zgartiradi (accepted/in_progress/need_info/resolved/rejected/closed), javob yozadi, ichki izoh qoldiradi, fuqaro javobini manual yozib qo'yadi, o'z bo'limi sub-taskini yopadi; boshqa bo'limga qayta yo'naltira olmaydi va sub-task yarata olmaydi. `admin` — hammasi: tizim boshqaruvi (bo'lim/kategoriya/xodim CRUD), barcha murojaatlarni ko'rish/statusini o'zgartirish, bo'limga biriktirish/qayta yo'naltirish, majburan qayta biriktirish, sub-task yaratish, dashboard/queues/heatmap/KPI/AI-trend/Excel eksport/audit-logs. Buzilsa 403 `forbidden`.

**Egalik qoidasi (v1.4):** `assigned_user_id` — murojaatning yagona mas'ul xodimi. `assign` chaqirilganda **bo'lim o'zgarmasa mavjud egasi saqlanadi**, bo'lim o'zgarsa egasi tozalanadi (yangi bo'limda u xodim ishlamaydi). AI avto-routing va `review` egasini hech qachon o'chirmaydi — avval bu `None` yozib, adminning qo'lda tayinlagan xodimini yo'qotardi. `assign` bilan `assigned_user_id` berilsa: xodim mavjud, `is_active` va **o'sha bo'limga tegishli** bo'lishi tekshiriladi, aks holda 422 `validation_error`.

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
| `GET /api/bot/complaints?telegram_chat_id=123` | Shu chat yuborgan murojaatlar (ticket, status_simple, **v1.4:** `need_info`, `info_request_text`) |
| `POST /api/bot/complaints/info` (v1.4) `{"telegram_chat_id": 123, "ticket": "...", "text": "..."}` | §3.5 ning Telegram kanali. Identifikatsiya: ticket murojaatining fuqarosi shu `telegram_chat_id` ga bog'langan bo'lishi shart, aks holda 404 `not_found`. Yon effektlar §3.5 bilan bir xil (`source=telegram`, `need_info` da avtomatik `in_progress`) |
| `POST /api/bot/complaints/feedback` (v1.4) `{"telegram_chat_id": 123, "ticket": "...", "satisfied": bool, "comment": "...?"}` | §3.6 ning Telegram kanali, inline tugmalar orqali |

Bildirishnomalar: backend worker statusi o'zgarganda `citizens.telegram_chat_id` bo'lsa Telegram Bot API orqali xabar yuboradi (bot protsessi shart emas). **v1.4:** `need_info` xabariga savol matni qo'shiladi, `resolved` xabariga «Hal bo'ldimi? Ha/Yo'q» inline tugmalari ilashadi.

## 7. i18n kontrakti

- Locale kodlari: `uz`, `oz`, `ru`, `en`. URL: `/` (uz, prefikssiz), `/oz/...`, `/ru/...`, `/en/...` (next-intl `localePrefix: 'as-needed'`). Tanlov cookie'da saqlanadi.
- Xabar fayllari: `frontend/src/messages/{uz,oz,ru,en}.json`. Kalitlar nuqtali namespace: `wizard.step1.title`. **Qoida:** kalit 4 faylga bir vaqtda qo'shiladi (`npm run i18n:check` skripti tekshiradi). `oz` fayli lotin→kirill transliteratsiya skripti bilan generatsiya qilinadi, keyin qo'lda ko'rib chiqiladi.
- Backend: so'rov tili `?lang=` yoki `Accept-Language` (fallback uz). Xato `detail` va SMS/Telegram shablonlari 4 tilda (`app/i18n/messages.py`).
- DB'dagi nomlar (kategoriya, bo'lim): JSONB `names = {"uz": "...", "oz": "...", "ru": "...", "en": "..."}`; API `?lang` bo'yicha `name` maydonini yechib beradi.

## 8. Eventlar (`complaint_events.event_type`)

`created`, `ai_processed`, `status_changed` (payload: from, to, note), `assigned` (payload: department_id, user_id), `comment_added` (ichki izoh), `reply_sent`, `info_requested` (payload: text — xodim so'ragan ma'lumot matni; `need_info` ga o'tishda yoziladi), `sms_sent`, `telegram_sent`, `escalated`, `sla_warning` (R0 — payload: deadline_at, percent; muddatning ~75% o'tganda, terminal bo'lmagan statusda, murojaat boshiga BIR marta; eskalatsiya croni yozadi), `reviewed` (R0 — payload: category_code, department_id, reason, reason_text; admin needs_review'ni yopganda).

**v1.4 qo'shilganlar:** `info_provided` (payload: source `web|telegram|manual`, text; `actor_type` — web/telegram'da `citizen`, manualda `staff`), `claimed` (payload: user_id), `reopened` (payload: comment; fuqaro javobdan norozi bo'lganda), `feedback_received` (payload: satisfied, comment), `subtasks_truncated` (v1.8 — payload: `created`, `limit`, `not_assigned[]`; ro'yxat javobida ham `ai.unassigned_services[]` bo'lib chiqadi; AI topgan, lekin chegara tufayli avtomatik ajratilMAGAN xizmatlar nomi. `needs_review=true` bilan birga qo'yiladi — xodim qolganini qo'lda sub-task qiladi), `subtask_created` (payload: subtask_id, department_id; **v1.5:** `actor_type` `staff` yoki **`ai`** — AI ko'p bo'limli murojaatni o'zi bo'lganda, payloadga `category_code` ham qo'shiladi), `subtask_closed` (payload: subtask_id, status).

`actor_type`: `citizen` | `staff` | `system` | `ai`.

## 9. Muhit o'zgaruvchilari (kontraktga kiruvchi nomlar)

Backend: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `TICKET_PREFIX=UY`, `S3_*` (mavjud), `LLM_PROVIDER=ollama|deepseek` (v1.5.1, vaqtincha almashtirish uchun — standart `ollama`), `OLLAMA_URL=http://localhost:11434`, `OLLAMA_MODEL=gemma3:12b`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL=deepseek-chat`, `DEEPSEEK_BASE_URL=https://api.deepseek.com`, `LLM_TIMEOUT_S=300`, `LLM_MAX_ATTEMPTS=2` ([07](07-ai-layer.md) §3 o'lchovlari), `AI_LOW_CONFIDENCE=0.6` (v1.3 — shundan past ishonchda `needs_review` belgisi qo'yiladi, lekin yo'naltirish bajariladi), `STT_PROVIDER=gigaam|mohirai` (v1.6.1 — `whisper`/`faster-whisper` butunlay olib tashlandi), `GIGAAM_MODEL_DIR`, `MOHIRAI_API_KEY`, `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `BOT_API_TOKEN`, `PUBLIC_BASE_URL`, `TURNSTILE_SECRET_KEY` (B4.7, bo'sh = captcha o'chirilgan), **v1.4:** `ADMIN_SEED_PHONE` / `ADMIN_SEED_PASSWORD` (seed default adminni FAQAT ikkalasi berilganda yaratadi; yaratilgan hisobda birinchi kirishda parol almashtirish majburiy), `TEST_DATABASE_URL` (faqat testlar uchun — `DATABASE_URL` dan boshqa baza bo'lishi SHART).
Frontend: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (F3.1, bo'sh = `/go`dagi Telegram tugmasi "tez orada" holatida). Bot: `TELEGRAM_BOT_TOKEN`, `BACKEND_URL`, `BOT_API_TOKEN`.

## Changelog

- **v1.7** (2026-07-26, xodim profili) — Xodim (admin/`department_staff`) endi o'z profilini o'zi boshqaradi: (1) `PATCH /api/auth/me` — ism/familiya/email tahrirlash. (2) `POST`/`DELETE /api/auth/me/avatar` — profil rasmi (mavjud `image` fayl limiti va S3/MinIO infratuzilmasi qayta ishlatiladi). (3) Parolni unutgan xodim uchun SMS-kod bilan tiklash: `POST /api/auth/forgot-password` (kod yuborish, enumeration himoyasi bilan) + `POST /api/auth/reset-password` (kodni tekshirish, yangi parol, avtomatik kirish). (4) `MeOut.avatar_url` qo'shildi. DB: `users.avatar_url` — migratsiya `m14_staff_avatar.py`, [04](04-database.md) §2. Fuqaro kabineti (`citizens`) profiliga tegilmagan — bu qamrovdan tashqarida.
- **v1.6.1** (2026-07-26, STT) — `faster-whisper` provayderi va uning bog'liqliklari (`faster-whisper`, `ctranslate2`, `tokenizers`, `requests`) loyihadan butunlay olib tashlandi (`app/services/ai/stt.py`, `requirements.txt`). Standart STT provayder endi **`gigaam`** (lokal, int8 ONNX — v1.6 da qo'shilgan). `STT_PROVIDER` noma'lum qiymat bo'lsa `SttError` ko'taradi (jim whisper'ga tushmaydi). Env: `STT_WHISPER_MODEL` olib tashlandi, `GIGAAM_MODEL_DIR` (§9).
- **v1.5** (2026-07-25, S3 — ko'p bo'limli murojaat) — Fuqaro bitta matnda ikki bo'limga tegishli muammo yozganda («chiroq va suv to'xtab qoldi») ikkinchisi jimgina yo'qolardi: LLM'dan bitta kategoriya so'ralardi, u soyabon kategoriya (`kommunal`) tanlab **`confidence=1.0`** qaytarardi, ya'ni `needs_review` ham qo'yilmasdi va tegishli bo'limlar murojaatni umuman ko'rmasdi ([07](07-ai-layer.md) §1.1 dagi real o'lchov). O'zgarishlar: (1) LLM javob sxemasiga **`secondary_category_codes`** (0–3 ta) qo'shildi (§2.3). (2) Worker har biri uchun **avtomatik sub-task** yaratadi va `needs_review=true` qo'yadi; noma'lum/takroriy/bo'limsiz kodlar va asosiy bo'lim bilan bir xil bo'limga tushadiganlar tashlanadi. (3) `subtask_created` eventi `actor_type=ai` bilan ham yoziladi (§8). (4) `complaint_subtasks.created_by` NULL bo'la oladi (AI yaratganda xodim yo'q) — migratsiya M10, [04](04-database.md) §4; `SubtaskOut` ga `created_by_ai`. Ochiq sub-task bilan `resolved` bloklanishi (v1.4) o'zgarishsiz qoladi — endi u AI topgan ikkinchi muammoni ham qamraydi.
- **v1.4** (2026-07-25, S1+S2 — QA tekshiruvi asosida) — (1) **Breaking: avto-`accepted` bekor qilindi**, o'rniga `POST /complaints/{id}/claim` («Qabul qilaman») — `assigned_user_id` va `accepted_at` shu yerda qo'yiladi (§2.1). (2) **Breaking: `need_info` ga o'tishda `note` majburiy**, matn `info_requested` eventiga va fuqaroga SMS'ga tushadi. (3) `need_info` sikli yopildi — uchta teng kanal: `POST /api/public/complaints/info` (§3.5), `POST /api/bot/complaints/info` (§6), `POST /api/admin/complaints/{id}/citizen-info` (manual); web va Telegram statusni avtomatik `in_progress` ga qaytaradi. (4) Fuqaro bahosi va qayta ochish: `POST /api/public/complaints/feedback` (§3.6) + yangi `resolved→in_progress`, `closed→in_progress` o'tishlari. (5) Egalik qoidasi: `assign` bo'lim o'zgarmasa egasini saqlaydi, `assigned_user_id` validatsiyasi qo'shildi (§5). (6) Yangi `GET /api/admin/stats/queues` (operatsion bosh ekran) + `GET /complaints` navbat filtrlari (`unassigned`, `sla_risk`, `need_info_over_hours`, `mine`, `stuck_ai`). (7) Idoralararo sub-tasklar: `POST /complaints/{id}/subtasks`, `PATCH /subtasks/{id}`, ochiq sub-task bilan `resolved` → 422 `subtasks_open`. (8) `POST .../review` uchun `reason` majburiy. (9) Yangi eventlar: `info_provided`, `claimed`, `reopened`, `feedback_received`, `subtask_created`, `subtask_closed` (§8). (10) Env: `ADMIN_SEED_PHONE`/`ADMIN_SEED_PASSWORD`/`TEST_DATABASE_URL` (§9). (11) DB: M9 — [04](04-database.md) §4.
- **v1.0** (2026-07-24) — dastlabki kontrakt. Eski `ComplaintStatus`/kategoriya enum'laridan migratsiya xaritasi: [04-database.md](04-database.md) §4.
- **v1.1** (2026-07-24, B6) — **breaking:** `StaffRole` 4 tadan 2 taga tushirildi (`operator`+`employee`+`manager` → `department_staff`, `admin` saqlanadi). `POST /api/admin/complaints/{id}/assign` endi admin-only (AI ishonchli bo'lganda avtomatik biriktiradi). `stats/dashboard`, `stats/heatmap`, `stats/kpi` endi admin-only (avval operator/manager ham kira olardi). `/api/auth/me` javobiga `department_name` qo'shildi. `stats/dashboard`ga `ai_auto_routed_7d`/`ai_routing_corrected_7d` qo'shildi. Migratsiya: `alembic/versions/m6_role_model_v2.py`.
- **v1.3** (2026-07-25) — **breaking: keyword dvigateli butunlay olib tashlandi.** LLM yagona qaror qabul qiluvchi: har murojaatni o'zi kategoriyalaydi, ustuvorlik beradi, bo'limga yo'naltiradi va javob drafti yozadi — **inson aralashuvi kutilmaydi** ([07](07-ai-layer.md) §1). O'zgarishlar: (1) `AiEngine` enum `llm`ga qisqardi, `KeywordSource` olib tashlandi. (2) `GET/POST/DELETE /api/admin/categories/{id}/keywords` va `GET /api/admin/keyword-suggestions` + approve/reject endpointlari **o'chirildi**. (3) `POST .../review` endi bloklovchi navbat emas, nazorat vositasi — `needs_review` faqat belgi. (4) `ai-health`ga `pending_analysis` qo'shildi. (5) `AI_CONFIDENCE_THRESHOLD` → `AI_LOW_CONFIDENCE` (ma'nosi teskari: past ishonch belgisi chegarasi). (6) DB: `category_keywords`, `keyword_suggestions` jadvallari va `ai_analyses.confident` ustuni tashlandi — migratsiya `m8_llm_only.py` ([04](04-database.md) §4). (7) LLM xato bersa admin navbati emas, avtomatik qayta urinish + sweeper cron ([07](07-ai-layer.md) §2).
- **v1.2** (2026-07-25, R0 — premortem asosida) — (1) AI pipeline «LLM har doim» rejimiga o'tadi ([07](07-ai-layer.md) §1 to'liq yangilandi: keyword = routing, LLM = generatsiya; `needs_review` endi FAQAT «routing insonga muhtoj» degani — keyword ishonchli bo'lsa LLM xatosi uni true qilmaydi). (2) **Breaking:** `resolved`ga o'tish javobsiz mumkin emas — 422 `reply_required`; `PATCH status` ixtiyoriy `reply_text` qabul qiladi (resolved bilan). (3) `accepted`ni FE avtomatik qo'yadi (birinchi ochilishda). (4) Track javobiga `department` qo'shildi. (5) Yangi: `POST /api/admin/complaints/{id}/review`, `GET /api/admin/stats/ai-health`, `POST /api/notifications/read-all` (+notifications rasmiylashtirildi, §5.1); dashboardga `zero_touch_7d`/`draft_reply_share_7d`/`avg_first_action_hours_7d`/`resolved_with_reply_7d`; eventlarga `sla_warning`/`reviewed`. (6) DB: M7 (`ai_analyses.confident`) — [04](04-database.md) §4. Migratsiya: `alembic/versions/m7_llm_always.py`.
