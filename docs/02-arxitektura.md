# 02 — Maqsadli arxitektura va texnologik qarorlar

## 1. Qat'iy texnologik qarorlar (muhokama yopiq)

| Qaror | Tanlov | Nega (va nima rad etildi) |
|---|---|---|
| Backend | **FastAPI (Python) QOLADI** | TZ'da NestJS yozilgan, lekin: ishlayotgan kod bor; AI qatlam (Ollama, GigaAM ONNX, transliteratsiya) Python'da native; 2 kishilik jamoa uchun bitta backend tili. NestJS'ga rewrite = 2+ hafta yo'qotish, 0 foyda |
| ORM/migratsiya | SQLAlchemy 2 + Alembic (qoladi) | Prisma emas — backend Python |
| Queue | **Redis + ARQ** (async, engil) | BullMQ emas (Node); Celery og'ir. ARQ — FastAPI bilan bitta uslub. STT va LLM ishlari shu queue'da |
| LLM fallback | **Ollama** + Gemma (12B q4; GPU'siz zaif serverda 4B) | Lokal, bepul, offline. Model nomi env orqali: `OLLAMA_MODEL` |
| Ovoz→matn | **GigaAM (int8 ONNX)** lokal (standart) + **mohir.ai API** ixtiyoriy provayder | [07-ai-layer.md](07-ai-layer.md) §5 da to'liq asos |
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
                                   │        └─────────► GigaAM ONNX (lokal) [ovoz→matn]          │
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
2. **AI (async, v1.3 — LLM yagona dvigatel).** Submit tranzaksiyasi worker'ga `analyze_complaint` ishini qo'yadi: **Ollama/Gemma** bitta yugurishda JSON qaytaradi — kategoriya, priority, sentiment, summary, javob drafti, teglar. Natija `ai_analyses` ga yoziladi, murojaatga kategoriya/priority/deadline qo'yiladi, `status=ai_processed`, so'ng kategoriyaning bo'limiga **avtomatik biriktiriladi** (`assigned`, `actor_type=ai`). Past ishonch hech narsani bloklamaydi — faqat `needs_review` belgisi qo'yiladi. LLM javob bermasa: qayta urinish zanjiri + har 15 daqiqada sweeper, 1 soatdan oshsa `stuck_ai` navbatiga ([07](07-ai-layer.md) §2).
3. **Qabul qilish (v1.4).** Bo'lim xodimi murojaatni ko'rib **«Qabul qilaman»** ni bosadi → `assigned_user_id` o'ziga yoziladi, `accepted_at` belgilanadi, `status=accepted`. Sahifani ochishning o'zi hech narsani o'zgartirmaydi. Admin AI xato yo'naltirganini `review`/`assign` bilan to'g'irlaydi — bu tuzatishlar `ai_analyses` bilan solishtirilib AI aniqligi KPI bo'ladi.
4. **Ijro.** Xodim `in_progress` / `need_info` / `resolved`. Javob editorida AI draftini tahrir qilib yuboradi → fuqaroga SMS/Telegram/status sahifada ko'rinadi.
5. **Ma'lumot sikli (v1.4).** `need_info` ga o'tishda savol matni majburiy va fuqaroga yetkaziladi. Fuqaro javobni **uch kanalning istalganidan** qaytaradi: `/holat` formasi, Telegram bot, yoki xodimga telefonda aytadi (xodim manual yozib qo'yadi). Web va Telegram murojaatni avtomatik `in_progress` ga qaytaradi.
6. **Yakun va e'tiroz (v1.4).** `resolved` javobsiz mumkin emas. Fuqaro `/holat` yoki botda «Hal bo'ldimi?» ga javob beradi: «Ha» → yopiladi, «Yo'q» → murojaat `in_progress` ga qayta ochiladi (`reopened`).
7. **Monitoring.** SLA muddatining 75% da ogohlantirish, o'tsa eskalatsiya (bo'lim → 24 soatdan keyin admin). Admin bosh ekrani — operatsion navbat kartalari ([10](10-ui-ux.md) §10). Hamma o'tishlar `complaint_events` da.

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
