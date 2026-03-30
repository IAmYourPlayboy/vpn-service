"""Сервис платежей — интеграция с ЮКасса."""

import logging
import uuid

from yookassa import Configuration, Payment

from app.config import settings

logger = logging.getLogger(__name__)

# Инициализация ЮКасса SDK
Configuration.account_id = settings.yokassa_shop_id
Configuration.secret_key = settings.yokassa_secret_key


def create_yokassa_payment(
    amount: float,
    description: str,
    return_url: str,
    metadata: dict | None = None,
) -> dict:
    """Создать платёж в ЮКасса.

    Args:
        amount: Сумма в рублях
        description: Описание платежа
        return_url: URL для возврата после оплаты
        metadata: Метаданные (user_id, plan_id и т.д.)

    Returns:
        Данные платежа (id, confirmation_url, status)
    """
    payment = Payment.create(
        {
            "amount": {
                "value": f"{amount:.2f}",
                "currency": "RUB",
            },
            "confirmation": {
                "type": "redirect",
                "return_url": return_url,
            },
            "capture": True,  # Автоматическое подтверждение
            "description": description,
            "metadata": metadata or {},
        },
        idempotency_key=str(uuid.uuid4()),
    )

    logger.info(f"ЮКасса: создан платёж {payment.id} на {amount} ₽")

    return {
        "id": payment.id,
        "status": payment.status,
        "confirmation_url": payment.confirmation.confirmation_url if payment.confirmation else None,
    }


def get_yokassa_payment(payment_id: str) -> dict | None:
    """Получить статус платежа из ЮКасса."""
    try:
        payment = Payment.find_one(payment_id)
        return {
            "id": payment.id,
            "status": payment.status,
            "amount": float(payment.amount.value),
            "metadata": payment.metadata or {},
        }
    except Exception:
        logger.exception(f"Ошибка при получении платежа {payment_id}")
        return None
