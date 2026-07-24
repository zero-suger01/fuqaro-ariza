# 11 — DevOps: lokal muhit, server, deploy

Egasi: backend sherik (D-tasklar), lekin ikkovlon ham lokal muhitni ko'tara olishi shart.

## 1. Lokal dev (hozir ham ishlaydi)

```bash
docker compose up -d          # postgres:5433, minio:9000/9001, redis:6379
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt   # macOS: `brew install libmagic ffmpeg` ham kerak (fayl validatsiya + STT)
alembic upgrade head && python -m app.seed
uvicorn app.main:app --reload --port 8000
# alohida terminal — AI klassifikatsiya (worker), STT va kunlik keyword-mining shu orqali ishlaydi:
arq app.worker.WorkerSettings
cd frontend && npm install && npm run dev     # :3000
# ixtiyoriy lokal AI: ollama pull gemma3:4b && ollama serve (bo'lmasa ham ishlaydi — graceful fallback)
# STT: birinchi so'rovda faster-whisper modelini (STT_WHISPER_MODEL, standart "medium") Hugging Face'dan avtomatik yuklab oladi
```

`.env` namunalari: `backend/.env.example` (yangi kalitlar [03-kontraktlar.md](03-kontraktlar.md) §9 bo'yicha to'ldirib boriladi), `frontend/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:8000`.

