"""Обработчик раздела «Настройки»."""

from aiogram import F, Router
from aiogram.types import CallbackQuery
from sqlalchemy import select

from app.bot.keyboards.main_menu import back_to_menu_keyboard
from app.database import async_session
from app.models.user import User

router = Router()


@router.callback_query(F.data == "settings")
async def show_settings(callback: CallbackQuery):
    """Показать настройки профиля."""
    telegram_id = callback.from_user.id

    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

    if not user:
        await callback.answer("❌ Аккаунт не найден", show_alert=True)
        return

    email_status = f"✅ {user.email}" if user.email else "❌ Не привязан"
    tg_status = f"✅ {callback.from_user.id}"

    text = (
        "⚙️ <b>Настройки</b>\n\n"
        f"📧 Email: {email_status}\n"
        f"📱 Telegram: {tg_status}\n"
        f"🆔 ID: {user.id}\n"
        f"📅 Регистрация: {user.created_at.strftime('%d.%m.%Y')}\n\n"
        "Для привязки email войдите на сайт."
    )

    await callback.message.edit_text(text, reply_markup=back_to_menu_keyboard())
    await callback.answer()
