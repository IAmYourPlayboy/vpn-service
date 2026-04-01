#!/bin/bash
# Деплой Andigo VPN-сервиса на VDS
# Запуск: bash /opt/vpn/deploy/scripts/deploy.sh
# Код обновляется через scp/tar с локальной машины (git на VDS не используется)

set -e

DEPLOY_DIR="/opt/vpn/deploy"

echo "=== Деплой Andigo ==="

cd "$DEPLOY_DIR"

# Пересобираем контейнеры
echo ">>> Сборка контейнеров..."
docker compose build --no-cache frontend backend

# Пересоздаём frontend + nginx (чтобы свежая сборка попала в volume)
echo ">>> Перезапуск..."
docker compose up -d --force-recreate frontend
docker compose up -d --force-recreate nginx backend

# Применяем миграции БД (после старта backend)
echo ">>> Миграции БД..."
sleep 3
docker compose exec -e PYTHONPATH=/app backend alembic upgrade head

# Проверяем
echo ">>> Статус контейнеров:"
docker compose ps

echo ""
echo "=== Деплой завершён ==="
