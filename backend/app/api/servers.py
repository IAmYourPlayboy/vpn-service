"""API серверов — список локаций с пингами."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_admin_user, get_current_user
from app.api.schemas import ServerCreateRequest, ServerResponse
from app.database import get_db
from app.models.server import Server
from app.models.user import User
from app.services.ping import get_cached_pings

router = APIRouter(prefix="/api/servers", tags=["servers"])


@router.get("", response_model=list[ServerResponse])
async def list_servers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить список активных серверов с пингами."""
    result = await db.execute(
        select(Server).where(Server.is_active.is_(True)).order_by(Server.country)
    )
    servers = result.scalars().all()

    # Обогащаем данными из кэша пингов
    cache = get_cached_pings()
    response = []
    for server in servers:
        cached = cache.get(server.id, {})
        response.append(ServerResponse(
            id=server.id,
            name=server.name,
            country=server.country,
            country_code=server.country_code,
            is_active=server.is_active,
            current_load=server.current_load,
            last_ping_ms=cached.get("ping_ms", server.last_ping_ms),
            ping_status=cached.get("status", server.ping_status),
        ))

    return response


@router.post("", response_model=ServerResponse)
async def create_server(
    data: ServerCreateRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Добавить новый VPN-сервер (только админ)."""
    server = Server(
        name=data.name,
        country=data.country,
        country_code=data.country_code,
        host=data.host,
    )
    db.add(server)
    await db.flush()

    return ServerResponse(
        id=server.id,
        name=server.name,
        country=server.country,
        country_code=server.country_code,
        is_active=server.is_active,
        current_load=server.current_load,
        last_ping_ms=server.last_ping_ms,
        ping_status=server.ping_status,
    )


@router.delete("/{server_id}")
async def delete_server(
    server_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Удалить VPN-сервер (только админ)."""
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()

    if not server:
        raise HTTPException(status_code=404, detail="Сервер не найден")

    await db.delete(server)
    return {"detail": "Сервер удалён"}
