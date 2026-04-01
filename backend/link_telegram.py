"""Одноразовый скрипт: привязать telegram_id к owner-аккаунту."""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import async_session
from app.models.user import User
from sqlalchemy import select, update


async def link():
    async with async_session() as db:
        # Находим owner-аккаунт
        result = await db.execute(
            select(User).where(User.email == "gysy545@gmail.com")
        )
        user = result.scalar_one_or_none()

        if not user:
            print("Аккаунт gysy545@gmail.com не найден!")
            return

        if user.telegram_id == 1558594007:
            print(f"Telegram ID уже привязан: {user.telegram_id}")
            return

        # Удаляем дубль (если /start уже создал аккаунт с этим telegram_id)
        dup_result = await db.execute(
            select(User).where(User.telegram_id == 1558594007)
        )
        dup = dup_result.scalar_one_or_none()
        if dup and dup.id != user.id:
            await db.delete(dup)
            print(f"Удалён дубль: User #{dup.id} (telegram_id=1558594007)")

        # Привязываем telegram_id к owner
        user.telegram_id = 1558594007
        await db.commit()
        print(f"Telegram ID 1558594007 привязан к {user.email} (role={user.role})")


if __name__ == "__main__":
    asyncio.run(link())
