#!/bin/bash
# Обновление VPN-сервиса на VDS
# Запускать: bash deploy.sh

set -e

DEPLOY_DIR="/opt/vpn/deploy"

echo "=== Деплой VPN-сервиса ==="

cd /opt/vpn

# Подтягиваем изменения
echo ">>> Git pull..."
git pull origin main

# Пересобираем контейнеры
echo ">>> Сборка контейнеров..."
cd "$DEPLOY_DIR"
docker compose build

# Перезапускаем
echo ">>> Перезапуск..."
docker compose up -d

# Проверяем
echo ">>> Статус контейнеров:"
docker compose ps

echo ""
echo "=== Деплой завершён ==="
