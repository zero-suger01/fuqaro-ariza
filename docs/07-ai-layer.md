# 07 — AI qatlami: LLM yagona dvigatel, ovoz→matn

Maqsad: **murojaat tushgach hech kim aralashmasin.** Lokal LLM (Ollama) har bir murojaatni o'zi o'qiydi, kategoriyalaydi, ustuvorlik beradi, mas'ul bo'limga yo'naltiradi va javob loyihasini yozadi. Tunda ham, dam olish kunida ham — navbat o'zi ishlaydi, ertalab xodim tayyor ish ro'yxatini ko'radi.

> **v1.3 (2026-07-25) — keyword dvigateli BUTUNLAY olib tashlandi.** Sabab: ikki dvigatelli sxemada kategoriyani kim aniqlagani (keyword yoki LLM) doim tushunarsiz edi, keyword lug'atini boqish (o'rganish sikli, admin tasdig'i) doimiy qo'l mehnati talab qilardi, va eng yomoni — keyword ishonchli deb xato yo'naltirsa LLM buni tuzata olmasdi. Endi qaror qabul qiluvchi bitta: LLM. Lug'at, o'rganish sikli, normalizatsiya, `category_keywords`/`keyword_suggestions` jadvallari va ular bilan bog'liq admin sahifalari yo'q.

## 1. Pipeline v3: LLM yagona dvigatel

Bitta worker ishi — `analyze_complaint` (submit'dan keyin darhol navbatga tushadi; fuqaro kutmaydi):

```
murojaat (kategoriya = fuqaro tanlagani yoki 'boshqa')
   │
   ▼
Ollama (Gemma, JSON, §3) ─── muvaffaqiyat ──► category_code, priority, sentiment,
   │                                          summary_uz, reply_draft_uz, tags
   │                                             │
   │                                             ▼
   │                    ai_analyses(engine=llm) → complaint yangilanadi
   │                    (kategoriya, priority, deadline) → status=ai_processed
   │                                             │
   │                                             ▼
   │                    kategoriya bo'limga bog'langan bo'lsa
   │                    workflow.assign(actor_type="ai") → status=assigned
   │                    → fuqaroga SMS/Telegram «yo'naltirildi»
   │
   └── xato/timeout ──► QAYTA URINISH (§2): 2 daq → 10 daq → 30 daq → 2 soat...
                        Admin navbati YO'Q. Ollama tiklanganda o'zi davom etadi.
```

**Qat'iy qoidalar:**

- **Inson kutilmaydi.** AI ishonchi past bo'lsa ham murojaat baribir yo'naltiriladi (eng yaqin kategoriya bo'yicha), chunki yo'naltirilmagan murojaat = to'xtab qolgan murojaat. Past ishonch faqat **belgi** qo'yadi (`needs_review=true`) — bu bloklamaydi, admin xohlasa keyin ko'radi ("AI nazorati" sahifasi).
- **Noma'lum kategoriya kodi** (LLM ro'yxatda yo'q kod qaytarsa) → `boshqa` + `needs_review=true`, lekin `boshqa` ham o'z bo'limiga (Hokimlik murojaat bo'limi) yo'naltiriladi.
- **Hech qachon tashlab yuborilmaydi.** LLM javob bermasa murojaat `new` holatida qoladi va qayta urinish navbatiga tushadi (§2). `needs_review` bunday holatda qo'yilmaydi — bu odam hal qiladigan muammo emas, server muammosi (`ai-health`da ko'rinadi).
- **Priority to'liq LLM'niki** (low|medium|high|critical). Deadline shu priority va kategoriyaning `sla_hours`i asosida hisoblanadi.
- Fuqaro murojaat yuborishda kategoriyani O'ZI tanlagan bo'lsa ham, LLM uni qayta baholaydi va noto'g'ri bo'lsa almashtiradi (fuqaro ko'pincha adashadi — "kommunal" deb elektr muammosini yuboradi).

### 1.1 Ko'p bo'limli murojaat (v1.5)

