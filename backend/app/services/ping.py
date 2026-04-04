"""Сервис мониторинга серверов — пинг VPN-нод."""

import asyncio
import logging
import sys
from datetime import datetime, timedelta, timezone

# Московское время (UTC+3)
MOSCOW_TZ = timezone(timedelta(hours=3))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.server import Server

logger = logging.getLogger(__name__)

# Кэш пингов в RAM (обновляется каждые 5 секунд)
# Формат: {server_id: {"ping_ms": int, "status": str, "checked_at": datetime}}
ping_cache: dict[int, dict] = {}


async def ping_host(host: str, timeout: float = 3.0) -> int | None:
    """Пинговать хост и вернуть задержку в мс. None = недоступен."""
    try:
        # Используем системный ping (1 пакет, таймаут 3 сек)
        if sys.platform == "win32":
            cmd = ["ping", "-n", "1", "-w", str(int(timeout * 1000)), host]
        else:
            cmd = ["ping", "-c", "1", "-W", str(int(timeout)), host]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout + 1)

        if proc.returncode == 0:
            # Парсим время из вывода ping
            output = stdout.decode()
            for line in output.split("\n"):
                if "time=" in line or "time<" in line:
                    # Извлекаем значение после "time=" (или "time<" на Windows для <1ms)
                    sep = "time=" if "time=" in line else "time<"
                    time_part = line.split(sep)[1].split()[0]
                    # Убираем суффикс "ms" (Windows: "42ms", Linux: "42.3")
                    time_part = time_part.rstrip("ms").rstrip("m")
                    return int(float(time_part))
        return None
    except (asyncio.TimeoutError, Exception):
        return None


def _ping_status(ping_ms: int | None) -> str:
    """Определить статус по пингу."""
    if ping_ms is None:
        return "offline"
    elif ping_ms > 200:
        return "slow"
    return "online"


async def update_pings():
    """Обновить пинги всех активных серверов. Вызывается каждые 5 сек."""
    async with async_session() as db:
        result = await db.execute(
            select(Server).where(Server.is_active.is_(True))
        )
        servers = result.scalars().all()

        if not servers:
            return

        # Пингуем все серверы параллельно
        tasks = [ping_host(server.host) for server in servers]
        results = await asyncio.gather(*tasks)

        now = datetime.now(MOSCOW_TZ)

        for server, ping_ms in zip(servers, results):
            status = _ping_status(ping_ms)

            # Обновляем кэш
            ping_cache[server.id] = {
                "ping_ms": ping_ms,
                "status": status,
                "checked_at": now,
            }

            # Обновляем БД
            server.last_ping_ms = ping_ms
            server.ping_status = status
            server.last_checked_at = now

        await db.commit()


async def ping_loop():
    """Бесконечный цикл обновления пингов (каждые 5 секунд)."""
    logger.info("Запущен мониторинг пингов серверов")
    while True:
        try:
            await update_pings()
        except Exception:
            logger.exception("Ошибка при обновлении пингов")
        await asyncio.sleep(5)


def get_cached_pings() -> dict[int, dict]:
    """Вернуть текущий кэш пингов."""
    return ping_cache.copy()
