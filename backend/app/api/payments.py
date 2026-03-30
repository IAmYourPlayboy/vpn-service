"""API платежей — создание платежа и webhook от ЮКасса."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.schemas import CreatePaymentRequest, PaymentResponse
from app.config import settings
from app.database import get_db
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.user import User
from app.services.payment import create_yokassa_payment
from app.services.subscription import activate_subscription

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/create", response_model=PaymentResponse)
async def create_payment(
    data: CreatePaymentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создать платёж для покупки/продления подписки."""
    # Получаем план
    result = await db.execute(select(Plan).where(Plan.id == data.plan_id, Plan.is_active.is_(True)))
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тарифный план не найден",
        )

    # Создаём платёж в ЮКасса
    return_url = f"https://{settings.domain}/dashboard?payment=success"
    yokassa_data = create_yokassa_payment(
        amount=float(plan.price),
        description=f"VPN подписка: {plan.name} ({plan.duration_days} дней)",
        return_url=return_url,
        metadata={
            "user_id": str(user.id),
            "plan_id": str(plan.id),
        },
    )

    # Сохраняем в нашу БД
    payment = Payment(
        user_id=user.id,
        amount=float(plan.price),
        currency="RUB",
        yokassa_payment_id=yokassa_data["id"],
        status="pending",
    )
    db.add(payment)
    await db.flush()

    return PaymentResponse(
        id=payment.id,
        amount=float(payment.amount),
        currency=payment.currency,
        status=payment.status,
        created_at=payment.created_at,
        confirmation_url=yokassa_data.get("confirmation_url"),
    )


@router.post("/webhook")
async def yokassa_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Webhook от ЮКасса — подтверждение оплаты.

    ЮКасса отправляет POST с JSON при изменении статуса платежа.
    """
    body = await request.json()
    event_type = body.get("event")

    if event_type != "payment.succeeded":
        # Игнорируем все события кроме успешной оплаты
        return {"status": "ignored"}

    payment_object = body.get("object", {})
    yokassa_id = payment_object.get("id")
    metadata = payment_object.get("metadata", {})

    if not yokassa_id:
        raise HTTPException(status_code=400, detail="Отсутствует ID платежа")

    # Находим наш платёж
    result = await db.execute(
        select(Payment).where(Payment.yokassa_payment_id == yokassa_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.warning(f"Webhook: платёж {yokassa_id} не найден в нашей БД")
        raise HTTPException(status_code=404, detail="Платёж не найден")

    if payment.status == "succeeded":
        # Уже обработан (идемпотентность)
        return {"status": "already_processed"}

    # Обновляем статус
    payment.status = "succeeded"

    # Активируем подписку
    user_id = int(metadata.get("user_id", payment.user_id))
    plan_id = int(metadata.get("plan_id", 1))

    await activate_subscription(
        user_id=user_id,
        plan_id=plan_id,
        payment_id=payment.id,
        db=db,
    )

    logger.info(f"Webhook: платёж {yokassa_id} обработан, подписка активирована для user {user_id}")
    return {"status": "ok"}


@router.get("/history", response_model=list[PaymentResponse])
async def payment_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить историю платежей текущего пользователя."""
    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == user.id)
        .order_by(Payment.created_at.desc())
        .limit(50)
    )
    payments = result.scalars().all()

    return [
        PaymentResponse(
            id=p.id,
            amount=float(p.amount),
            currency=p.currency,
            status=p.status,
            created_at=p.created_at,
        )
        for p in payments
    ]
