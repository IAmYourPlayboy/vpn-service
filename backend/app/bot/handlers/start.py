"""Обработчик /start — приветствие и создание аккаунта."""

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message
from sqlalchemy import select

from app.bot.keyboards.main_menu import main_menu_keyboard
from app.database import async_session
from app.models.user import User

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    """Приветствие + автоматическое создание аккаунта."""
    telegram_id = message.from_user.id

    async with async_session() as db:
        # Проверяем: есть ли аккаунт
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            # Создаём новый аккаунт
            user = User(telegram_id=telegram_id)
            db.add(user)
            await db.commit()

            await message.answer(
                "👋 <b>Добро пожаловать в Andigo!</b>\n\n"
                "Аккаунт создан автоматически.\n"
                "Выбери действие из меню ниже:",
                reply_markup=main_menu_keyboard(),
            )
        else:
            await message.answer(
                "👋 <b>С возвращением!</b>\n\n"
                "Выбери действие:",
                reply_markup=main_menu_keyboard(),
            )
