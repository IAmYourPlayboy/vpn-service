#!/bin/bash
# Деплой изменений на VDS: timezone fix + Paris + marzban fixes + frontend/admin
set -e

VDS="root@37.230.115.104"
BASE="/d/Projects/vpn"

echo "=== 1. Backend: app/ (models, services, api, bot utils) ==="
tar czf /tmp/vpn_backend.tar.gz \
  --exclude=venv --exclude=__pycache__ --exclude=.env --exclude=.db --exclude=node_modules \
  -C "$BASE" backend/app/ backend/alembic/ backend/requirements.txt backend/Dockerfile backend/seed_test.py

scp /tmp/vpn_backend.tar.gz $VDS:/tmp/
ssh $VDS 'cd /opt/vpn && tar xpf /tmp/vpn_backend.tar.gz'

echo "=== 2. Frontend: src/ ==="
tar czf /tmp/vpn_frontend.tar.gz -C "$BASE" frontend/src/
scp /tmp/vpn_frontend.tar.gz $VDS:/tmp/
ssh $VDS 'cd /opt/vpn && tar xpf /tmp/vpn_frontend.tar.gz'

echo "=== 3. Deploy: docker-compose + nginx ==="
tar czf /tmp/vpn_deploy.tar.gz -C "$BASE" deploy/docker-compose.yml deploy/nginx/default.conf deploy/marzban.env deploy/.env
scp /tmp/vpn_deploy.tar.gz $VDS:/tmp/
ssh $VDS 'cd /opt/vpn && tar xpf /tmp/vpn_deploy.tar.gz'

echo "=== 4. Build backend (с timezone fix) ==="
ssh $VDS 'cd /opt/vpn/deploy && docker compose build backend'

echo "=== 5. Запуск backend + миграции ==="
ssh $VDS 'cd /opt/vpn/deploy && docker compose up -d'
sleep 5

ssh $VDS 'cd /opt/vpn/deploy && docker compose exec backend bash -c "PYTHONPATH=. PYTHONIOENCODING=utf-8 cd /app && alembic upgrade head"'

echo "=== 6. Проверка контейнеров ==="
ssh $VDS 'cd /opt/vpn/deploy && docker compose ps'

echo "=== 7. Проверка Marzban connection ==="
ssh $VDS 'cd /opt/vpn/deploy && docker compose exec backend bash -c "
PYTHONPATH=. PYTHONIOENCODING=utf-8 python3 -c \"
from app.services.marzban import marzban_client
import asyncio
async def check():
    user = await marzban_client.get_user(\"test_1_andigo\")
    if user:
        print(\"Marzban connection OK, user:\", user[\"username\"], \"status:\", user[\"status\"])
    else:
        print(\"ERROR: Marzban connection failed\")
asyncio.run(check())
\""'

echo "=== 8. Проверка timezone ==="
ssh $VDS 'cd /opt/vpn/deploy && docker compose exec backend bash -c "
PYTHONPATH=. PYTHONIOENCODING=utf-8 python3 -c \"
from app.database import async_session
from app.models.user import User
from sqlalchemy import select
import asyncio
async def check():
    async with async_session() as db:
        result = await db.execute(select(User).order_by(User.id).limit(3))
        for u in result.scalars():
            print(f\"User {u.id}: created_at={u.created_at}\")
asyncio.run(check())
\""'

echo "=== 9. Создание 3 тестовых подписок (seed_test.py) ==="
ssh $VDS 'cd /opt/vpn/deploy && docker compose exec backend bash -c "
PYTHONPATH=. PYTHONIOENCODING=utf-8 cd /app && python3 /app/seed_test.py
"'

echo "=== Готово! ==="
