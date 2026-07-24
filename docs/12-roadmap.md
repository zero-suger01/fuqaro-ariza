# 12 — Roadmap: fazalar, ish taqsimoti, checkpointlar

## 1. Umumiy fazalar

| Faza | Nima | Ichidagi tasklar | Taxminiy muddat (2 kishi + AI coder) |
|---|---|---|---|
| **P0** | Kelishuv | Ikkovlon docs o'qiydi, taqsimotni tanlaydi, savollar 03/04 ga tuzatish sifatida kiradi | 0.5 kun |
| **P1** | Yadro MVP: guest oqim | B1.1–B1.11, F1.1–F1.8, D1 | 1.5–2 hafta |
| **P2** | AI kuchaytirish + admin v2 | B2.*, B3.*, B4.1–B4.4, F2.*, F3.1–F3.3 | 2 hafta |
| **P3** | Kanallar + analitika + qattiqlashtirish | B4.5–B4.7, B5.*, F4.*, F5.*, T1–T3, D2–D8, pilot deploy | 2 hafta |
| **P4/V2** | Backlog (§5) | kelishiladi | — |

Fazalar ichida backend/frontend PARALLEL boradi — kontraktlar ([03](03-kontraktlar.md)) oldindan yozilgani uchun bir-birini kutish minimal.

## 2. Ish taqsimoti (tavsiya — P0 da yakunlanadi)

| Workstream | Egasi | Hujjat |
|---|---|---|
| Backend + DB + AI qatlam | **Sherik A** (backendni boshlayman degan kishi) | [05](05-backend-tasklar.md), [04](04-database.md), [07](07-ai-layer.md) |
| Frontend (fuqaro + admin) + UI/UX | **Sherik B** | [06](06-frontend-tasklar.md), [10](10-ui-ux.md) |
| Telegram bot | P3 boshida kim bo'sh bo'lsa (API tayyor bo'ladi) | [08](08-telegram-bot.md) |
| DevOps (D-tasklar) | Sherik A (asosiy) + B lokal muhitni biladi | [11](11-devops.md) |
| Docs qo'riqchisi | IKKOVLON — docs PR'siz kontrakt o'zgarmaydi | [README](README.md) |

> Kim A, kim B — o'zaro kelishasizlar; hujjatlar taqsimotga bog'liq emas, istalgan kishi istalgan workstream'ni olsa docs o'sha-o'sha ishlaydi.

## 3. Integratsiya checkpointlari (birga o'tkaziladi, ~1 soat)

**C1 (P1 oxiri) — "Guest oqim tirik":**
- [ ] Telefonda (real qurilma) ro'yxatsiz murojaat: matn+rasm → ticket ekrani
- [ ] `/holat` da ticket+telefon bilan holat ko'rinadi (4 qadam)
- [ ] Admin ro'yxatda yangi murojaat (pagination ishlaydi), status o'zgartirilsa track yangilanadi, rejected'da sabab ko'rinadi
- [ ] 4 tilda wizard yurib chiqiladi; `pytest -m smoke` + `npm run build` yashil
- [ ] Kontrakt drift tekshiruvi: FE `types.ts` vs Swagger — farq yo'q

**C2 (P2 oxiri) — "AI + javob sikli":**
- [ ] Keyword topolmaydigan sheva matni ("свет ўчиб қолди уч кундан бери") → LLM to'g'ri kategoriya → needs_review yo'q
- [ ] Ollama o'chirilganda ham submit ishlaydi (graceful fallback, needs_review=true)
- [ ] Ovozli murojaat (webda yozib) → matn → submit; suggestions inbox'da nomzod keyword ko'rinadi → approve → xuddi shu matn endi keyword bilan topiladi
- [ ] Admin javob yozadi → fuqaroga SMS keladi + track'da ko'rinadi
- [ ] Rate limit ishlaydi (6-chi so'rov 429)

**C3 (P3 oxiri) — "Pilotga tayyor":**
- [ ] Bot to'liq oqimi ([08](08-telegram-bot.md) Acceptance) + QR plakat skan → ikkala yo'l ham ishlaydi
- [ ] Heatmap + KPI sahifalari real data bilan; eskalatsiya (deadline o'tgan test murojaat) manager'ga tushadi
- [ ] Prod serverda deploy, HTTPS, backup skripti sinovdan o'tgan, `deploy.sh` bilan yangilash 1 buyruq
- [ ] Yuk testi-lite: 100 parallel submit — xato/dublikat ticket yo'q
- [ ] **Jonli UX testi: kamida bitta 60+ yoshli odam yordamisiz murojaat yubora oladi** (bu bajarilmasa P3 yopilmaydi!)

## 4. Definition of Done (har task uchun)

1. Kod kontraktga mos ([03](03-kontraktlar.md)/[04](04-database.md)) — drift yo'q.
2. Backend: schema + Swagger + smoke test; Frontend: lint+build + 375px/1280px tekshirilgan; matnlar messages orqali.
3. Workstream faylida checkbox `[x]` + 1 qator izoh (nima qilindi / og'ishlar).
4. PR ikkinchi sherik tomonidan ko'rilgan (AI coder yozgan kodni ham ODAM ko'radi).
5. `main` ga merge — faqat yashil CI bilan.

## 5. V2 backlog (P4+, tartiblanmagan)

Mobil ilova ([09](09-mobile.md)) · rasm tahlili (vision LLM) · OCR · AI ovozli operator (telefon) · takroriy murojaatlarni embedding bilan birlashtirish · SMS OTP bilan to'liq kabinet · hokim uchun real-time TV dashboard · GIS qatlamlar · Open Data eksport · E-IMZO · davlat tizimlari API · prognozlash · multi-tuman (tenant) rejim · Grafana monitoring · Kubernetes.

## 6. Risklar va javoblar

| Risk | Ehtimol/Zarar | Javob |
|---|---|---|
| LLM CPU'da juda sekin (navbat o'sadi) | O'rta/O'rta | Async pipeline + 4B model + keyword bazasini tez boyitish (C2 metrikasi); kerak bo'lsa GPU ijara |
| Whisper o'zbek shevada zaif | O'rta/O'rta | Fuqaro STT natijani ko'rib tuzatadi; uz fine-tune model; mohir.ai rejasi ([07](07-ai-layer.md) §6) |
| Kontrakt drift (FE/BE mos kelmay qoladi) | O'rta/Katta | Docs-first qoida + C-checkpointlardagi drift tekshiruvi + PR'da 03 diff talab qilinadi |
| SMS narxi/uzilishi | Past/O'rta | SMS faqat muhim statuslarda (qabul, javob); Telegram bo'lsa SMS o'rniga telegram |
| Spam/hujum (public form) | O'rta/O'rta | Rate limit + Turnstile + fayl validatsiya (B4) |
| 2 kishida vaqt yetmasligi | O'rta/Katta | Fazalar kesiladi: P1 chiqsa ham qiymat bor (guest oqim); P2/P3 funksiyalari mustaqil bo'laklar |
| Next 16 / yangi kutubxona syurprizlari | Past/O'rta | frontend/AGENTS.md qoidasi: `node_modules/next/dist/docs` o'qish; AI coder'ga ham shu buyuriladi |
