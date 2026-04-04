"""Обработчик раздела «Настройки»."""

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message
from sqlalchemy import select

from app.bot.keyboards.main_menu import back_to_menu_keyboard
from app.bot.utils.date_utils import msk_date
from app.database import async_session
from app.models.user import User
from app.services.auth import verify_password, hash_password

router = Router()


class PasswordChangeStates(StatesGroup):
    """Состояния FSM смены пароля."""
    waiting_for_current = State()
    waiting_for_new = State()
    waiting_for_confirm = State()


# Клавиатура настроек
def settings_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура раздела настроек."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔑 Сменить пароль", callback_data="change_password")],
        [InlineKeyboardButton(text="◀️ Назад", callback_data="main_menu")],
    ])


@router.callback_query(F.data == "settings")
async def show_settings(callback: CallbackQuery, state: FSMContext):
    """Показать настройки профиля."""
    telegram_id = callback.from_user.id
    await state.clear()  # Сбрасываем состояние при входе в настройки

    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

    if not user:
        await callback.answer("❌ Аккаунт не найден", show_alert=True)
        return

    email_status = f"✅ {user.email}" if user.email else "❌ Не привязан"
    pwd_status = "✅ Установлен" if user.password_hash else "❌ Не установлен"

    text = (
        "⚙️ <b>Настройки</b>\n\n"
        f"📧 Email: {email_status}\n"
        f"🔑 Пароль: {pwd_status}\n"
        f"📱 Telegram: ✅ {callback.from_user.id}\n"
        f"🆔 ID: {user.id}\n"
        f"📅 Регистрация: {msk_date(user.created_at)}\n"
    )

    await callback.message.edit_text(text, reply_markup=settings_keyboard())
    await callback.answer()


@router.callback_query(F.data == "change_password")
async def start_change_password(callback: CallbackQuery, state: FSMContext):
    """Начать смену пароля — запрос текущего пароля."""
    telegram_id = callback.from_user.id

    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

    if not user:
        await callback.answer("❌ Аккаунт не найден", show_alert=True)
        return

    if not user.password_hash:
        await callback.answer("❌ У вас не установлен пароль. Войдите на сайт для привязки email", show_alert=True)
        return

    text = (
        "🔑 <b>Смена пароля</b>\n\n"
        "Отправьте текущий пароль:"
    )

    await callback.message.edit_text(text, reply_markup=back_to_menu_keyboard())
    await state.set_state(PasswordChangeStates.waiting_for_current)
    await callback.answer()


@router.message(PasswordChangeStates.waiting_for_current)
async def process_current_password(message, state: FSMContext):
    """Проверка текущего пароля."""
    current_password = message.text.strip()
    telegram_id = message.from_user.id

    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

    if not user or not verify_password(current_password, user.password_hash):
        await message.answer(
            "❌ Неверный текущий пароль. Попробуйте ещё раз:\n"
            "Для отмены вернитесь в Настройки"
        )
        return

    state.update_data(verified=True)
    await state.set_state(PasswordChangeStates.waiting_for_new)

    await message.answer(
        "✅ Текущий пароль принят.\n\n"
        "Отправьте новый пароль (минимум 6 символов):"
    )


@router.message(PasswordChangeStates.waiting_for_new)
async def process_new_password(message, state: FSMContext):
    """Валидация нового пароля."""
    new_password = message.text.strip()

    if len(new_password) < 6:
        await message.answer(
            "❌ Пароль слишком короткий (минимум 6 символов).\n"
            "Отправьте новый пароль:"
        )
        return

    state.update_data(new_password=new_password)
    await state.set_state(PasswordChangeStates.waiting_for_confirm)

    await message.answer(
        "Отправьте подтверждение (повторите новый пароль):"
    )


@router.message(PasswordChangeStates.waiting_for_confirm)
async def process_confirm_password(message, state: FSMContext):
    """Подтверждение и сохранение нового пароля."""
    confirm_password = message.text.strip()
    data = await state.get_data()
    new_password = data.get("new_password")

    if confirm_password != new_password:
        await message.answer(
            "❌ Пароли не совпадают.\n"
            "Отправьте подтверждение ещё раз:"
        )
        return

    telegram_id = message.from_user.id

    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

    if not user:
        await message.answer("❌ Аккаунт не найден")
        await state.clear()
        return

    user.password_hash = hash_password(new_password)
    await db.commit()

    await state.clear()

    await message.answer(
        "✅ <b>Пароль успешно изменён!</b>\n\n"
        "Используйте новый пароль для входа на сайт.",
        reply_markup=settings_keyboard(),
    )
