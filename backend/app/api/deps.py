"""Зависимости для API эндпоинтов — текущий пользователь, права доступа."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.auth import decode_access_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Получить текущего авторизованного пользователя из JWT."""
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный токен",
        )

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или деактивирован",
        )

    return user


async def get_staff_user(
    user: User = Depends(get_current_user),
) -> User:
    """Проверить что пользователь — owner или support (доступ к админке)."""
    if user.role not in ("owner", "support"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещён",
        )
    return user


async def get_owner_user(
    user: User = Depends(get_current_user),
) -> User:
    """Проверить что пользователь — owner (полный доступ)."""
    if user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещён — только для владельца",
        )
    return user


# Обратная совместимость: get_admin_user = get_staff_user
get_admin_user = get_staff_user
