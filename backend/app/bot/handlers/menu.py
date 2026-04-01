"""Обработчик главного меню — навигация по разделам."""

from aiogram import F, Router
from aiogram.types import CallbackQuery

from app.bot.keyboards.main_menu import admin_menu_keyboard, main_menu_keyboard
from app.database import async_session
from app.models.user import User
from sqlalchemy import select

router = Router()


@router.callback_query(F.data == "main_menu")
async def show_main_menu(callback: CallbackQuery):
    """Вернуться в главное меню."""
    telegram_id = callback.from_user.id
    is_staff = False

    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()
        if user:
            is_staff = user.role in ("owner", "support")

    await callback.message.edit_text(
        "🏠 <b>Главное меню</b>\n\nВыбери действие:",
        reply_markup=main_menu_keyboard(is_staff=is_staff),
    )
    await callback.answer()


@router.callback_query(F.data == "admin_menu")
async def show_admin_menu(callback: CallbackQuery):
    """Показать меню админки."""
    telegram_id = callback.from_user.id

    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

        if not user or user.role not in ("owner", "support"):
            await callback.answer("⛔ Доступ запрещён", show_alert=True)
            return

    await callback.message.edit_text(
        "👑 <b>Админка</b>",
        reply_markup=admin_menu_keyboard(),
    )
    await callback.answer()
