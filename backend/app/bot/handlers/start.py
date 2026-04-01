"""Обработчик /start — приветствие, создание аккаунта, привязка Telegram через deep link."""

from datetime import datetime, timezone

from aiogram import Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import Message
from sqlalchemy import select

from app.bot.keyboards.main_menu import main_menu_keyboard
from app.database import async_session
from app.models.user import User

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message, command: CommandObject):
    """Приветствие + автоматическое создание аккаунта / привязка через deep link."""
    telegram_id = message.from_user.id
    args = command.args  # Аргумент после /start (например, "link_TOKEN")

    # === Deep link привязка: /start link_{token} ===
    if args and args.startswith("link_"):
        token = args[5:]  # Убираем префикс "link_"
        await _handle_link_token(message, telegram_id, token)
        return

    # === Обычный /start ===
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
            is_staff = user.role in ("owner", "support")
            await message.answer(
                "👋 <b>С возвращением!</b>\n\n"
                "Выбери действие:",
                reply_markup=main_menu_keyboard(is_staff=is_staff),
            )


async def _handle_link_token(message: Message, telegram_id: int, token: str):
    """Обработка deep link: привязать Telegram к аккаунту на сайте."""
    async with async_session() as db:
        now = datetime.now(timezone.utc)

        # Ищем пользователя по токену (не истёкшему)
        result = await db.execute(
            select(User).where(
                User.telegram_link_token == token,
                User.telegram_link_token_expires > now,
            )
        )
        target_user = result.scalar_one_or_none()

        if not target_user:
            await message.answer(
                "❌ <b>Ссылка недействительна или истекла.</b>\n\n"
                "Запросите новую ссылку на сайте в настройках.",
            )
            return

        # Если этот telegram_id уже привязан к другому аккаунту — отвязываем
        existing = await db.execute(
            select(User).where(
                User.telegram_id == telegram_id,
                User.id != target_user.id,
            )
        )
        existing_user = existing.scalar_one_or_none()
        if existing_user:
            existing_user.telegram_id = None

        # Привязываем Telegram к целевому аккаунту
        target_user.telegram_id = telegram_id
        target_user.telegram_link_token = None
        target_user.telegram_link_token_expires = None
        await db.commit()

        display_name = target_user.nickname or target_user.email or f"#{target_user.id}"
        is_staff = target_user.role in ("owner", "support")
        await message.answer(
            f"✅ <b>Telegram привязан к аккаунту {display_name}</b>\n\n"
            "Теперь вы можете управлять VPN через бота.",
            reply_markup=main_menu_keyboard(is_staff=is_staff),
        )
