# 11 — DevOps: lokal muhit, server, deploy

Egasi: backend sherik (D-tasklar), lekin ikkovlon ham lokal muhitni ko'tara olishi shart.

## 1. Lokal dev (hozir ham ishlaydi)

```bash
docker compose up -d          # postgres:5433, minio:9000/9001, redis:6379
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt   # macOS: python-magic uchun `brew install libmagic` ham kerak
alembic upgrade head && python -m app.seed
uvicorn app.main:app --reload --port 8000
# alohida terminal — AI klassifikatsiya (B1.7 dan) shu worker orqali ishlaydi:
arq app.worker.WorkerSettings
cd frontend && npm install && npm run dev     # :3000
# ixtiyoriy lokal AI (B2+): ollama pull gemma3:4b && ollama serve
```

`.env` namunalari: `backend/.env.example` (yangi kalitlar [03-kontraktlar.md](03-kontraktlar.md) §9 bo'yicha to'ldirib boriladi), `frontend/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:8000`.

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
