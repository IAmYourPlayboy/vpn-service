"""API платежей — мультигейт (Cryptomus + Robokassa)."""

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
    result = await db.execute(
        select(Plan).where(Plan.id == data.plan_id, Plan.is_active.is_(True))
    )
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тарифный план не найден",
        )

    # Проверяем валидность провайдера
    if data.provider not in ("cryptomus", "robokassa"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неподдерживаемый провайдер: {data.provider}. Доступные: cryptomus, robokassa",
        )

    try:
        from app.services.payment import create_and_save_payment

        result_data = await create_and_save_payment(
            user_id=user.id,
            plan_id=plan.id,
            plan_price=float(plan.price),
            provider_name=data.provider,
            domain=settings.domain,
            user_email=user.email,
            db=db,
        )

        return PaymentResponse(**result_data)

    except Exception as e:
        logger.exception(f"Ошибка создания платежа через {data.provider}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка платёжной системы: {e}",
        )


@router.post("/webhook/cryptomus")
async def cryptomus_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Webhook от Cryptomus — подтверждение крипто-платежа."""
    try:
        from app.services.payment_providers import get_provider
        provider = get_provider("cryptomus")
    except Exception:
        raise HTTPException(status_code=500, detail="Cryptomus провайдер не инициализирован")

    body = await request.json()
    sign_header = request.headers.get("sign", "")

    # Проверяем подпись
    if not provider.verify_webhook(body, {"sign": sign_header}):
        return {"status": "invalid_signature"}

    payment_status = body.get("status")
    order_id = body.get("order_id", "")

    if payment_status == "paid":
        # Извлекаем user_id и plan_id из order_id (формат: pay:user_id:plan_id:uuid)
        meta_user_id = 0
        meta_plan_id = 1
        parts = order_id.split(":")
        if len(parts) >= 3:
            try:
                meta_user_id = int(parts[1])
                meta_plan_id = int(parts[2])
            except ValueError:
                pass

        # Ищем платёж по provider_payment_id (uuid от Cryptomus)
        result = await db.execute(
            select(Payment).where(
                Payment.status == "pending",
                Payment.provider == "cryptomus",
                Payment.provider_payment_id == body.get("uuid"),
            )
        )
        payment = result.scalar_one_or_none()

        if not payment:
            # Fallback: ищем последний pending cryptomus платёж этого пользователя
            result = await db.execute(
                select(Payment).where(
                    Payment.status == "pending",
                    Payment.provider == "cryptomus",
                    Payment.user_id == meta_user_id,
                ).order_by(Payment.created_at.desc())
            )
            payment = result.scalars().first()

        if not payment:
            logger.warning(f"Cryptomus webhook: платёж не найден (uuid={body.get('uuid')})")
            return {"status": "payment_not_found"}

        payment.status = "succeeded"
        if body.get("uuid"):
            payment.provider_payment_id = body["uuid"]
        await db.flush()

        # Активируем подписку
        try:
            from app.services.subscription import activate_subscription
            await activate_subscription(
                user_id=meta_user_id,
                plan_id=meta_plan_id,
                payment_id=payment.id,
                db=db,
            )
        except Exception:
            logger.exception(f"Ошибка активации подписки для user {meta_user_id}")
            return {"status": "subscription_error"}

        logger.info(f"Cryptomus webhook: платёж {body.get('uuid')} обработан")
        return {"status": "ok"}

    elif payment_status in ("cancelled", "expired"):
        # Обновляем статус на cancelled
        if body.get("uuid"):
            result = await db.execute(
                select(Payment).where(Payment.provider_payment_id == body["uuid"])
            )
            payment = result.scalar_one_or_none()
            if payment:
                payment.status = "cancelled"
                await db.flush()

        return {"status": "payment_cancelled"}

    return {"status": "ignored"}


@router.post("/webhook/robokassa")
async def robokassa_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Webhook от Robokassa (ResultURL) — подтверждение фиат-платежа."""
    try:
        from app.services.payment_providers import get_provider
        provider = get_provider("robokassa")
    except Exception:
        raise HTTPException(status_code=500, detail="Robokassa провайдер не инициализирован")

    form_data = await request.form()
    data = dict(form_data)

    out_sum = float(data.get("OutSum", 0))
    inv_id = int(data.get("InvId", 0))

    # Проверяем подпись
    if not provider.verify_webhook(data, {}):
        return "bad sign"

    # Извлекаем user_id и plan_id из Shp_ полей
    shp_user_id = int(data.get("Shp_user_id", 0))
    shp_plan_id = int(data.get("Shp_plan_id", 1))

    # Ищем платёж по InvId (provider_payment_id)
    result = await db.execute(
        select(Payment).where(
            Payment.provider == "robokassa",
            Payment.provider_payment_id == str(inv_id),
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.warning(f"Robokassa webhook: платёж InvId={inv_id} не найден")
        return f"OK{inv_id}"  # Robokassa требует OK даже при ошибке

    if payment.status == "succeeded":
        return f"OK{inv_id}"  # Идемпотентность

    payment.status = "succeeded"
    await db.flush()

    # Активируем подписку — используем Shp_ поля если есть, иначе из payment
    user_id = shp_user_id or payment.user_id
    plan_id = shp_plan_id or 1

    try:
        from app.services.subscription import activate_subscription
        await activate_subscription(
            user_id=user_id,
            plan_id=plan_id,
            payment_id=payment.id,
            db=db,
        )
    except Exception:
        logger.exception(f"Ошибка активации подписки для user {payment.user_id}")

    logger.info(f"Robokassa webhook: InvId={inv_id} обработан")
    return f"OK{inv_id}"


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
            provider=p.provider,
            status=p.status,
            created_at=p.created_at,
        )
        for p in payments
    ]
