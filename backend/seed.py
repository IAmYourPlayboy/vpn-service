"""Скрипт для заполнения БД начальными данными."""

import asyncio
import sys
import os

# Добавляем текущую директорию в PYTHONPATH
sys.path.insert(0, os.path.dirname(__file__))

from app.database import async_session
from app.models.plan import Plan
from app.models.server import Server
from app.models.user import User
from app.services.auth import hash_password

from sqlalchemy import select


async def seed():
    async with async_session() as db:
        # Проверяем, есть ли уже данные
        existing_plans = (await db.execute(select(Plan))).scalars().all()
        if existing_plans:
            print("Данные уже существуют, пропускаем seed.")
            return

        # Тариф "Стандарт"
        plan = Plan(
            name="Стандарт",
            price=249.00,
            duration_days=30,
            is_active=True,
        )
        db.add(plan)

        # Тестовый сервер
        server = Server(
            name="Нидерланды #1",
            country="Netherlands",
            country_code="NL",
            host="37.230.115.104",
            is_active=True,
            current_load=0,
            ping_status="offline",
        )
        db.add(server)

        # Владелец (owner)
        admin = User(
            email="gysy545@gmail.com",
            telegram_id=1558594007,
            password_hash=hash_password("admin123"),
            is_active=True,
            role="owner",
        )
        db.add(admin)

        await db.commit()
        print("Seed-данные добавлены:")
        print(f"  - Тариф: {plan.name} ({plan.price} руб/{plan.duration_days} дней)")
        print(f"  - Сервер: {server.name} ({server.country})")
        print(f"  - Админ: {admin.email}")


if __name__ == "__main__":
    asyncio.run(seed())
