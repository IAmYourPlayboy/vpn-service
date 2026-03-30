"""API админки — управление пользователями, статистика."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_admin_user
from app.database import get_db
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.user import User

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
async def get_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Общая статистика сервиса."""
    total_users = await db.scalar(select(func.count(User.id)))
    active_subs = await db.scalar(
        select(func.count(Subscription.id)).where(Subscription.status == "active")
    )
    total_revenue = await db.scalar(
        select(func.sum(Payment.amount)).where(Payment.status == "succeeded")
    )

    return {
        "total_users": total_users or 0,
        "active_subscriptions": active_subs or 0,
        "total_revenue": float(total_revenue or 0),
    }


@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Список пользователей с пагинацией."""
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "email": u.email,
            "telegram_id": u.telegram_id,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Заблокировать пользователя."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if user.is_admin:
        raise HTTPException(status_code=403, detail="Нельзя заблокировать админа")

    user.is_active = False
    return {"detail": f"Пользователь {user_id} заблокирован"}


@router.post("/users/{user_id}/unban")
async def unban_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Разблокировать пользователя."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.is_active = True
    return {"detail": f"Пользователь {user_id} разблокирован"}
