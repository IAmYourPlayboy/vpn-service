"""Обработчик админки бота — статистика, пользователи."""

from aiogram import F, Router
from aiogram.types import CallbackQuery
from sqlalchemy import func, select

from app.bot.keyboards.main_menu import admin_menu_keyboard, back_to_menu_keyboard
from app.database import async_session
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.user import User

router = Router()


async def _check_admin(telegram_id: int) -> bool:
    """Проверить что пользователь — админ."""
    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()
        return user is not None and user.is_admin


@router.callback_query(F.data == "admin_stats")
async def admin_stats(callback: CallbackQuery):
    """Статистика сервиса."""
    if not await _check_admin(callback.from_user.id):
        await callback.answer("⛔ Доступ запрещён", show_alert=True)
        return

    async with async_session() as db:
        total_users = await db.scalar(select(func.count(User.id))) or 0
        active_subs = await db.scalar(
            select(func.count(Subscription.id)).where(Subscription.status == "active")
        ) or 0
        total_revenue = await db.scalar(
            select(func.sum(Payment.amount)).where(Payment.status == "succeeded")
        ) or 0

    text = (
        "📊 <b>Статистика</b>\n\n"
        f"👥 Пользователей: {total_users}\n"
        f"✅ Активных подписок: {active_subs}\n"
        f"💰 Выручка: {float(total_revenue):.0f} ₽\n"
    )

    await callback.message.edit_text(text, reply_markup=admin_menu_keyboard())
    await callback.answer()


@router.callback_query(F.data == "admin_users")
async def admin_users(callback: CallbackQuery):
    """Список последних пользователей."""
    if not await _check_admin(callback.from_user.id):
        await callback.answer("⛔ Доступ запрещён", show_alert=True)
        return

    async with async_session() as db:
        result = await db.execute(
            select(User).order_by(User.created_at.desc()).limit(10)
        )
        users = result.scalars().all()

    lines = ["👥 <b>Последние пользователи</b>\n"]
    for u in users:
        status = "✅" if u.is_active else "🚫"
        ident = u.email or f"TG:{u.telegram_id}"
        lines.append(f"{status} #{u.id} — {ident}")

    await callback.message.edit_text(
        "\n".join(lines),
        reply_markup=admin_menu_keyboard(),
    )
    await callback.answer()