Fuqaro bitta matnda **bir necha bo'limga tegishli** muammoni yozishi juda ko'p uchraydi: *«uyimizda 2 kundan beri chiroq va suv to'xtab qoldi»* — bu Elektr tarmoqlari ham, Suvsoz ham. LLM javobi bitta `category_code` bo'lgani uchun ikkinchi muammo yo'naltirishdan tushib qolardi.

**Real o'lchov (2026-07-25, `gemma4:latest`, aynan shu matn):** AI ikkala muammoni ham to'g'ri tushundi (`summary` da «elektr va suv», `tags` da `suv` va `elektr`, javob draftida hatto «bo'limlarimiz» ko'plikda) — lekin bitta kategoriya so'ralgani uchun **`kommunal`** degan soyabon kategoriyani tanladi va **`confidence = 1.0`** qaytardi. Ya'ni `needs_review` ham qo'yilmadi: hech qanday signal bo'lmadi, Elektr va Suvsoz murojaatni umuman ko'rmadi. Ma'lumot `ai_analyses` da saqlangan edi-yu, hech kim unga qarab harakat qilmasdi.

Shuning uchun LLM javobiga **`secondary_category_codes`** qo'shildi ([03](03-kontraktlar.md) §2.3):

```
category_code            → asosiy muammo, murojaat shu bo'limga yo'naltiriladi
secondary_category_codes → matnda BOSHQA bo'limga tegishli ALOHIDA muammo
                           ham bo'lsa (max 3). Yo'q bo'lsa — bo'sh ro'yxat.
```

