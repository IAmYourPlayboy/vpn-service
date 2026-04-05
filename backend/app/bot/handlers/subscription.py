"""Обработчик раздела «Подписка» — покупка и продление."""

from aiogram import F, Router
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy import select

from app.bot.keyboards.main_menu import back_to_menu_keyboard, subscription_keyboard
from app.bot.utils.date_utils import msk_date
from app.config import settings
from app.database import async_session
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User
from app.services.payment_providers import get_provider

router = Router()


@router.callback_query(F.data == "subscription")
async def show_subscription(callback: CallbackQuery):
    """Показать статус подписки."""
    telegram_id = callback.from_user.id

    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            await callback.answer("❌ Аккаунт не найден", show_alert=True)
            return

        sub_result = await db.execute(
            select(Subscription).where(
                Subscription.user_id == user.id,
                Subscription.status == "active",
            )
        )
        sub = sub_result.scalar_one_or_none()

    if sub:
        text = (
            "💳 <b>Подписка</b>\n\n"
            f"✅ Статус: Активна\n"
            f"📅 Действует до: {msk_date(sub.expires_at)}\n"
        )
        keyboard = subscription_keyboard(has_active=True)
    else:
        text = (
            "💳 <b>Подписка</b>\n\n"
            "❌ У вас нет активной подписки.\n"
        )
        keyboard = subscription_keyboard(has_active=False)

    await callback.message.edit_text(text, reply_markup=keyboard)
    await callback.answer()


@router.callback_query(F.data.in_({"buy_sub", "renew_sub"}))
async def buy_or_renew(callback: CallbackQuery):
    """Создать платёж и отправить ссылку на оплату."""
    telegram_id = callback.from_user.id

    async with async_session() as db:
        # Находим пользователя
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            await callback.answer("❌ Аккаунт не найден", show_alert=True)
            return

        # Находим активный план
        plan_result = await db.execute(
            select(Plan).where(Plan.is_active.is_(True)).limit(1)
        )
        plan = plan_result.scalar_one_or_none()

        if not plan:
            await callback.message.answer("❌ Нет доступных тарифов. Обратитесь в поддержку.")
            await callback.answer()
            return

    # Создаём платёж через Cryptomus (по умолчанию для бота)
    return_url = f"https://{settings.domain}/dashboard?payment=success&provider=cryptomus"

    try:
        provider = get_provider("cryptomus")
        import uuid
        order_id = f"bot:{user.id}:{plan.id}:{uuid.uuid4().hex[:8]}"

        payment_data = await provider.create_payment(
            amount=float(plan.price),
            order_id=order_id,
            return_url=return_url,
            webhook_url=f"https://{settings.domain}/api/payments/webhook/cryptomus",
            metadata={
                "user_id": str(user.id),
                "plan_id": str(plan.id),
            },
        )
    except Exception:
        await callback.message.answer("❌ Ошибка создания платежа. Попробуйте позже.")
        await callback.answer()
        return

    confirmation_url = payment_data.get("confirmation_url")
    if not confirmation_url:
        await callback.message.answer("❌ Ошибка платёжной системы. Попробуйте позже.")
        await callback.answer()
        return

    # Сохраняем платёж в БД
    payment = Payment(
        user_id=user.id,
        provider="cryptomus",
        provider_payment_id=payment_data.get("provider_payment_id"),
        amount=float(plan.price),
        currency="RUB",
        status="pending",
    )

    async with async_session() as db:
        db.add(payment)
        await db.flush()

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"💰 Оплатить {plan.price:.0f} ₽", url=confirmation_url)],
        [InlineKeyboardButton(text="◀️ Назад", callback_data="subscription")],
    ])

    await callback.message.edit_text(
        f"💳 <b>Оплата подписки</b>\n\n"
        f"📦 Тариф: {plan.name}\n"
        f"💰 Стоимость: {plan.price:.0f} ₽\n"
        f"📅 Период: {plan.duration_days} дней\n\n"
        "Нажмите кнопку ниже для оплаты:",
        reply_markup=keyboard,
    )
    await callback.answer()


@router.callback_query(F.data == "payment_history")
async def show_payment_history(callback: CallbackQuery):
    """Показать историю платежей пользователя."""
    telegram_id = callback.from_user.id

    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            await callback.answer("❌ Аккаунт не найден", show_alert=True)
            return

        payments_result = await db.execute(
            select(Payment)
            .where(Payment.user_id == user.id)
            .order_by(Payment.created_at.desc())
            .limit(10)
        )
        payments = payments_result.scalars().all()

    if not payments:
        await callback.message.edit_text(
            "📜 <b>История платежей</b>\n\n"
            "Платежей пока нет.",
            reply_markup=back_to_menu_keyboard(),
        )
        await callback.answer()
        return

    # Маппинг провайдеров для отображения
    provider_map = {
        "cryptomus": "[Крипто]",
        "robokassa": "[Карта]",
        "yookassa": "[ЮКасса]",
    }

    status_map = {
        "pending": "⏳ Ожидание",
        "succeeded": "✅ Оплачен",
        "cancelled": "❌ Отменён",
    }

    lines = ["📜 <b>История платежей</b>\n"]
    for p in payments:
        status = status_map.get(p.status, p.status)
        date = msk_date(p.created_at)
        prov = provider_map.get(p.provider, p.provider)
        lines.append(f"{status} {prov} — {float(p.amount):.0f} ₽ ({date})")

    await callback.message.edit_text(
        "\n".join(lines),
        reply_markup=back_to_menu_keyboard(),
    )
    await callback.answer()
