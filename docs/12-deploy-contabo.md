# 12 — Contabo serverga deploy (birinchi marta)

Domen: `ariza.xronuz.uz` (DNS A-yozuvi shu serverning IP'siga ishora qilishi SHART — certbot buni tekshiradi). Xizmatlar: nginx (80/443, yagona tashqi ochiq port), frontend, backend, worker, redis, postgres, minio, certbot. Ollama/bot bu bosqichda YO'Q ([11](11-devops.md) D2-D4 asosida qurilgan, `LLM_PROVIDER=deepseek` bilan).

## 0. Server talabi

`docs/11-devops.md §3`: DeepSeek API ishlatilgani uchun lokal LLM uchun katta RAM shart emas — minimal 2 vCPU / 4GB RAM ham yetadi (Ollama bo'lmagani uchun). Ubuntu 22.04+ tavsiya etiladi.

## 1. Server tayyorlash

```bash
ssh root@<server-ip>

apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y git

# Domenni shu serverga yo'naltirish — DNS panelda A-yozuv:
#   ariza.xronuz.uz -> <server-ip>
# Tarqalishini tekshirish: dig +short ariza.xronuz.uz
```

## 2. Repo va sirlar

```bash
git clone https://github.com/zero-suger01/fuqaro-ariza.git
cd fuqaro-ariza

cp .env.prod.example .env
nano .env   # POSTGRES_*, MINIO_* — tasodifiy 32+ belgili parollar (docs/11 §4)

cp backend/.env.example backend/.env
nano backend/.env
```

`backend/.env`da **prod uchun** quyidagilar dev qiymatidan farq qiladi (konteynerlar bir-biriga service nomi bilan ulanadi, `localhost` EMAS):

```bash
DATABASE_URL=postgresql+psycopg://ariza:<.env dagi POSTGRES_PASSWORD>@postgres:5432/ariza
TEST_DATABASE_URL=  # prod serverda testlar yurgizilmaydi, bo'sh qoldirsa ham bo'ladi
REDIS_URL=redis://redis:6379/0

S3_ENDPOINT_URL=http://minio:9000
S3_ACCESS_KEY=ariza
S3_SECRET_KEY=<.env dagi MINIO_ROOT_PASSWORD>
S3_PUBLIC_BASE_URL=https://ariza.xronuz.uz/storage/ariza-complaints

CORS_ORIGINS=["https://ariza.xronuz.uz"]
PUBLIC_BASE_URL=https://ariza.xronuz.uz

JWT_SECRET=<tasodifiy 32+ belgi>
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=<haqiqiy kalit>
TURNSTILE_SECRET_KEY=<bo'lsa>

ADMIN_SEED_PHONE=+998XXXXXXXXX
ADMIN_SEED_PASSWORD=<kuchli, admin123 EMAS>
```

`docs/11-devops.md §1.2` — productionga chiqishdan oldingi checklist shu yerda ham amal qiladi (demo seed yo'q, `DATABASE_URL` ≠ `TEST_DATABASE_URL`, va h.k.).

## 3. GigaAM ASR modeli

Model repo'da YO'Q (~590MB, GitHub 100MB limitidan katta — `backend/.gitignore`da). Lokal mashinadan serverga to'g'ridan-to'g'ri nusxalanadi:

```bash
# LOKAL mashinada:
rsync -avz --progress backend/models/gigaam/ root@<server-ip>:/root/fuqaro-ariza/backend/models/gigaam/
```

`backend/.env`da `GIGAAM_MODEL_DIR=/app/models/gigaam` (konteyner ichidagi yo'l — `docker-compose.prod.yml` `./backend/models` ni shu yerga volume qiladi, .env'ga qo'shishni unutma).

## 4. Birinchi ishga tushirish (certbot bootstrap)

SSL sertifikat hali yo'q — `app.conf` shu holatda ishlamaydi (`ssl_certificate` fayli topilmaydi). Avval vaqtinchalik HTTP-only konfiguratsiya bilan sertifikat olinadi:

```bash
mv nginx/conf.d/app.conf nginx/conf.d/app.conf.disabled
mv nginx/conf.d/bootstrap.conf.disabled nginx/conf.d/bootstrap.conf

docker compose -f docker-compose.prod.yml up -d nginx

docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d ariza.xronuz.uz \
  --email <sizning-emailingiz> --agree-tos --no-eff-email

mv nginx/conf.d/bootstrap.conf nginx/conf.d/bootstrap.conf.disabled
mv nginx/conf.d/app.conf.disabled nginx/conf.d/app.conf
```

## 5. To'liq ishga tushirish

```bash
docker compose -f docker-compose.prod.yml up -d --build

docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
docker compose -f docker-compose.prod.yml exec backend python -m app.seed
```

`python -m app.seed` — **`--demo` bayrog'isiz** (bu image ichida standart). `ADMIN_SEED_PHONE`/`ADMIN_SEED_PASSWORD` `backend/.env`da to'g'ri bo'lsa, admin shu qadamda yaratiladi.

## 6. Tekshirish

```bash
curl https://ariza.xronuz.uz/api/health
# Brauzerda: https://ariza.xronuz.uz — fuqaro sahifasi
# https://ariza.xronuz.uz/admin — admin login (ADMIN_SEED_PHONE bilan)
docker compose -f docker-compose.prod.yml logs -f backend worker
```

`docs/11-devops.md §5` — smoke test: murojaat yuborish (test telefon bilan) → track → admin → SMS keldi mi.

## 7. Keyingi deploylar

Bootstrap (1-6 qadam) faqat BIR MARTA. Keyingi har bir yangilanish:

```bash
./deploy.sh
```

(`git pull && docker compose -f docker-compose.prod.yml up -d --build && alembic upgrade head` — [11](11-devops.md) D7).

## Hali qilinmagan (keyingi bosqich)

- **D5** — GitHub Actions CI (backend `ruff + pytest -m smoke`, frontend `lint + build`).
- **D6** — Backup: kunlik `pg_dump` + MinIO rsync, 14 kun saqlash, tiklash skripti sinovdan o'tgan bo'lishi SHART.
- **D8** — Monitoring-lite: UptimeRobot/cron+curl `/api/health`, docker log rotation.
- Telegram bot (`bot/Dockerfile`, T3.3) — hozircha shu deployga kiritilmagan, mijoz so'ragan.
