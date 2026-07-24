# 02 — Maqsadli arxitektura va texnologik qarorlar

## 1. Qat'iy texnologik qarorlar (muhokama yopiq)

| Qaror | Tanlov | Nega (va nima rad etildi) |
|---|---|---|
| Backend | **FastAPI (Python) QOLADI** | TZ'da NestJS yozilgan, lekin: ishlayotgan kod bor; AI qatlam (Ollama, faster-whisper, transliteratsiya) Python'da native; 2 kishilik jamoa uchun bitta backend tili. NestJS'ga rewrite = 2+ hafta yo'qotish, 0 foyda |
| ORM/migratsiya | SQLAlchemy 2 + Alembic (qoladi) | Prisma emas — backend Python |
| Queue | **Redis + ARQ** (async, engil) | BullMQ emas (Node); Celery og'ir. ARQ — FastAPI bilan bitta uslub. STT va LLM ishlari shu queue'da |
| LLM fallback | **Ollama** + Gemma (12B q4; GPU'siz zaif serverda 4B) | Lokal, bepul, offline. Model nomi env orqali: `OLLAMA_MODEL` |
| Ovoz→matn | **faster-whisper** lokal (standart) + **mohir.ai API** ixtiyoriy provayder | [07-ai-layer.md](07-ai-layer.md) §5 da to'liq asos |
| Frontend | Next.js 16 App Router (qoladi), Tailwind v4, Recharts, Leaflet | TZ'dagi ro'yxatga yaqin; shadcn/TanStack/Zustand — **majburiy emas**, kerak joyda qo'shiladi (fuqaro portali imkon qadar oddiy qolsin) |
| i18n | **next-intl**, locale'lar: `uz` (lotin, standart), `oz` (kirill), `ru`, `en` | gov.uz uslubidagi qisqa kodlar. Backend xabarlari ham shu kodlar bilan |
| SMS | Eskiz.uz | O'zbekistonda standart, arzon |
| Bot | Python **aiogram 3**, alohida `bot/` servis, backendga faqat HTTP API orqali | Kontrakt intizomi buzilmasligi uchun DB'ga to'g'ridan-to'g'ri kirmaydi |
| Storage | MinIO (qoladi), bucket public-read, fayl validatsiya qo'shiladi | |
| Auth | JWT (qoladi). Fuqaro uchun auth YO'Q (guest) | |

## 2. Servislar diagrammasi

```
                                   ┌──────────────────────────── SERVER ───────────────────────────┐
  Fuqaro (telefon)                 │                                                                │
  ├─ Veb (Next.js) ── nginx ───────┼─► frontend :3000                                               │
  ├─ Telegram ─── Telegram API ────┼─► bot :  (aiogram, polling)                                    │
  └─ QR plakat ──► /go landing     │        │  HTTP (X-Bot-Token)                                   │
                                   │        ▼                                                       │
  Xodim/Admin (kompyuter)──────────┼─► backend :8000 (FastAPI) ──► PostgreSQL :5432                 │
                                   │        │            │                                          │
                                   │        │ enqueue    ├──► MinIO :9000 (rasm/video/audio)        │
                                   │        ▼            └──► Eskiz SMS API (tashqi)                │
                                   │   Redis :6379                                                  │
                                   │        │                                                       │
                                   │        ▼                                                       │
                                   │   worker (ARQ) ──► Ollama :11434 (Gemma)  [LLM klassifikatsiya]│
                                   │        └─────────► faster-whisper (lokal) [ovoz→matn]          │
                                   └────────────────────────────────────────────────────────────────┘
```

Repo tuzilishi (monorepo, hozirgiga qo'shiladi):

```
E-murojaat/
  docs/          ← shu hujjatlar
  backend/       ← FastAPI + worker (app/worker.py) + AI qatlam
  frontend/      ← Next.js (fuqaro portali + admin)
  bot/           ← aiogram 3 (P3'da yaratiladi)
  mobile/        ← V2 (Expo)
  docker-compose.yml (dev) / docker-compose.prod.yml
```

## 3. Murojaat hayot oqimi (asosiy data flow)

1. **Qabul.** Fuqaro (veb wizard / bot / QR→ikkisidan biri) yuboradi → `POST /api/public/complaints` → DB'ga `status=new`, ticket raqam beriladi → fuqaroga darhol ticket ko'rsatiladi (kutish yo'q).
2. **AI (async).** Submit tranzaksiyasi worker'ga `classify_complaint` ishini qo'yadi:
   - normalizatsiya (kirill→lotin, apostroflar, kichik harf) → **keyword klassifikator** (DB'dagi keywordlar);
   - confidence past bo'lsa → **Ollama/Gemma** JSON javob: kategoriya, priority, sentiment, summary, javob drafti, teglar;
   - natija `ai_analyses` ga yoziladi, murojaatga kategoriya/priority/deadline qo'yiladi, `status=ai_processed`, event log.
3. **Operator.** Admin panelda ko'radi: AI xulosasi + draft. Tasdiqlaydi yoki to'g'rilaydi → bo'limga biriktiradi (`assigned`). Operator to'g'rilagani `ai_analyses` bilan solishtirilib AI aniqligi KPI bo'ladi.
4. **Ijro.** Bo'lim xodimi `in_progress` / `need_info` / `resolved`. Javob editorida AI draftini tahrir qilib yuboradi → fuqaroga SMS/Telegram/status sahifada ko'rinadi.
5. **Monitoring.** SLA deadline o'tsa dashboard'da qizil + eskalatsiya bildirishnomasi. Hamma o'tishlar `complaint_events` da.
6. **O'rganish sikli.** Har kecha cron: LLM'gacha borgan (keyword topolmagan) murojaatlardan nomzod keywordlar → admin tasdiqlaydi → keyword bazasi o'sadi → LLM chaqiruvi kamayadi. ([07](07-ai-layer.md) §4)

## 4. Muhitlar

| Muhit | Nima | URL namuna |
|---|---|---|
| Lokal dev | docker compose (pg, minio, redis, ollama ixtiyoriy) + uvicorn + next dev | localhost:3000 / :8000 |
| Server (pilot) | Docker Compose prod: nginx + frontend + backend + worker + redis + pg + minio + ollama + bot | `https://<domen>` |

Deploy tafsiloti: [11-devops.md](11-devops.md). Kelajak (V2+): viloyat miqyosida multi-tuman (tenant) — hozircha yagona tuman, lekin `settings` jadvalida `TICKET_PREFIX` kabi qiymatlar shu kelajakni buzmaydigan qilib saqlanadi.

## 5. Chegaralar (kim nimaga tegadi)

- **Frontend** faqat `/api/public/*`, `/api/auth/*`, `/api/admin/*` endpointlarini ishlatadi. DB, worker, Ollama haqida bilmaydi.
- **Bot** faqat `/api/public/*` va `/api/bot/*` ni ishlatadi (statik `X-Bot-Token` bilan).
- **Worker** backend kodining bir qismi (bitta repo/venv), lekin alohida protsess — API protsessini hech qachon bloklamaydi.
- **AI qatlam** (`backend/app/services/ai/`) — faqat backend egasi o'zgartiradi. Interfeys: `classify(text) -> AiResult`, `transcribe(audio) -> str`. Router/worker bu interfeysga suyanadi, ichini bilmaydi.
