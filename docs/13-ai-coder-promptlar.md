# 13 — AI coder uchun tayyor promptlar

Claude Code / Kimi Code sessiyasiga copy-paste qilinadi. `<...>` joylarni to'ldiring. Promptlar ataylab qat'iy — AI coder erkin ijod qilmasin, docs'ga bo'ysunsin.

## 0. Universal preambula (har promptning boshiga qo'shsa bo'ladi)

```
Sen e-Murojaat AI loyihasida ishlaysan. QOIDALAR:
1. Avval o'qi: docs/README.md, docs/03-kontraktlar.md, keyin quyida ko'rsatilgan workstream faylini.
2. docs/03-kontraktlar.md va docs/04-database.md — yagona haqiqat. Ularga zid kod yozma.
   Kontraktni o'zgartirish kerak deb hisoblasang — kod yozMA, to'xta va menga sabab bilan ayt.
3. Tasklarni workstream faylidagi tartibda bajar. Har task tugagach: checkbox [x],
   yoniga 1 qator izoh, va qisqa commit ([BE]/[FE]/[BOT]/[AI]/[OPS] prefiksi bilan).
4. Task tugadi deyishdan oldin tekshir: backend uchun `pytest -m smoke` (+ Swaggerda endpoint),
   frontend uchun `npm run lint && npm run build`.
5. Savol tug'ilsa taxmin qilma — to'xtab menga savolni ro'yxat qilib ber.
```

## 1. Backend — ishni boshlash / davom ettirish

```
[Universal preambula]

Workstream fayling: docs/05-backend-tasklar.md. Qo'shimcha o'qi: docs/04-database.md,
docs/07-ai-layer.md (B2 tasklari uchun), docs/02-arxitektura.md.

Vazifa: docs/05 dagi birinchi bajarilmagan ([ ]) taskdan boshlab, <B1 fazasini yakunla /
BX.Y taskni bajar>. Kod backend/ papkada, FastAPI+SQLAlchemy uslubi mavjud kodga mos bo'lsin.
Har migratsiyadan keyin: alembic upgrade head && python -m app.seed ishlashini tekshir.
```

## 2. Frontend — ishni boshlash / davom ettirish

```
[Universal preambula]

Workstream fayling: docs/06-frontend-tasklar.md. Qo'shimcha MAJBURIY o'qi: docs/10-ui-ux.md
(fuqaro sahifalari uchun qonun!) va frontend/AGENTS.md (Next.js 16 haqida ogohlantirish —
shubha bo'lsa node_modules/next/dist/docs o'qi).

Vazifa: docs/06 dagi birinchi bajarilmagan taskdan boshlab <F1 fazasini yakunla / FX.Y taskni bajar>.
Fuqaro sahifalarida docs/10 §2 qoidalari (≥18px shrift, ≥56px tugma, bitta ustun, sodda so'zlar)
BUZILMASIN. Hamma matn messages/*.json orqali, 4 tilda (uz,oz,ru,en).
Backend endpoint hali tayyor bo'lmasa docs/03 dagi JSON namunalar bilan mock qil
(NEXT_PUBLIC_API_MOCK=1), lekin tiplarni docs/03 ga aynan mosla.
Har sahifani 375px va 1280px da tekshir.
```

## 3. AI qatlam (backend ichida)

```
[Universal preambula]

Bu sessiyada faqat AI qatlam: docs/07-ai-layer.md ni TO'LIQ o'qi. Workstream: docs/05 dagi B2.* tasklar.
Diqqat: normalizatsiya (07 §2) uchun test to'plami majburiy — kirill/lotin/apostrof juftliklari
bir xil natija berishi kerak. Ollama'siz muhitda ham hamma test o'tsin (LLM chaqiruvi mock).
```

## 4. Telegram bot

```
[Universal preambula]

Workstream fayling: docs/08-telegram-bot.md. Qo'shimcha: docs/03-kontraktlar.md §3 va §6
(bot faqat shu API'lar bilan ishlaydi — DB'ga to'g'ridan-to'g'ri ulanish TAQIQ), docs/10-ui-ux.md
(soddalik qoidalari botga ham tegishli).

Vazifa: bot/ papkani yarat va T1 fazani bajar. aiogram 3, FSM, 4 til.
Backendni http://localhost:8000 da ishlayapti deb hisobla; BOT_API_TOKEN env'dan.
```

## 5. Kod review (sherik yozgan qismni tekshirish)

```
Sen reviewer'san. O'qi: docs/03-kontraktlar.md, docs/04-database.md, keyin <branch/PR diff>ni.
Tekshir: (1) kontrakt drift — endpoint/enum/format docs/03 ga mosmi; (2) DB o'zgarishlar docs/04 da
bormi; (3) status o'tishlari workflow servisi orqalimi; (4) fuqaro sahifalarida docs/10 §2
buzilmaganmi; (5) hardcoded matn/sir yo'qmi. Har topilma: fayl:qator + qisqa tavsif + jiddiylik.
Kod tuzatma — faqat hisobot ber.
```

## 6. Integratsiya checkpoint yordamchisi

```
docs/12-roadmap.md dagi C<1|2|3> checklist'ini ol. Har bandni lokal muhitda bajarib
(curl / brauzer / pytest), PASS yoki FAIL + dalil (buyruq va natija) bilan jadval qilib ber.
FAIL bo'lganlar uchun aybdor qatlamni (BE/FE/BOT) va tuzatish taklifini yoz.
```

## Maslahatlar

- Bitta sessiya = bitta faza yoki 2–4 task. "Butun loyihani qil" dema — sifat tushadi.
- Sessiya oxirida: "docs'dagi checkboxlarni yangilab, qisqa hisobot yoz" deb so'rang — keyingi sessiya (yoki sherik) shu yerdan davom etadi.
- AI coder kontraktga qarshi chiqsa (ko'pincha haqli savol bo'ladi) — javobni docs'ga kiritib keyin davom ettiring.
