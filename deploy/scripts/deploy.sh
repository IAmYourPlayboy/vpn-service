#!/bin/bash
# Деплой Andigo VPN-сервиса на VDS
# Запуск: bash /opt/vpn/deploy/scripts/deploy.sh
# Код обновляется через scp/tar с локальной машины (git на VDS не используется)

set -e

DEPLOY_DIR="/opt/vpn/deploy"

echo "=== Деплой Andigo ==="

cd "$DEPLOY_DIR"

# Бэкап БД — ОБЯЗАТЕЛЬНО первый шаг
echo ">>> Бэкап БД..."
mkdir -p /opt/vpn/backups/db
BACKUP_NAME="vpn-db-$(date +%Y%m%d-%H%M%S).db"
docker compose cp -L backend:/app/data/vpn.db "/tmp/$BACKUP_NAME" 2>/dev/null || true
if [ -f "/tmp/$BACKUP_NAME" ]; then
    cp "/tmp/$BACKUP_NAME" "/opt/vpn/backups/db/"
    rm "/tmp/$BACKUP_NAME"
    echo "    Бэкап: /opt/vpn/backups/db/$BACKUP_NAME"
    # Оставляем только 10 последних бэкапов
    ls -t /opt/vpn/backups/db/*.db 2>/dev/null | tail -n +11 | xargs -r rm -f
    echo "    Старые бэкапы удалены"
else
    echo "    ПРЕДУПРЕЖДЕНИЕ: не удалось скопировать БД из контейнера, бэкап пропущен"
fi

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
