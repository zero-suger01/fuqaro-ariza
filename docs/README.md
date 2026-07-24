# e-Murojaat AI — Loyiha hujjatlari (docs)

Bu papka — loyihaning **yagona haqiqat manbai** (single source of truth). Kod shu hujjatlarga bo'ysunadi, aksincha emas. Loyihani 2 kishi (+ AI coder'lar: Claude Code / Kimi Code) parallel qiladi, shuning uchun hujjatlar workstream'larga bo'lingan: backend, frontend, AI qatlami, Telegram bot, mobile, DevOps.

## Fayllar xaritasi

| Fayl | Nima haqida | Kim o'qiydi |
|---|---|---|
| [00-umumiy-korinish.md](00-umumiy-korinish.md) | Loyiha maqsadi, modullar, MVP chegarasi | Hamma (birinchi) |
| [01-hozirgi-holat.md](01-hozirgi-holat.md) | Mavjud codebase auditi: nima bor, nima yo'q, nima buzuq | Hamma |
| [02-arxitektura.md](02-arxitektura.md) | Maqsadli arxitektura, texnologik qarorlar va sabablari | Hamma |
| [03-kontraktlar.md](03-kontraktlar.md) | **ENG MUHIM.** Enum'lar, statuslar, API spec, formatlar. Mismatch'ga qarshi yagona manba | Hamma, doim |
| [04-database.md](04-database.md) | Maqsadli DB sxema + mavjud sxemadan migratsiya rejasi | Backend |
| [05-backend-tasklar.md](05-backend-tasklar.md) | Backend workstream: B1–B5 fazalar, tasklar, acceptance criteria | Backend |
| [06-frontend-tasklar.md](06-frontend-tasklar.md) | Frontend workstream: F1–F5 fazalar (fuqaro portali + admin) | Frontend |
| [07-ai-layer.md](07-ai-layer.md) | Gibrid klassifikator (keyword + lokal LLM), o'rganish sikli, ovoz→matn | Backend/AI |
| [08-telegram-bot.md](08-telegram-bot.md) | Bot workstream: T1–T3 fazalar | Bot egasi |
| [09-mobile.md](09-mobile.md) | Mobil ilova (V2, keyinroq) | Mobile egasi |
| [10-ui-ux.md](10-ui-ux.md) | 70+ yosh foydalanuvchi uchun soddalik qoidalari, ekran-ekran spec, i18n, QR | Frontend, dizayn |
| [11-devops.md](11-devops.md) | Docker, server, Ollama, deploy, backup | DevOps qiluvchi |
| [12-roadmap.md](12-roadmap.md) | Umumiy fazalar (P0–P4), ish taqsimoti, integratsiya checkpointlari, DoD | Hamma |
| [13-ai-coder-promptlar.md](13-ai-coder-promptlar.md) | AI coder'ga copy-paste qilinadigan tayyor promptlar | Hamma |

## Ikkovlon ishlash tartibi (mismatch bo'lmasligi uchun)

1. **Kontrakt-first.** API endpoint, enum, status, DB ustuni — bularning birortasini o'zgartirishdan OLDIN [03-kontraktlar.md](03-kontraktlar.md) (kerak bo'lsa [04-database.md](04-database.md)) o'zgartiriladi, ikkinchi odam ko'rib "OK" deydi, KEYIN kod yoziladi. Hech qachon teskarisi emas.
2. **Workstream egaligi.** Har workstream'ning bitta egasi bor ([12-roadmap.md](12-roadmap.md) dagi taqsimot). Boshqaning workstream'iga kod yozish — faqat kelishib.
3. **Branch va commit.** Branch nomlari: `be/<task>`, `fe/<task>`, `bot/<task>`, `docs/<task>`. Commit prefikslari: `[BE]`, `[FE]`, `[BOT]`, `[AI]`, `[DOCS]`, `[OPS]`. `main` ga faqat ishlayotgan kod merge qilinadi.
4. **Integratsiya checkpointlari.** Har faza oxirida C1–C4 checkpoint ([12-roadmap.md](12-roadmap.md)): ikkovlon birga smoke-test checklist yuriladi. Checkpoint o'tmaguncha keyingi fazaga o'tilmaydi.
5. **Backend — API'ning haqiqati, docs — kontraktning haqiqati.** Backend har endpoint'ni Swagger'da (`/docs`) ko'rsatadi. Frontend faqat 03-dagi endpointlarni ishlatadi; 03-da yo'q endpoint kerak bo'lsa — avval 03 ga qo'shiladi.
6. **Frontend backend'siz ham ishlay olishi kerak.** 03-dagi JSON namunalar asosida mock (yoki lokal docker'dagi backend). Backend tayyor bo'lishini kutib o'tirilmaydi.

## AI coder bilan ishlash

- Har sessiya boshida AI coder'ga [13-ai-coder-promptlar.md](13-ai-coder-promptlar.md) dagi tegishli prompt beriladi ("Frontend ishini boshla/davom ettir" va h.k.).
- AI coder qoidasi: avval `docs/README.md` + `docs/03-kontraktlar.md` + o'z workstream fayli o'qiladi, keyin kod.
- AI coder kontraktni o'zgartira olmaydi. Kontraktga to'g'ri kelmaydigan holat topsa — kodni emas, savolni qaytaradi.
- Task tugagach AI coder o'z workstream faylidagi checkbox'ni `[x]` qiladi va qisqa "nima qilindi" izoh yozadi — keyingi sessiya shu yerdan davom etadi.

## Tez start (lokal)

```bash
docker compose up -d            # Postgres (5433) + MinIO (9000/9001)
cd backend && source venv/bin/activate && alembic upgrade head && python -m app.seed && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev      # http://localhost:3000, API: http://localhost:8000/docs
```

Standart admin: `+998900000000` / `admin123`. To'liq ko'rsatma: [11-devops.md](11-devops.md).