**Lokal port to'qnashuvlari (bu mashinada aniqlangan, boshqa devlarda ham uchrashi mumkin):**
- `localhost:8000` — muallif dev mashinasida `xavfsiz-backend` nomli aloqasiz Docker konteyner ham shu portni tinglaydi (IPv6 orqali). Har doim `127.0.0.1:8000` (aniq IPv4) ishlatilsin, `localhost:8000` emas.
- `localhost:6379` — Homebrew orqali o'rnatilgan **native `redis-server`** (`/usr/local/opt/redis`) `docker-compose`dagi Redis konteyneridan mustaqil ravishda ham shu portni band qilishi mumkin (ikkalasi ham `127.0.0.1:6379`da). Ilova host mashinada (Docker'siz, `uvicorn ... --reload`) ishga tushirilsa, qaysi biriga ulanishi aniq emas — agar noto'g'risiga ulansa, rate limit (`app/core/ratelimit.py`) va ARQ navbat (`enqueue()`) sukut bo'yicha ishlagandek ko'rinadi-yu, aslida boshqa (bo'sh yoki eskirgan) Redis'ga yozib, hech kim iste'mol qilmaydi. Belgisi: `docker compose exec redis redis-cli KEYS "rl:*"` bo'sh qaytadi, lekin `redis-cli -h localhost -p 6379 KEYS "rl:*"` (Docker tashqarisidan) ma'lumot ko'rsatadi. Hal qilish: `brew services stop redis` (agar kerak bo'lmasa) yoki `docker-compose.yml`da Redis portini masalan `6380:6379`ga o'zgartirib, `REDIS_URL`ni mos ravishda yangilash.
- **`OLLAMA_MODEL` mahalliy Ollama'da pull qilingan modelga aynan mos kelishi kerak.** Kod standarti (`app/config.py`) `gemma3:12b`, lekin ba'zi mashinalarda faqat boshqa nom/versiya (masalan `gemma4:12b`) pull qilingan bo'lishi mumkin — mos kelmasa, Ollama har safar "model not found" bilan javob beradi, `classify_with_llm` `LlmError` ko'taradi (`app/services/ai/llm.py`), va bu **jimgina** yutiladi: `needs_review=True` bo'lib qoladi, murojaat B6 avto-routing'idan o'tmaydi, admin navbatida "tekshiruv kerak" bo'lib qolaveradi — hech qanday xato logga chiqmaydi (bu graceful-degradation ataylab shunday, LLM'siz ham tizim ishlashi kerak). Tekshirish: `ollama list` bilan haqiqiy pull qilingan model nomini solishtirib, `backend/.env`da `OLLAMA_MODEL=<haqiqiy nom>` bilan ustunlik berish. Shuningdek 12B modelning CPU'da javob berishi mashinaning boshqa yuklamasiga (video qo'ng'iroq, ko'p tab) juda sezgir — yuklama baland bo'lsa oddiy so'rov ham daqiqalab cho'zilishi mumkin (docs/07-ai-layer.md §"Model tanlash"dagi 30-90s taxmin bo'sh CPU uchun).

## 2. D-tasklar

- [x] **D1 (S)** compose'ga `redis` qo'shildi (B1.7 bilan birga), `redis:7-alpine`, healthcheck bilan.
- [ ] **D2 (M)** Dockerfile'lar: `backend/Dockerfile` (uvicorn, non-root, ffmpeg o'rnatilgan), worker (xuddi shu image, boshqa command), `frontend/Dockerfile` (multi-stage, `output: "standalone"`), keyin `bot/Dockerfile` (T3.3).
- [ ] **D3 (M)** `docker-compose.prod.yml`: nginx + frontend + backend + worker + redis + postgres + minio + ollama (+ bot). Volume'lar, healthcheck'lar, `restart: unless-stopped`, ichki tarmoq (faqat nginx 80/443 ochiq).
- [ ] **D4 (S)** nginx konfig: `/` → frontend, `/api` → backend, `/storage` → minio (read-only proxy — bucket'ni internetga to'g'ridan ochmaslik), client_max_body_size 60m, gzip. HTTPS: certbot yoki Cloudflare tunnel.
- [ ] **D5 (S)** GitHub Actions CI: har PR'da — backend `ruff + pytest -m smoke` (Postgres service bilan), frontend `lint + build`. `main` yashil bo'lmasa merge yo'q.
- [ ] **D6 (S)** Backup: kunlik `pg_dump` + MinIO papka rsync → alohida disk/obyekt; 14 kun saqlash; tiklash skripti sinovdan o'tgan bo'lishi SHART.
- [ ] **D7 (S)** Deploy skripti (`deploy.sh`): `git pull && docker compose -f docker-compose.prod.yml up -d --build && docker compose exec backend alembic upgrade head`. Log ko'rish: `docker compose logs -f backend worker`.
- [ ] **D8 (S)** Monitoring-lite: UptimeRobot (yoki cron+curl) `/api/health`; docker log rotation; `docker stats` uchun eslatma. (To'liq Grafana V2.)

## 3. Server talablari (pilot, 1 tuman)

| Konfiguratsiya | Nima uchun yetadi |
|---|---|
| **Minimal:** 4 vCPU, 16 GB RAM, 100 GB SSD | gemma3:4b (CPU) + whisper medium + qolgan stack. LLM javobi sekinroq (async bo'lgani uchun OK) |
| **Tavsiya:** 8 vCPU, 32 GB RAM, 200 GB SSD | gemma3:12b (CPU, q4) sig'adi; STT tezroq |
| GPU (12+ GB VRAM) bo'lsa | LLM 2–5 s; shart emas, bo'lsa yaxshi |

Ollama va whisper modellarni birinchi ishga tushishda yuklab oladi — serverda internetli birinchi start kerak (yoki modelni oldindan volume'ga qo'yish).

## 4. Muhit va sirlar

- Prod sirlar faqat serverdagi `.env` fayllarda (git'da YO'Q); `docs/`da faqat kalit NOMLARI ([03](03-kontraktlar.md) §9).
- `JWT_SECRET`, DB parol, MinIO kalitlar prod'da random 32+ belgi.
- Eskiz/mohir.ai/bot tokenlar olingach `.env.example` ga IZOH sifatida (qiymatsiz) qo'shiladi.

## 5. Chiqarish tartibi (release)

1. `main` yashil (CI) + checkpoint checklist o'tgan.
2. `deploy.sh` server'da; migratsiya avtomatik; seed FAQAT birinchi marta qo'lda.
3. Smoke test prod'da: murojaat yuborish (test telefon bilan) → track → admin → SMS keldi mi.
4. Muammo bo'lsa: oldingi image tag'ga qaytish (`docker compose up -d backend:prev`), DB migratsiyasi orqaga qaytarilmaydi — shuning uchun migratsiyalar faqat additiv uslubda yoziladi (ustun DROP alohida releasega qoldiriladi).
