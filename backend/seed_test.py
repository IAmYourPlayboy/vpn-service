"""Seed: добавить Париж в servers + создать 3 тестовые подписки через Marzban."""
import asyncio
import logging
import traceback
from datetime import datetime, timedelta, timezone
from sqlalchemy import select

from app.config import settings
from app.database import async_session
from app.models.user import User
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.server import Server
from app.services.marzban import marzban_client

MOSCOW_TZ = timezone(timedelta(hours=3))


async def main():
    async with async_session() as db:
        # --- 1. Добавить Париж в servers ---
        result = await db.execute(
            select(Server).where(Server.host == "109.120.179.67")
        )
        existing = result.scalar_one_or_none()
        if not existing:
            server = Server(
                name="Париж #1",
                country="France",
                country_code="FR",
                host="109.120.179.67",
                is_active=True,
            )
            db.add(server)
            await db.commit()
            print("Париж добавлен: id=%s" % server.id)
        else:
            print("Париж уже в servers: id=%s" % existing.id)

        # --- 2. Тариф ---
        result = await db.execute(
            select(Plan).where(Plan.is_active == True).order_by(Plan.id).limit(1)
        )
        plan = result.scalar_one_or_none()
        if not plan:
            print("Нет активных тарифов!")
            return
        print("Тариф: %s (%s руб, %s дней)" % (plan.name, plan.price, plan.duration_days))

        # --- 3. Юзеры без подписок ---
        result = await db.execute(select(Subscription).where(Subscription.status == "active"))
        active_user_ids = {s.user_id for s in result.scalars()}

        result = await db.execute(
            select(User).where(User.is_active == True).order_by(User.id)
        )
        candidates = [u for u in result.scalars() if u.id not in active_user_ids]
        test_users = candidates[:3]

        if not test_users:
            print("Все юзеры уже имеют подписки!")
            return

        print("\nСоздаю подписки для %s юзеров:" % len(test_users))

        for user in test_users:
            display = user.nickname or user.email or ("#" + str(user.id))
            print("\n  Юзер: %s (id=%s)" % (display, user.id))

            try:
                mzu = "test_%s_andigo" % user.id
                existing_m = await marzban_client.get_user(mzu)
                if existing_m:
                    print("    Marzban юзер уже есть")
                else:
                    await marzban_client.create_user(mzu)
                    print("    Marzban юзер создан: %s" % mzu)

                now = datetime.now(MOSCOW_TZ)
                sub = Subscription(
                    user_id=user.id,
                    plan_id=plan.id,
                    marzban_username=mzu,
                    status="active",
                    started_at=now,
                    expires_at=now + timedelta(days=plan.duration_days),
                    auto_renew=True,
                )
                db.add(sub)
                await db.commit()

                link = await marzban_client.get_subscription_link(mzu)
                print("    Подписка: id=%s | expires=%s" % (sub.id, sub.expires_at))
                print("    Ссылка: %s" % link)

            except Exception as exc:
                print("    ОШИБКА: %s" % exc)
                traceback.print_exc()

    print("\nГотово!")


if __name__ == "__main__":
    asyncio.run(main())