Worker har `secondary_category_codes` elementi uchun **avtomatik sub-task** yaratadi (bo'lim = kategoriyaning `department_id` si), `subtask_created` eventi `actor_type="ai"` bilan yoziladi va bo'lim xodimlariga bildirishnoma ketadi.

Filtrlar (worker'da, LLM'ga ishonilmaydi): noma'lum kod tashlanadi; asosiy kategoriyaning o'zi tashlanadi; **asosiy bo'lim bilan bir xil bo'limga tushadigan** kod tashlanadi (bir jamoaga ikki marta topshiriq bermaymiz); bo'limga bog'lanmagan kategoriya tashlanadi.

Sub-task yaratilganda `needs_review=true` qo'yiladi — bo'linish to'g'ri bo'lganini odam bir marta tasdiqlashi kerak. Bu **bloklamaydi**: asosiy bo'lim ishni darhol boshlaydi.

> **Nega bu «inson kutilmaydi» qoidasini buzmaydi:** murojaat baribir darhol yo'naltiriladi va ijroga ketadi. Sub-task ham darhol tegishli bo'limga tushadi. `needs_review` faqat nazorat belgisi — admin hech narsa qilmasa ham ikkala bo'lim ishlayveradi. Yagona qattiq qoida: **ochiq sub-task bilan murojaat `resolved` ga o'ta olmaydi** ([03](03-kontraktlar.md) §5) — aks holda fuqaroga «hal qilindi» deb aytilar, suv esa hamon yo'q bo'lardi.

## 2. Ishonchlilik: qayta urinish va navbatni tozalash

LLM yagona dvigatel bo'lgani uchun Ollama'ning ishlashi kritik. Ikki qatlamli himoya (ikkalasi ham admin aralashuvisiz):

1. **Job darajasida qayta urinish.** `analyze_complaint` xato bersa, ish `AI_RETRY_DELAYS` (standart `120, 600, 1800, 7200, 21600` soniya) bo'yicha qayta navbatga qo'yiladi. Ya'ni Ollama 6 soatgacha o'chiq bo'lsa ham murojaat oxir-oqibat tahlil qilinadi.
2. **Sweeper cron (har 15 daqiqada).** Qayta urinishlar tugagan yoki worker qayta ishga tushib navbat yo'qolgan holatlar uchun: `status='new'` va yaratilganiga 10 daqiqadan oshgan murojaatlar qayta navbatga qo'yiladi. Bu — "uxlab qolgan murojaat qolmaydi" kafolati.
3. **Manual fallback navbati (v1.4).** Yuqoridagi ikkalasi ham **avtomatlashtirish** himoyasi — lekin ular hech qachon taslim bo'lmasa, Ollama uzoq muddat ishlamaganda murojaat soatlab `new` da jim yotadi va buni hech kim ko'rmaydi. Shuning uchun: `status='new'` va 1 soatdan oshgan murojaatlar **`stuck_ai` navbatiga** tushadi va admin bosh ekranida karta sifatida ko'rinadi ([03](03-kontraktlar.md) §5 `stats/queues`). Admin `/admin/tasdiqlash` da kategoriya va bo'limni qo'lda qo'yib, murojaatni AI'siz yo'lga soladi (mavjud `POST .../review`).

> **Nega bu «admin navbati YO'Q» qoidasiga zid emas:** qoida — *odam AI natijasini tasdiqlaguncha murojaat kutib turmasin* degani, va u kuchda qoladi (past ishonch hech narsani bloklamaydi). `stuck_ai` esa AI **umuman javob bermagan** holat: bu tasdiqlash navbati emas, uzilish signali. Sukut bo'yicha bo'sh bo'lishi kerak — ichida yozuv paydo bo'lishi server muammosi haqida ogohlantiradi.

Server holati `GET /api/admin/stats/ai-health` da: `ollama_ok`, oxirgi muvaffaqiyat vaqti, navbat chuqurligi, soatlik xatolar soni, **`pending_analysis`** (tahlil kutayotgan murojaatlar soni). Dashboard'da doimiy indikator.

## 3. LLM — Ollama + Gemma (yagona dvigatel)

> **Vaqtincha (lokal dev, v1.5.1):** `LLM_PROVIDER=deepseek` bilan Ollama o'rniga
> DeepSeek API (`app/services/ai/deepseek` chaqiruvi `app/services/ai/llm.py`
> ichida) ishlatilishi mumkin — bir xil `LlmAnalysis` sxemasi, worker/pipeline
> o'zgarmaydi. `DEEPSEEK_API_KEY` kerak (§9). Qaytarish: `LLM_PROVIDER=ollama`.

### Model tanlash (serverga qarab, env `OLLAMA_MODEL`)

| Server | Tavsiya model | Izoh |
|---|---|---|
| GPU yo'q, 16 GB RAM | 4B sinf (`gemma3:4b`) | ~3 GB RAM, generatsiya ~1 daqiqa |
| GPU yo'q, 32 GB RAM | **8B sinf (`gemma4:latest`)** | sifat/tezlik muvozanati — pastdagi o'lchovga qarang |
| GPU 12+ GB | 12B sinf | 2–5 s javob, eng yaxshi sifat |

**R1 da lokal mashinada o'lchangan (2026-07-25, CPU, Apple Silicon; bitta murojaat = xulosa + javob drafti + teglar):**

| Model | Parametr | To'liq javob | Sifat |
|---|---|---|---|
| `qwen2.5:3b` | 3.1B | **14 s** | ❌ yaroqsiz — kategoriya xato, maydon nomlarini o'ylab topadi |
| `gemma4:latest` | 8.0B | **137 s** | ✅ to'g'ri kategoriya, to'g'ri enum qiymatlar, yaxshi o'zbekcha xulosa |
| `gemma4:12b` | 11.9B | **326 s** | ✅ sifat yaxshi, lekin CPU'da juda sekin (~0.56 tok/s) |

**Bundan chiqadigan qat'iy qoida:** `LLM_TIMEOUT_S` tanlangan modelning real vaqtidan **kamida 2 barobar** katta bo'lishi shart. Standart 300 s (8B sinf uchun yetarli zaxira bilan). Timeout kichik bo'lsa oqibat jim va zararli: har murojaat `LlmError` bilan tugaydi, draft yaratilmaydi, tizim esa "ishlayotgandek" ko'rinadi — aynan shu holat R1 sinovida topildi (120 s timeout, 12B model → har safar 2×120 s kutib, natijasiz). Dashboard'dagi AI salomatlik indikatori (`llm_errors_1h`) shuni ko'rsatadi.

(Foydalanuvchi kutmaydi — hammasi submit'dan KEYIN worker'da, konkurensiya 1. Kunlik hajm ×  o'rtacha vaqt server yukini beradi: 50 murojaat × 137 s ≈ 1.9 soat uzluksiz CPU — bitta tuman uchun maqbul.) Yangi model chiqsa shu env bilan almashtiriladi — kod o'zgarmaydi.

### So'rov (chat, `format: "json"`, temperature 0, `keep_alive: -1`)

System prompt (qisqartirilgan; to'liq varianti kodda):

```
Sen O'zbekiston tuman hokimligi murojaatlarini tasniflovchi yordamchisan.
Fuqaro matni o'zbek (lotin/kirill/sheva), rus yoki ingliz tilida bo'lishi mumkin.
Faqat JSON qaytar. Kategoriyalardan FAQAT bittasini tanla:
{categories: `kod: nom — chegara izohi` ro'yxati DB'dan dinamik}
Maydonlar: category_code, confidence (0..1), priority (low|medium|high|critical —
hayot/xavfsizlik tahdidi bo'lsa critical), sentiment (negative|neutral|positive),
summary_uz (o'zbek lotin, max 2 gap), reply_draft_uz (rasmiy, xushmuomala javob
loyihasi, 2-3 gap, "Hurmatli fuqaro" bilan boshlansin), tags (3-6 ta qisqa teg).
```

**Chegara izohi (`categories.descriptions`, M15 — v1.8).** Kategoriya nomi ikki so'z bo'lgani uchun chegaraviy holatni hal qila olmasdi. Izoh «nima kiradi; nima kirmaydi -> qaysi kod» shaklida yoziladi va faqat chegarasi chalkash kategoriyalarga beriladi (22 tadan 11 tasi) — nomi o'z-o'zidan aniq bo'lganlarga izoh qo'shish promptni bekorga suyultiradi.

O'lchangan ta'sir (deepseek-v4-flash, chegaraviy matnlar): izohsiz holatga nisbatan yo'naltirish o'zgardi va izohda yozilgan qoidaga mos tushdi. Eng muhimi — «ko'chamiz qorong'i, bezorilar yig'iladi» avval `jamoat_xavfsizlik` ga ketardi (militsiya faqat patrul qila oladi), endi `elektr` ga (yoritishni **tuzatadi**) + `jamoat_xavfsizlik` sub-taski bilan. Ya'ni murojaat muammoni hal qila oladigan bo'limga boradi.

**Ko'cha yoritishi -> `elektr` (v1.8, hokimlik tasdiqlagan).** Dastlab u `yol_transport` da edi (AI ham izohsiz shu tanlovni qilardi — «ko'cha infratuzilmasi» mantig'i bilan), lekin bu noto'g'ri: ko'cha chiroqlari Elektr tarmoqlari korxonasi zimmasida. Izoh tuzatilgach tekshirildi — regressiya yo'q:

| Matn | Kategoriya |
|---|---|
| ko'cha chiroqlari yonmayapti | `elektr` |
| tungi yoritish lampalari ishlamayapti | `elektr` |
| ko'cha qorong'i, bezorilar yig'iladi | `elektr` + `jamoat_xavfsizlik` |
| uyga svet kelmayapti | `elektr` |
| yo'lda katta chuqur | `yol_transport` |
| **svetofor ishlamayapti** | `yol_transport` |

Oxirgi ikkitasi muhim: model **svetoforni** (yo'l signali) **ko'cha chirog'idan** (yoritish) ajratadi.

> Izohlar `app/seed.py` dagi `CATEGORY_DESCRIPTIONS` da turadi va seed **mavjud** kategoriyalarga ham har safar qayta yozadi — ya'ni yo'naltirishni sozlash = izohni tahrirlab `python -m app.seed` yurgizish, kod o'zgartirish EMAS. Boshqa chegara noto'g'ri chiqsa, shu joydan tuzatiladi.

User xabari: fuqaroning asl matni (hech qanday normalizatsiyasiz — LLM kirill/lotin/shevani o'zi tushunadi, bu keyword lug'atidan farqli o'laroq uning kuchli tomoni) + mavjud bo'lsa mahalla/manzil.

Javob validatsiyasi: Pydantic (`category_code` ro'yxatda bo'lishi shart; bo'lmasa `boshqa` + `needs_review=true`; `priority`/`sentiment` noto'g'ri qiymat bersa — model o'zbekcha "yuqori"/"salbiy" deb qaytarishi kuzatilgan — standart qiymatga tushadi). Timeout `LLM_TIMEOUT_S` (standart 300 s), `LLM_MAX_ATTEMPTS` marta urinish; barchasi tugasa — §2 qayta urinish navbati (admin navbati EMAS).

### Sozlash

`OLLAMA_URL`, `OLLAMA_MODEL`, `LLM_TIMEOUT_S`, `LLM_MAX_ATTEMPTS`, `AI_LOW_CONFIDENCE` (standart 0.6 — LLM shundan past ishonch bersa `needs_review` belgisi qo'yiladi, lekin yo'naltirish baribir bajariladi). Worker konkurensiyasi: 1 (CPU serverda navbat ketma-ket).

## 5. Sifatni kuzatish (o'rganish sikli o'rniga)

Keyword lug'ati bo'lmagani uchun "o'rganish" endi lug'at boyitish emas — **prompt va model sifatini kuzatish**:

1. **AI aniqligi** (`ai_accuracy_7d` + `ai_reviewed_7d`, dashboard): `reviewed` eventlari ichida `reason == "ok"` ulushi — ya'ni **odam tekshirgan** murojaatlarda AI to'g'ri topganlari. 85% dan pastga tushsa prompt yoki model qayta ko'riladi.

   > **v1.8 da tuzatildi.** Avval bu `ai_category_id` vs `category_id` solishtiruvi edi va DOIM 1.0 qaytarardi: worker ikkala maydonga aynan bir xil qiymat yozadi, ular esa faqat admin `/review` orqali to'g'irlaganda ajraladi. Tekshiruv oqimi ishlatilmasa metrika abadiy «100%» bo'lib turardi, ya'ni 85% darvozasi hech qachon yopilmasdi. O'lchov gate bo'la olmasa — gate yo'q degani.
   >
   > **Foizni har doim `ai_reviewed_7d` bilan birga o'qing.** Namuna `needs_review` ga tushganlarga qiyshaygan (qiyin holatlar) va kichik bo'lishi mumkin: 2 ta tekshiruvdan chiqqan 100% hech narsani anglatmaydi. Qiyshaymagan signal — `ai_routing_corrected_7d`: u AI yo'naltirgan murojaatni xodim keyin boshqa bo'limga ko'chirganini eventlardan topadi va tekshiruv sahifasiga bog'liq emas.
2. **Past ishonch ulushi** (`needs_review` soni): AI o'zi ikkilangan holatlar. Ko'payib ketsa — kategoriya ro'yxati noaniq (masalan "kommunal" va "suv" chegarasi) degani, kategoriya tavsiflari aniqlashtiriladi.

   > **`AI_LOW_CONFIDENCE` modelga sozlanadi va zaxira to'r, asosiy signal emas (v1.8).** Standart 0.6 dan 0.9 ga ko'tarildi: 0.6 da bu shart **hech qachon ishlamagan** — 35 ta tahlildan bittasi ham undan past emas. LLM o'zi haqidagi ishonchni deyarli doim yuqori beradi (modelning ma'lum xususiyati).
   >
   > deepseek-v4-flash o'lchovi (n=20): `0.60×1, 0.92×1, 0.95×16, 1.00×2`. Chegara **pichoq tig'ida**: `<0.90` → 5%, `<0.95` → 10%, **`<0.96` → 90%**. Qiymatlarning 80% i aynan 0.95 bo'lgani uchun 0.96 ga ko'tarish tekshiruv navbatini bosib ketadi. Shu sababli bu signalda barqaror «darvoza» qurib bo'lmaydi — u faqat chetdagi holatlarni ushlaydi.
   >
   > **Model almashtirilsa qayta o'lchang:** `SELECT confidence, count(*) FROM ai_analyses WHERE model='<yangi>' GROUP BY 1 ORDER BY 1;`
3. **AI nazorati sahifasi** (admin, FE): past ishonch bilan yo'naltirilgan murojaatlar ro'yxati. Bu **navbat emas** — hech narsa kutmaydi, admin xohlasa kirib ko'radi va noto'g'ri yo'naltirilganini qayta yo'naltiradi (`POST .../review`).
4. **Prompt versiyalash:** system prompt kodda (`app/services/ai/llm.py`), o'zgartirilganda `ai_analyses.model` maydoniga model nomi yozilgani kabi o'zgarish commit'da qayd etiladi — aniqlik tushsa qaysi o'zgarishdan keyinligi ko'rinadi.

## 6. Ovoz→matn (STT) — tanlangan yechim

**Arxitektura:** provayder interfeysi `transcribe(audio_path, language) -> str` (`app/services/ai/stt.py`), env `STT_PROVIDER` bilan almashinadi. Oqim: FE/bot audio yuboradi → `stt_jobs` → worker: ffmpeg → 16 kHz mono wav → provayder → matn. Publicda poll API ([03](03-kontraktlar.md) §3.3).

> **v1.6.1 — `faster-whisper` olib tashlandi.** Sabab: CTranslate2/whisper stack og'ir (GB'larcha model, CPU'da bir necha o'n soniya) va bog'liqliklari (`ctranslate2`, `tokenizers`) ko'p. `gigaam` (v1.6 da qo'shilgan, quyida) xuddi shu vazifani yengilroq int8 ONNX bilan bajaradi — `onnxruntime` boshqa yo'nalishda (STT) allaqachon kerak edi.

| Provayder | Qachon | Izoh |
|---|---|---|
| **`gigaam` (GigaAM Multilingual, int8 ONNX, lokal) — STANDART** | boshlanish, byudjetsiz | `app/services/ai/gigaam_asr.py` — `voice/` sibling loyihadagi log-mel + CTC decode pipeline'ning Python porti, `onnxruntime` orqali ishlaydi. `GIGAAM_MODEL_DIR` (manifest.json + `.onnx` fayl) sozlanishi SHART — avtomatik yuklanmaydi (whisper'dan farqli, HF'dan o'zi tortib olmaydi), model fayllarini qo'lda joylashtirish kerak. |
| **`mohirai` (mohir.ai API, pullik)** | pilot jiddiylashsa yoki `gigaam` sifati yetmasa | O'zbek tiliga ixtisoslashgan, sheva bilan eng yaxshi natija; API oddiy (audio → text). `MOHIRAI_API_KEY` |

`STT_PROVIDER` shu ikkisidan boshqa qiymat bo'lsa `SttError` ko'taradi (jim boshqa provayderga tushmaydi). Telegram voice (ogg/opus) ham xuddi shu pipeline'dan o'tadi.

## 7. Kelajak (V2, hozir QILINMAYDI)

Rasm tahlili (Ollama'da minicpm-v / qwen-vl — chuqur chuqurlik: rasmdan muammo turini tasdiqlash), OCR (hujjat rasmlari — PaddleOCR), takroriy murojaatlarni embedding bilan aniqlash (bir joy+bir muammo → birlashtirish), prognozlash. Interfeyslar ([02](02-arxitektura.md) §5) buni buzmasdan qo'shishga imkon beradi.
