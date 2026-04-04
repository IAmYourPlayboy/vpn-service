"""Быстрая проверка всех записей в БД на VDS."""
import asyncio
from sqlalchemy import text, select
from app.database import async_session, engine
from app.models import *


async def main():
    async with async_session() as session:
        # Время контейнера
        result = await session.execute(text("SELECT datetime(CURRENT_TIMESTAMP, 'localtime') as local_now, datetime(CURRENT_TIMESTAMP) as utc_now"))
        row = result.first()
        print(f"Container time => local={row.local_now} | utc={row.utc_now}")
        print()

        # Серверы
        result = await session.execute(select(Server))
        print("=== SERVERS ===")
        for srv in result.scalars():
            print(f"  id={srv.id} name={srv.name} check={srv.last_checked_at}")
        print()

        # Пользователи
        result = await session.execute(select(User).order_by(User.id))
        print("=== USERS ===")
        for u in result.scalars():
            print(f"  id={u.id} email={u.email} nick={u.nickname} role={u.role} created={u.created_at} last_login={u.last_login}")
        print()

        # Подписки
        result = await session.execute(select(Subscription).join(Plan).join(User).order_by(Subscription.id))
        print("=== SUBSCRIPTIONS ===")
        for sub in result.scalars():
            print(f"  id={sub.id} user={sub.user_id}({sub.user.email}) plan={sub.plan_id}({sub.plan.name}) marzban={sub.marzban_username} status={sub.status} started={sub.started_at} expires={sub.expires_at}")
        print()

        # Платежи
        result = await session.execute(select(Payment).order_by(Payment.id))
        print("=== PAYMENTS ===")
        for p in result.scalars():
            print(f"  id={p.id} user={p.user_id} status={p.status} amount={p.amount} created={p.created_at}")

        # Планы
        result = await session.execute(select(Plan).order_by(Plan.id))
        print()
        print("=== PLANS ===")
        for pl in result.scalars():
            print(f"  id={pl.id} name={pl.name} price={pl.price} days={pl.duration_days} active={pl.is_active}")


asyncio.run(main())
