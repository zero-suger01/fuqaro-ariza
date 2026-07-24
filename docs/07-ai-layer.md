# 07 — AI qatlami: gibrid klassifikator, o'rganish sikli, ovoz→matn

Maqsad: **arzon, offline, vaqt o'tgan sari aqlliroq**. Keyword birinchi (bepul, millisekund), lokal LLM faqat keyword ojiz qolganda (sheva, murakkab matn), va har kuni LLM natijalaridan keyword bazasi boyitiladi — LLM chaqiruvi tobora kamayadi.

## 1. Pipeline v2 (R0): keyword = ROUTING, LLM = GENERATSIYA

> O'zgarish sababi (premortem, Xato 1): xulosa/javob-draft/kayfiyat faqat LLM'da yaratiladi, LLM esa faqat fallback edi — keyword qancha yaxshi o'rgansa, AI ko'rinadigan qiymat shuncha KAMAYARDI. Endi LLM har murojaatda ishlaydi; keyword esa routing'ni bir zumda hal qiladi. Fuqaro hech narsa kutmaydi (hammasi submit'dan keyin, async).

Ikki bosqichli worker:

**1-bosqich — `classify_complaint` (millisekundlar, routing):**

```
matn ──► normalizatsiya ──► keyword scoring ──► confident (threshold+margin OK)?
             │ ha: kategoriya + priority (danger-evristika) + deadline
             │     → status=ai_processed → kategoriya bo'limga bog'langan bo'lsa
             │       avto-assign (actor_type=ai) → fuqaroga «yo'naltirildi»
             │ yo'q: status=ai_processed, biriktirilmaydi (routing 2-bosqichni kutadi)
             ▼
     ai_analyses(engine=keyword, confident=true|false) yoziladi
     → `generate_analysis` ishi navbatga qo'yiladi (HAR DOIM)
```

**2-bosqich — `generate_analysis` (har murojaatda, LLM navbati konkurensiya=1):**

Ollama (Gemma, JSON, §4 formati) → `summary_uz`, `reply_draft_uz`, `sentiment`, `tags`, `category_code` (ikkinchi fikr), `priority` → `ai_analyses(engine=llm)` yoziladi.

**Qarorlar jadvali** (`needs_review` endi FAQAT «routing insonga muhtoj» degani):

