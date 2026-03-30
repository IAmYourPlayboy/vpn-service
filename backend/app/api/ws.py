"""WebSocket для реалтайм-обновлений пингов серверов."""

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.ping import get_cached_pings

router = APIRouter()


@router.websocket("/ws/servers")
async def servers_ws(websocket: WebSocket):
    """WebSocket — пушит обновления пингов каждые 5 секунд."""
    await websocket.accept()

    try:
        while True:
            # Получаем текущий кэш пингов
            pings = get_cached_pings()

            # Формируем данные для отправки
            data = {}
            for server_id, ping_data in pings.items():
                data[str(server_id)] = {
                    "ping_ms": ping_data.get("ping_ms"),
                    "status": ping_data.get("status", "offline"),
                }

            # Отправляем клиенту
            await websocket.send_text(json.dumps(data))

            # Ждём 5 секунд до следующего обновления
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
