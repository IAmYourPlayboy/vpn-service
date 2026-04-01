"""Инициализация и запуск Telegram-бота (aiogram 3)."""

import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from app.bot.handlers import menu, start, vpn_handler, subscription, settings_handler, admin_handler, help_handler, servers_handler
from app.config import settings

logger = logging.getLogger(__name__)

bot: Bot | None = None
dp: Dispatcher | None = None


def create_bot() -> tuple[Bot | None, Dispatcher | None]:
    """Создать экземпляры бота и диспетчера."""
    global bot, dp

    if not settings.telegram_bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN не задан — бот не запущен")
        return None, None

    bot = Bot(
        token=settings.telegram_bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()

    # Регистрируем обработчики
    dp.include_router(start.router)
    dp.include_router(menu.router)
    dp.include_router(vpn_handler.router)
    dp.include_router(subscription.router)
    dp.include_router(settings_handler.router)
    dp.include_router(help_handler.router)
    dp.include_router(servers_handler.router)
    dp.include_router(admin_handler.router)

    logger.info("Telegram-бот инициализирован")
    return bot, dp


async def setup_webhook(webhook_url: str):
    """Настроить webhook для бота."""
    if bot:
        await bot.set_webhook(webhook_url)
        logger.info(f"Webhook установлен: {webhook_url}")


async def shutdown_bot():
    """Остановить бота."""
    if bot:
        await bot.session.close()