| Keyword | LLM | Natija |
|---|---|---|
| confident | OK, kategoriya MOS | hammasi avtomatik; needs_review=false |
| confident | OK, kategoriya FARQLI | biriktirish QOLADI, lekin needs_review=true — admin Tasdiqlash navbatida tekshiradi (keyword xato yo'naltirgan bo'lishi mumkin) |
| confident | xato/timeout | needs_review=FALSE (routing keyword'niki, buzilmagan); draft'siz davom — degradatsiya, blokirovka emas |
| not confident | OK | LLM kategoriyasi routing'ni hal qiladi: kategoriya + deadline + avto-assign; noma'lum `category_code` → `boshqa` + needs_review=true |
| not confident | xato/timeout | keyword natijasi (yoki `boshqa`) + needs_review=true (avvalgi xatti-harakat) |

Qo'shimcha qoidalar:

- **Priority faqat KO'TARILADI:** yakuniy = max(keyword, llm) (low<medium<high<critical) — LLM «critical» desa keyword'ning «medium»i yutmaydi; pastga tushirish taqiqlanadi.
- Ikkala yugurish ham `ai_analyses`da; keyword yozuviga yangi **`confident`** belgisi ([04](04-database.md) §4 M7) — o'rganish sikli (§5) va KPI shu belgiga tayanadi.
- Admin detail'dagi `ai` — oxirgi tahlil (bu rejimda odatda engine=llm, ya'ni summary/draft HAR murojaatda ko'rinadi); routing haqiqati murojaatning o'zida (`category`, `needs_review`).
- LLM navbat chuqurligi va oxirgi muvaffaqiyat vaqti `GET /api/admin/stats/ai-health`da ([03](03-kontraktlar.md) §5) — jim sinish (premortem X5) endi ko'rinadigan hodisa.

## 2. Normalizatsiya (`app/services/ai/normalize.py`) — hamma narsaning poydevori

Kirill, lotin, apostrof-xaos va shevalar bitta shaklga keltiriladi. Keywordlar DB'da FAQAT normalizatsiyalangan shaklda saqlanadi; kiruvchi matn ham shu funksiyadan o'tadi.

Qadamlar (tartib muhim):

1. `lower()` + unicode NFC.
2. **Kirill→lotin transliteratsiya** (o'zbek jadvali): `ў→o'`, `ғ→g'`, `қ→q`, `ҳ→h`, `ш→sh`, `ч→ch`, `я→ya`, `ю→yu`, `ё→yo`, `ц→ts`, `ж→j`, `э→e`, `ъ→'`... To'liq jadval kodda konstanta bo'ladi. (Rus so'zlari ham lotinlashadi — "свет йўқ" → "svet yo'q" — keywordlar buni qamraydi.)
3. **Apostrof birxillashtirish:** `ʻ ʼ ` ´ '` → `'` ; `o'/oʻ/o`/o´` hammasi `o'`.
4. Punktuatsiya → bo'sh joy; ko'p bo'sh joy → bitta.
5. (Matching uchun) so'zlarga bo'lish; 2 tagacha so'zli fraza sifatida ham qidiriladi.

Test to'plami majburiy: "Кўчамизда свет йўқ" ≡ "ko'chamizda svet yo'q"; "suv oqmayapti" / "сув оқмаяпти"; "yo`l chuqur" / "yo'l chuqur".

## 3. Keyword klassifikator v2 (`app/services/ai/classifier.py` qayta yoziladi)

- Manba: `category_keywords` jadvali (in-memory kesh, 60 s TTL yoki o'zgarishda invalidatsiya). Mavjud hardcoded lug'at seed'ga ko'chadi va **kengaytiriladi**: har kategoriya uchun kirill orqali kiradigan ruscha so'zlar ("svet", "musor", "vodoprovod"), keng tarqalgan sheva/xato yozuvlar ("chiroq o'chdi", "lampichka", "arik", "kanalizatsiya bitgan").
- Scoring: `score(cat) = Σ weight(keyword ∈ matn)`; fraza (2 so'z) topilsa weight ×2 sanaladi.
- Confidence: `top1 / (top1 + top2 + 1)` ko'rinishidagi nisbiy formula (0–1). Qo'shimcha **margin sharti**: `top1_score - top2_score ≥ 2` bo'lmasa ishonchsiz.
- Qaror: `confidence ≥ AI_CONFIDENCE_THRESHOLD (default 0.75)` VA margin OK → keyword natijasi qabul. Aks holda → LLM.
- Keyword yo'lida priority ham evristik: "portlash, gaz hidi, sim uzilgan, toshqin, avariya" kabi xavf so'zlari (`danger_keywords` ro'yxati, settings'da) → `high/critical`; aks holda `medium`.

## 4. LLM — Ollama + Gemma (har murojaatda generatsiya; ishonchsiz routing'da hakam)

### Model tanlash (serverga qarab, env `OLLAMA_MODEL`)

| Server | Tavsiya model | Izoh |
|---|---|---|
| GPU yo'q, 16 GB RAM | `gemma3:4b` (q4) | ~3 GB RAM, CPU'da 10–20 tok/s — async oqim uchun yetarli |
| GPU yo'q, 32 GB RAM | `gemma3:12b` (q4) | sifat yaxshiroq, CPU'da sekin (javob 30–90 s) — async bo'lgani uchun OK |
| GPU 12+ GB | `gemma3:12b` | 2–5 s javob |

(Foydalanuvchi kutmaydi — klassifikatsiya submit'dan KEYIN worker'da. Shuning uchun sekin CPU inference ham maqbul; navbat uzayib ketsa dashboard'da ko'rinadi.) Yangi Gemma versiyasi chiqsa shu env bilan almashtiriladi — kod o'zgarmaydi.

### So'rov (chat, `format: "json"`, temperature 0, `keep_alive: -1`)

System prompt (qisqartirilgan; to'liq varianti kodda):

```
Sen O'zbekiston tuman hokimligi murojaatlarini tasniflovchi yordamchisan.
Fuqaro matni o'zbek (lotin/kirill/sheva), rus yoki ingliz tilida bo'lishi mumkin.
Faqat JSON qaytar. Kategoriyalardan FAQAT bittasini tanla:
{categories: kod — tavsif ro'yxati DB'dan dinamik}
Maydonlar: category_code, confidence (0..1), priority (low|medium|high|critical —
hayot/xavfsizlik tahdidi bo'lsa critical), sentiment (negative|neutral|positive),
summary_uz (o'zbek lotin, max 2 gap), reply_draft_uz (rasmiy, xushmuomala javob
loyihasi, 2-3 gap, "Hurmatli fuqaro" bilan boshlansin), tags (3-6 ta qisqa teg).
```

User xabari: normalizatsiyadan O'TMAGAN asl matn (LLM'ga boy kontekst foydali) + mavjud bo'lsa mahalla/manzil.

Javob validatsiyasi: Pydantic (`category_code` ro'yxatda bo'lishi shart; bo'lmasa `boshqa` + needs_review). Timeout 120 s, 1 marta retry, so'ng graceful fallback (§1 sxemadagi o'ng shox).

### Sozlash

`OLLAMA_URL`, `OLLAMA_MODEL`, `AI_CONFIDENCE_THRESHOLD`. Worker konkurensiyasi: LLM ishlari uchun 1 (CPU serverda), boshqa ishlar parallel.

## 5. O'rganish sikli (har kuni aqlliroq, LLM arzonlashadi)

1. **Iz qoldirish:** LLM ishlagan har murojaat uchun `ai_analyses` da engine=llm yozuvi bor (keyword nima degani ham yonida).
2. **Kunlik cron (02:00, ARQ cron):** so'nggi 24 soatdagi "keyword topolmagan, LLM topgan" murojaatlar olinadi (**R0 aniqlashtirish:** LLM-always rejimida `engine=llm` yozuvi HAR murojaatda bor, shuning uchun tanlov sharti — o'sha murojaatning `engine=keyword` yozuvida `confident=false` bo'lishi; `confident IS NULL` — eski yozuvlar — kirmaydi, aks holda lug'at allaqachon biladigan so'zlar taklif navbatini to'ldirib yuboradi) → matn normalizatsiya qilinadi → token va 2-so'zli frazalar chiqariladi → stopwordlar (uz/ru ro'yxat kodda) va mavjud keywordlar chiqarib tashlanadi → kamida 2 marta uchragan nomzodlar `keyword_suggestions` ga yoziladi (suggested_category = LLM tanlagan kategoriya, sample_complaint_ids bilan).
3. **Admin tasdiqlaydi:** Suggestions inbox'da (FE F2.5) Approve → `category_keywords` (source=auto) → kesh yangilanadi. Reject → qayta taklif qilinmaydi.
4. **Operator to'g'rilashi ham signal:** operator kategoriyani o'zgartirsa, event asosida shu matn ham keyingi cron'da tahlilga kiradi (to'g'ri kategoriya = operatorniki).
5. **Metrika (dashboard AI KPI):** haftalik keyword hit-rate (ROUTING'ni keyword o'zi hal qilgan %), routing'da LLM'ga qolgan ulush, AI aniqligi (yakuniy kategoriya vs AI taklifi). Maqsad: hit-rate o'sib boradi → routing bir zumda; generatsiya (summary/draft) esa doimiy qatlam — u hech qachon «tejash» uchun o'chirilmaydi.

## 6. Ovoz→matn (STT) — tanlangan yechim

**Arxitektura:** provayder interfeysi `transcribe(audio_path, language) -> str` (`app/services/ai/stt.py`), env `STT_PROVIDER` bilan almashinadi. Oqim: FE/bot audio yuboradi → `stt_jobs` → worker: ffmpeg → 16 kHz mono wav → provayder → matn. Publicda poll API ([03](03-kontraktlar.md) §3.3).

| Provayder | Qachon | Izoh |
|---|---|---|
| **`whisper` (faster-whisper, lokal) — STANDART** | boshlanish, byudjetsiz | `STT_WHISPER_MODEL=medium` (int8, CPU ~2–4 GB RAM). O'zbek uchun o'rtacha, rus/ingliz uchun yaxshi. ≤120 s klipda CPU'da bir necha o'n soniya — poll UX buni qamraydi |
| **O'zbekcha fine-tune whisper (HF: masalan `islomov/navaistt_v2_medium`)** | uz aniqligi yetmasa | faster-whisper (CTranslate2) ga konvert qilib xuddi shu interfeys bilan; sheva uchun sezilarli yaxshiroq |
| **`mohirai` (mohir.ai API, pullik)** | pilot jiddiylashsa | O'zbek tiliga ixtisoslashgan, sheva bilan eng yaxshi natija; API oddiy (audio → text). `MOHIRAI_API_KEY` |

**Tavsiya etilgan yo'l:** P2'da faster-whisper medium bilan chiqamiz (bepul, offline) → pilotda real fuqaro audiolarida sifat o'lchanadi (STT natijasini fuqaro baribir ko'rib tasdiqlaydi — xato fatal emas) → sifat yetmasa avval uz fine-tune modelga, keyin ham yetmasa mohir.ai'ga o'tiladi. Hammasi bitta env o'zgarishi bilan.

Til hint'i: fuqaro tanlagan locale'dan (`uz/oz→uz`, `ru→ru`, `en→en`). Telegram voice (ogg/opus) ham xuddi shu pipeline'dan o'tadi.

## 7. Kelajak (V2, hozir QILINMAYDI)

Rasm tahlili (Ollama'da minicpm-v / qwen-vl — chuqur chuqurlik: rasmdan muammo turini tasdiqlash), OCR (hujjat rasmlari — PaddleOCR), takroriy murojaatlarni embedding bilan aniqlash (bir joy+bir muammo → birlashtirish), prognozlash. Interfeyslar ([02](02-arxitektura.md) §5) buni buzmasdan qo'shishga imkon beradi.
