"""Сервис управления подписками."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.marzban import create_marzban_user
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User
from app.services.marzban import marzban_client

logger = logging.getLogger(__name__)


async def activate_subscription(
    user_id: int,
    plan_id: int,
    payment_id: int,
    db: AsyncSession,
) -> Subscription:
    """Активировать подписку после успешной оплаты.

    1. Создаёт VPN-пользователя в Marzban
    2. Создаёт запись подписки в нашей БД
    3. Связывает платёж с подпиской
    """
    # Получаем план
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise ValueError(f"План {plan_id} не найден")

    # Проверяем: есть ли уже активная подписка?
    existing = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status == "active",
        )
    )
    active_sub = existing.scalar_one_or_none()

    if active_sub:
        # Продлеваем существующую подписку
        active_sub.expires_at += timedelta(days=plan.duration_days)
        await marzban_client.enable_user(active_sub.marzban_username)
        logger.info(f"Подписка {active_sub.id} продлена до {active_sub.expires_at}")

        # Связываем платёж
        payment_result = await db.execute(select(Payment).where(Payment.id == payment_id))
        payment = payment_result.scalar_one_or_none()
        if payment:
            payment.subscription_id = active_sub.id

        return active_sub

    # Создаём нового VPN-пользователя в Marzban
    marzban_username = await create_marzban_user(user_id)

    now = datetime.now(timezone.utc)
    subscription = Subscription(
        user_id=user_id,
        plan_id=plan_id,
        marzban_username=marzban_username,
        status="active",
        started_at=now,
        expires_at=now + timedelta(days=plan.duration_days),
    )
    db.add(subscription)
    await db.flush()

    # Связываем платёж с подпиской
    payment_result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = payment_result.scalar_one_or_none()
    if payment:
        payment.subscription_id = subscription.id

    logger.info(f"Подписка {subscription.id} активирована для user {user_id}")
    return subscription


async def check_expired_subscriptions(db: AsyncSession) -> int:
    """Проверить и деактивировать истекшие подписки.

    Вызывается по cron каждый час.
    Returns: количество деактивированных подписок.
    """
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Subscription).where(
            Subscription.status == "active",
            Subscription.expires_at < now,
        )
    )
    expired = result.scalars().all()

    count = 0
    for sub in expired:
        sub.status = "expired"
        await marzban_client.disable_user(sub.marzban_username)
        count += 1
        logger.info(f"Подписка {sub.id} истекла, пользователь {sub.marzban_username} отключён")

    return count


async def get_expiring_subscriptions(db: AsyncSession, days: int = 3) -> list[Subscription]:
    """Найти подписки, истекающие в ближайшие N дней (для уведомлений)."""
    now = datetime.now(timezone.utc)
    threshold = now + timedelta(days=days)

    result = await db.execute(
        select(Subscription).where(
            Subscription.status == "active",
            Subscription.expires_at <= threshold,
            Subscription.expires_at > now,
        )
    )
    return list(result.scalars().all())
