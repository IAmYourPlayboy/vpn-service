"""Клавиатуры Telegram-бота."""

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def main_menu_keyboard(is_staff: bool = False) -> InlineKeyboardMarkup:
    """Главное меню бота. is_staff=True добавляет кнопку Админки."""
    buttons = [
        [InlineKeyboardButton(text="🔑 Мой VPN", callback_data="my_vpn")],
        [InlineKeyboardButton(text="🌍 Серверы", callback_data="servers")],
        [InlineKeyboardButton(text="💳 Подписка", callback_data="subscription")],
        [
            InlineKeyboardButton(text="⚙️ Настройки", callback_data="settings"),
            InlineKeyboardButton(text="❓ Помощь", callback_data="help"),
        ],
    ]
    if is_staff:
        buttons.append([InlineKeyboardButton(text="👑 Админка", callback_data="admin_menu")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def admin_menu_keyboard() -> InlineKeyboardMarkup:
    """Меню админки."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📊 Статистика", callback_data="admin_stats")],
        [InlineKeyboardButton(text="👥 Пользователи", callback_data="admin_users")],
        [InlineKeyboardButton(text="🌐 Серверы", callback_data="admin_servers")],
        [InlineKeyboardButton(text="◀️ Назад", callback_data="main_menu")],
    ])


def back_to_menu_keyboard() -> InlineKeyboardMarkup:
    """Кнопка «Назад в меню»."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="◀️ Меню", callback_data="main_menu")],
    ])


def subscription_keyboard(has_active: bool = False) -> InlineKeyboardMarkup:
    """Клавиатура подписки."""
    buttons = []
    if has_active:
        buttons.append([InlineKeyboardButton(text="🔄 Продлить", callback_data="renew_sub")])
    else:
        buttons.append([InlineKeyboardButton(text="💰 Купить подписку", callback_data="buy_sub")])
    buttons.append([InlineKeyboardButton(text="📜 История платежей", callback_data="payment_history")])
    buttons.append([InlineKeyboardButton(text="◀️ Меню", callback_data="main_menu")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def vpn_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для VPN."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📋 Скопировать конфиг", callback_data="copy_config")],
        [InlineKeyboardButton(text="📱 QR-код", callback_data="qr_code")],
        [InlineKeyboardButton(text="📥 Скачать .conf", callback_data="download_config")],
        [InlineKeyboardButton(text="◀️ Меню", callback_data="main_menu")],
    ])
