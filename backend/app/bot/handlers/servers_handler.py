"""Обработчик раздела «Серверы» — список серверов с пингами."""

from aiogram import F, Router
from aiogram.types import CallbackQuery
from sqlalchemy import select

from app.bot.keyboards.main_menu import back_to_menu_keyboard
from app.database import async_session
from app.models.server import Server

router = Router()

# Флаги стран по ISO-коду (региональные индикаторы Unicode)
def _flag(country_code: str) -> str:
    """Преобразовать ISO-код страны в эмодзи-флаг."""
    if len(country_code) != 2:
        return "🌐"
    return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in country_code.upper())


def _ping_indicator(ping_status: str, last_ping_ms: int | None) -> str:
    """Индикатор статуса пинга."""
    if ping_status == "online":
        if last_ping_ms and last_ping_ms < 100:
            return f"🟢 {last_ping_ms} мс"
        elif last_ping_ms:
            return f"🟡 {last_ping_ms} мс"
        return "🟢 онлайн"
    return "🔴 офлайн"


@router.callback_query(F.data == "servers")
async def show_servers(callback: CallbackQuery):
    """Показать список серверов с пингами."""
    async with async_session() as db:
        result = await db.execute(
            select(Server).where(Server.is_active.is_(True)).order_by(Server.name)
        )
        servers = result.scalars().all()

    if not servers:
        await callback.message.edit_text(
            "🌍 <b>Серверы</b>\n\n"
            "Серверы пока не добавлены.",
            reply_markup=back_to_menu_keyboard(),
        )
        await callback.answer()
        return

    lines = ["🌍 <b>Серверы</b>\n"]
    for s in servers:
        flag = _flag(s.country_code)
        ping = _ping_indicator(s.ping_status, s.last_ping_ms)
        lines.append(f"{flag} <b>{s.name}</b> — {ping}")

    await callback.message.edit_text(
        "\n".join(lines),
        reply_markup=back_to_menu_keyboard(),
    )
    await callback.answer()
