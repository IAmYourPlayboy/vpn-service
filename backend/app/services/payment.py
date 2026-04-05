"""Сервис платежей — мультигейт обёртка над провайдерами."""

import logging
import uuid
from typing import Any

from app.services.payment_providers import get_provider

logger = logging.getLogger(__name__)


async def create_and_save_payment(
    user_id: int,
    plan_id: int,
    plan_price: float,
    provider_name: str,
    domain: str,
    user_email: str | None = None,
    db=None,
) -> dict[str, Any]:
    """Создать платёж через выбранный провайдер и сохранить в БД.

    Это основная функция создания платежа. Она:
    1. Получает провайдер по имени
    2. Вызывает create_payment у провайдера
    3. Сохраняет платёж в БД
    4. Возвращает данные для фронтенда
    """
    from datetime import datetime, timezone, timedelta
    from app.models.payment import Payment

    provider = get_provider(provider_name)

    # order_id содержит user_id и plan_id для надёжной связи в webhook
    order_id = f"pay:{user_id}:{plan_id}:{uuid.uuid4().hex[:8]}"

    return_url = f"https://{domain}/dashboard?payment=success&provider={provider_name}"
    webhook_url = f"https://{domain}/api/payments/webhook/{provider_name}"

    metadata = {
        "user_id": str(user_id),
        "plan_id": str(plan_id),
        "email": user_email,
    }

    payment_data = await provider.create_payment(
        amount=plan_price,
        order_id=order_id,
        return_url=return_url,
        webhook_url=webhook_url,
        metadata=metadata,
    )

    # Сохраняем в БД
    payment = Payment(
        user_id=user_id,
        provider=provider_name,
        provider_payment_id=payment_data.get("provider_payment_id"),
        amount=plan_price,
        currency="RUB",
        status="pending",
    )
    db.add(payment)
    await db.flush()

    return {
        "id": payment.id,
        "amount": plan_price,
        "currency": "RUB",
        "provider": provider_name,
        "status": "pending",
        "created_at": payment.created_at,
        "confirmation_url": payment_data.get("confirmation_url"),
    }
