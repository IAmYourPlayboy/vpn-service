"""Главное приложение FastAPI — точка входа."""

import asyncio
import logging
from contextlib import asynccontextmanager

from aiogram.types import Update
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, payments, servers, vpn, ws
from app.bot.bot import create_bot, setup_webhook, shutdown_bot
from app.config import settings
from app.database import init_db
from app.services.ping import ping_loop

logger = logging.getLogger(__name__)

# Создаём бота
bot, dp = create_bot()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Инициализация при старте, очистка при остановке."""
    # Создание таблиц (в проде — Alembic)
    await init_db()

    # Запускаем мониторинг пингов в фоне
    ping_task = asyncio.create_task(ping_loop())

    # Настраиваем webhook бота
    if bot and settings.telegram_webhook_url:
        try:
            await setup_webhook(settings.telegram_webhook_url)
        except Exception as e:
            logger.error(f"Не удалось настроить Telegram webhook: {e}")

    yield

    # Останавливаем фоновые задачи
    if not ping_task.done():
        ping_task.cancel()
        try:
            await ping_task
        except asyncio.CancelledError:
            pass
    await shutdown_bot()


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)

# CORS — для React-фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else [f"https://{settings.domain}"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(auth.router)
app.include_router(vpn.router)
app.include_router(servers.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(ws.router)


@app.post("/api/bot/webhook")
async def bot_webhook(request: Request):
    """Webhook-эндпоинт для Telegram-бота."""
    if not bot or not dp:
        return {"status": "bot not configured"}

    update = Update.model_validate(await request.json(), context={"bot": bot})
    await dp.feed_update(bot, update)
    return {"status": "ok"}


@app.get("/api/health")
async def health_check():
    """Проверка работоспособности."""
    return {"status": "ok", "service": settings.app_name}
