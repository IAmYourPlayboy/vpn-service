"""Seed-скрипт: добавить Париж в servers + создать 3 тестовые подписки с VPN-ключами через Marzban."""
import asyncio
import logging
from datetime import timedelta

from app.config import settings
from app.database import engine, async_session
from app.models import *
from app.services.marzban import marzban_client, create_marzban_user
from app.models.user import User

# Moscow time
from datetime import datetime, timedelta, timezone
MOSCOW_TZ = timezone(timedelta(hours=3))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_data():
    """Добавить Париж в servers + создать 3 тестовые подписки."""
    async with async_session() as db:
        # 1. Проверить/добавить Париж в servers
        result = await db.execute(select(Server).where(Server.country_code == "FR"))
        france_servers = result.scalars().all()
        if not france_servers:
            print("Добавляю Париж в servers...")
            server = Server(
                name="Париж #1",
                country="France",
                country_code="FR",
                host="109.120.179.67",
                is_active=True,
            )
            db.add(server)
            await db.flush()
            print(f"  Париж добавлен: id={server.id}")
        else:
            print(f"  Париж уже в servers: {france_servers[0].id}")

        # 2. Берём план "Стандарт"
        result = await db.execute(select(Plan).where(Plan.is_active == True).order_by(Plan.id).limit(1))
        plan = result.scalar_one_or_none()
        if not plan:
            print("Ошибка: нет активных тарифов!")
            return
        print(f"  Тариф: {plan.name} ({plan.price}₽, {plan.duration_days} дней)")

        # 3. Берём 3 юзеров без активной подписки
        # Ищем юзеров у которых НЕТ активной подписки
        result = await db.execute(select(Subscription).where(Subscription.status == "active"))
        active_user_ids = {s.user_id for s in result.scalars()}

        result = await db.execute(
            select(User)
            .where(User.is_active == True)
            .order_by(User.id)
            .limit(10)
        )
        candidates = [u for u in result.scalars() if u.id not in active_user_ids]

        # Берём первых 3 (или сколько есть)
        test_users = candidates[:3]

        if not test_users:
            print("Все юзеры уже имеют подписки!")
            return

        print(f"\nСоздаю подписки для {len(test_users)} юзеров:")

        for user in test_users:
            display = user.nickname or user.email or f"#{user.id}"
            print(f"\n  Юзер: {display} (id={user.id})")

            try:
                # 1. Создаём VPN-пользователя в Marzban
                marzban_username = f"test_{user.id}_andigo"
                # Проверяем не существует ли уже
                existing = await marzban_client.get_user(marzban_username)
                if existing:
                    print(f"    Marzban юзер уже существует")
                else:
                    await marzban_client.create_user(marzban_username)
                    print(f"    Marzban юзер создан: {marzban_username}")

                # 2. Создаём запись подписки в нашей БД
                now = datetime.now(MOSCOW_TZ)
                subscription = Subscription(
                    user_id=user.id,
                    plan_id=plan.id,
                    marzban_username=marzban_username,
                    status="active",
                    started_at=now,
                    expires_at=now + timedelta(days=plan.duration_days),
                    auto_renew=True,
                )
                db.add(subscription)
                await db.flush()

                # 3. Получаем subscription link
                sub_link = await marzban_client.get_subscription_link(marzban_username)

                print(f"    Подписка создана: id={subscription.id}")
                print(f"    Marzban: {marzban_username}")
                print(f"    Действует до: {subscription.expires_at}")
                print(f"    Ссылка: {sub_link}")

            except Exception as e:
                print(f"    ОШИБКА: {e}")

        await db.commit()
        print("\n=== Готово! ===")


if __name__ == "__main__":
    asyncio.run(seed_data())
