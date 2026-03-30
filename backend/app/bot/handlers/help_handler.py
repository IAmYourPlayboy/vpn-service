"""Обработчик раздела «Помощь»."""

from aiogram import F, Router
from aiogram.types import CallbackQuery

from app.bot.keyboards.main_menu import back_to_menu_keyboard

router = Router()


@router.callback_query(F.data == "help")
async def show_help(callback: CallbackQuery):
    """Показать раздел помощи."""
    text = (
        "❓ <b>Помощь</b>\n\n"
        "<b>Как подключиться к VPN:</b>\n"
        "1. Оформите подписку (раздел 💳)\n"
        "2. Получите конфиг (раздел 🔑)\n"
        "3. Скачайте приложение:\n"
        "   • <b>Android:</b> V2rayNG или Hiddify\n"
        "   • <b>iOS:</b> Streisand или Hiddify\n"
        "   • <b>Windows:</b> Hiddify или Nekoray\n"
        "   • <b>macOS:</b> Hiddify\n"
        "4. Отсканируйте QR-код или вставьте ссылку подписки\n"
        "5. Выберите сервер и подключитесь\n\n"
        "<b>Проблемы с подключением?</b>\n"
        "Напишите нам — ответим как можно скорее."
    )

    await callback.message.edit_text(text, reply_markup=back_to_menu_keyboard())
    await callback.answer()
