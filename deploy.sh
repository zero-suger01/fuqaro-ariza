#!/usr/bin/env bash
# Prod deploy — docs/11-devops.md D7 / docs/12-deploy-contabo.md.
# Serverda repo ichida ishga tushiriladi: `./deploy.sh`.
# Birinchi marta ishlatishdan oldin docs/12-deploy-contabo.md §1-4 ni
# QO'LDA bajarish kerak (docker o'rnatish, .env fayllar, GigaAM model,
# certbot bootstrap) — bu skript faqat KEYINGI deploylar uchun.
set -euo pipefail

cd "$(dirname "$0")"

echo "==> git pull"
git pull origin main

echo "==> build + up"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> alembic upgrade head"
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

echo "==> tayyor. Log: docker compose -f docker-compose.prod.yml logs -f backend worker"
