"""API админки — управление пользователями, подписками, платежами, тарифами.

Иерархия ролей:
  owner   — полный доступ (статистика, тарифы, серверы, бан, роли, создание юзеров)
  support — просмотр юзеров/подписок/платежей, сброс пароля, управление VPN
  user    — нет доступа к админке
"""

import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_owner_user, get_staff_user
from app.api.schemas import (
    AdminPaymentResponse,
    AdminSubscriptionResponse,
    ChangeRoleRequest,
    CreateUserRequest,
    DeletePaymentResponse,
    DeletePlanResponse,
    DeleteSubscriptionResponse,
    DeleteUserResponse,
    PaymentResponse,
    PlanCreateRequest,
    PlanResponse,
    PlanUpdateRequest,
    ResetPasswordResponse,
    SubscriptionResponse,
    UserDetailResponse,
)
from app.database import get_db
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User
from app.services.auth import hash_password
from app.services.marzban import marzban_client, create_marzban_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Допустимые роли
VALID_ROLES = ("owner", "support", "user")


# ============================================================
#  Статистика (только owner)
# ============================================================

@router.get("/stats")
async def get_stats(
    admin: User = Depends(get_owner_user),
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


# ============================================================
#  Пользователи — список (staff)
# ============================================================

@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(get_staff_user),
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
            "nickname": u.nickname,
            "is_active": u.is_active,
            "role": u.role,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


# ============================================================
#  Пользователи — подробности (staff)
# ============================================================

@router.get("/users/{user_id}/details", response_model=UserDetailResponse)
async def get_user_details(
    user_id: int,
    admin: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
):
    """Подробная информация о пользователе: VPN, подписки, платежи."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Собираем VPN-данные из Marzban (если есть активная подписка)
    vpn_status = None
    vpn_username = None
    subscription_url = None
    used_traffic_bytes = None
    data_limit_bytes = None

    active_sub = next(
        (s for s in user.subscriptions if s.status == "active"),
        None,
    )
    if active_sub and active_sub.marzban_username:
        vpn_username = active_sub.marzban_username
        try:
            marzban_data = await marzban_client.get_user(active_sub.marzban_username)
            if marzban_data:
                vpn_status = marzban_data.get("status", "unknown")
                subscription_url = marzban_data.get("subscription_url")
                used_traffic_bytes = marzban_data.get("used_traffic", 0)
                data_limit_bytes = marzban_data.get("data_limit", 0)
        except Exception:
            # Marzban недоступен — возвращаем что есть
            vpn_status = "unavailable"

    # Подписки
    subs = []
    for s in user.subscriptions:
        plan = (await db.execute(select(Plan).where(Plan.id == s.plan_id))).scalar_one_or_none()
        subs.append(SubscriptionResponse(
            id=s.id,
            status=s.status,
            started_at=s.started_at,
            expires_at=s.expires_at,
            auto_renew=s.auto_renew,
            plan_name=plan.name if plan else None,
        ))

    # Платежи
    payments = [
        PaymentResponse(
            id=p.id,
            amount=float(p.amount),
            currency=p.currency,
            status=p.status,
            created_at=p.created_at,
        )
        for p in user.payments
    ]

    return UserDetailResponse(
        id=user.id,
        email=user.email,
        telegram_id=user.telegram_id,
        nickname=user.nickname,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
        vpn_status=vpn_status,
        vpn_username=vpn_username,
        subscription_url=subscription_url,
        used_traffic_bytes=used_traffic_bytes,
        data_limit_bytes=data_limit_bytes,
        subscriptions=subs,
        payments=payments,
    )


# ============================================================
#  VPN-управление (staff)
# ============================================================

@router.post("/users/{user_id}/toggle-vpn")
async def toggle_vpn(
    user_id: int,
    admin: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
):
    """Приостановить/включить VPN пользователя в Marzban."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    active_sub = next(
        (s for s in user.subscriptions if s.status == "active"),
        None,
    )
    if not active_sub or not active_sub.marzban_username:
        raise HTTPException(status_code=400, detail="У пользователя нет активной подписки с VPN")

    try:
        marzban_data = await marzban_client.get_user(active_sub.marzban_username)
        if not marzban_data:
            raise HTTPException(status_code=404, detail="Пользователь не найден в Marzban")

        current_status = marzban_data.get("status", "active")
        if current_status == "active":
            await marzban_client.disable_user(active_sub.marzban_username)
            return {"detail": "VPN приостановлен", "vpn_status": "disabled"}
        else:
            await marzban_client.enable_user(active_sub.marzban_username)
            return {"detail": "VPN включён", "vpn_status": "active"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка Marzban: {e}")


@router.post("/users/{user_id}/reissue-key")
async def reissue_key(
    user_id: int,
    admin: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
):
    """Перевыпустить VPN-ключ: удалить старого юзера в Marzban, создать нового."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    active_sub = next(
        (s for s in user.subscriptions if s.status == "active"),
        None,
    )
    if not active_sub or not active_sub.marzban_username:
        raise HTTPException(status_code=400, detail="У пользователя нет активной подписки с VPN")

    try:
        # Удаляем старого юзера в Marzban
        await marzban_client.delete_user(active_sub.marzban_username)

        # Создаём нового
        new_username = await create_marzban_user(user.id)
        active_sub.marzban_username = new_username
        await db.flush()

        return {"detail": "Ключ перевыпущен", "new_marzban_username": new_username}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка Marzban: {e}")


# ============================================================
#  Сброс пароля (staff)
# ============================================================

@router.post("/users/{user_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    user_id: int,
    admin: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
):
    """Сбросить пароль пользователя — сгенерировать новый случайный."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Support не может сбрасывать пароль owner'у и другим support'ам
    if admin.role == "support" and user.role in ("owner", "support"):
        raise HTTPException(status_code=403, detail="Нельзя сбросить пароль этому пользователю")

    new_password = secrets.token_urlsafe(12)
    user.password_hash = hash_password(new_password)
    await db.flush()

    return ResetPasswordResponse(new_password=new_password)


# ============================================================
#  Бан/разбан (только owner)
# ============================================================

@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    admin: User = Depends(get_owner_user),
    db: AsyncSession = Depends(get_db),
):
    """Заблокировать пользователя."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if user.role == "owner":
        raise HTTPException(status_code=403, detail="Нельзя заблокировать владельца")

    user.is_active = False
    await db.flush()
    return {"detail": f"Пользователь {user_id} заблокирован"}


@router.post("/users/{user_id}/unban")
async def unban_user(
    user_id: int,
    admin: User = Depends(get_owner_user),
    db: AsyncSession = Depends(get_db),
):
    """Разблокировать пользователя."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.is_active = True
    await db.flush()
    return {"detail": f"Пользователь {user_id} разблокирован"}


# ============================================================
#  Ручное создание пользователя (только owner)
# ============================================================

@router.post("/users/create")
async def create_user(
    data: CreateUserRequest,
    admin: User = Depends(get_owner_user),
    db: AsyncSession = Depends(get_db),
):
    """Создать пользователя вручную, с опциональной активацией подписки."""
    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Недопустимая роль: {data.role}")

    # Проверка: email не занят
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email уже зарегистрирован")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    subscription_info = None
    if data.activate_subscription:
        # Берём первый активный тариф
        plan_result = await db.execute(
            select(Plan).where(Plan.is_active == True).order_by(Plan.id).limit(1)
        )
        plan = plan_result.scalar_one_or_none()
        if plan:
            from datetime import datetime, timedelta, timezone

            # Московское время (UTC+3)
            MOSCOW_TZ = timezone(timedelta(hours=3))
            marzban_username = await create_marzban_user(user.id)
            sub = Subscription(
                user_id=user.id,
                plan_id=plan.id,
                marzban_username=marzban_username,
                status="active",
                expires_at=datetime.now(MOSCOW_TZ) + timedelta(days=plan.duration_days),
            )
            db.add(sub)
            await db.flush()
            subscription_info = {
                "plan": plan.name,
                "marzban_username": marzban_username,
                "expires_at": sub.expires_at.isoformat(),
            }

    return {
        "detail": f"Пользователь создан (id={user.id})",
        "user_id": user.id,
        "subscription": subscription_info,
    }


# ============================================================
#  Изменение роли (только owner)
# ============================================================

@router.put("/users/{user_id}/role")
async def change_role(
    user_id: int,
    data: ChangeRoleRequest,
    admin: User = Depends(get_owner_user),
    db: AsyncSession = Depends(get_db),
):
    """Изменить роль пользователя."""
    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Недопустимая роль: {data.role}")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя менять свою роль")

    old_role = user.role
    user.role = data.role
    await db.flush()
    return {"detail": f"Роль изменена: {old_role} → {data.role}"}


# ============================================================
#  Подписки (staff)
# ============================================================

@router.get("/subscriptions")
async def list_subscriptions(
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
):
    """Список всех подписок с данными пользователя и тарифа."""
    query = select(Subscription).order_by(Subscription.started_at.desc())

    if status:
        query = query.where(Subscription.status == status)

    result = await db.execute(query.offset(skip).limit(limit))
    subs = result.scalars().all()

    items = []
    for s in subs:
        user = (await db.execute(select(User).where(User.id == s.user_id))).scalar_one_or_none()
        plan = (await db.execute(select(Plan).where(Plan.id == s.plan_id))).scalar_one_or_none()
        items.append(AdminSubscriptionResponse(
            id=s.id,
            user_id=s.user_id,
            user_email=user.email if user else None,
            user_telegram_id=user.telegram_id if user else None,
            plan_name=plan.name if plan else "—",
            marzban_username=s.marzban_username,
            status=s.status,
            started_at=s.started_at,
            expires_at=s.expires_at,
            auto_renew=s.auto_renew,
        ))

    return items


# ============================================================
#  Платежи (staff)
# ============================================================

@router.get("/payments")
async def list_payments(
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
):
    """Список всех платежей с данными пользователя."""
    query = select(Payment).order_by(Payment.created_at.desc())

    if status:
        query = query.where(Payment.status == status)

    result = await db.execute(query.offset(skip).limit(limit))
    payments = result.scalars().all()

    items = []
    for p in payments:
        user = (await db.execute(select(User).where(User.id == p.user_id))).scalar_one_or_none()
        items.append(AdminPaymentResponse(
            id=p.id,
            user_id=p.user_id,
            user_email=user.email if user else None,
            user_telegram_id=user.telegram_id if user else None,
            amount=float(p.amount),
            currency=p.currency,
            yokassa_payment_id=p.yokassa_payment_id,
            status=p.status,
            created_at=p.created_at,
        ))

    return items


# ============================================================
#  Тарифы (только owner)
# ============================================================

@router.get("/plans")
async def list_plans(
    admin: User = Depends(get_owner_user),
    db: AsyncSession = Depends(get_db),
):
    """Список всех тарифов."""
    result = await db.execute(select(Plan).order_by(Plan.id))
    plans = result.scalars().all()
    return [PlanResponse.model_validate(p) for p in plans]


@router.post("/plans")
async def create_plan(
    data: PlanCreateRequest,
    admin: User = Depends(get_owner_user),
    db: AsyncSession = Depends(get_db),
):
    """Создать новый тариф."""
    plan = Plan(
        name=data.name,
        price=data.price,
        duration_days=data.duration_days,
        is_active=True,
    )
    db.add(plan)
    await db.flush()
    return PlanResponse.model_validate(plan)


@router.put("/plans/{plan_id}")
async def update_plan(
    plan_id: int,
    data: PlanUpdateRequest,
    admin: User = Depends(get_owner_user),
    db: AsyncSession = Depends(get_db),
):
    """Обновить тариф."""
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Тариф не найден")

    if data.name is not None:
        plan.name = data.name
    if data.price is not None:
        plan.price = data.price
    if data.duration_days is not None:
        plan.duration_days = data.duration_days

    return PlanResponse.model_validate(plan)


@router.patch("/plans/{plan_id}/toggle")
async def toggle_plan(
    plan_id: int,
    admin: User = Depends(get_owner_user),
    db: AsyncSession = Depends(get_db),
):
    """Включить/выключить тариф."""
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Тариф не найден")

    plan.is_active = not plan.is_active
    status = "включён" if plan.is_active else "выключен"
    return {"detail": f"Тариф '{plan.name}' {status}"}


# ============================================================
#  Удаление записей (только owner)
# ============================================================

@router.delete("/users/{user_id}", response_model=DeleteUserResponse)
async def delete_user(
    user_id: int,
    admin: User = Depends(get_owner_user),
    db: AsyncSession = Depends(get_db),
):
    """Удалить пользователя полностью (только owner)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить себя")

    if user.role == "owner":
        raise HTTPException(status_code=403, detail="Нельзя удалить другого владельца")

    # Сначала удаляем из Marzban (если есть активная подписка)
    active_sub = next(
        (s for s in user.subscriptions if s.status == "active"),
        None,
    )
    if active_sub and active_sub.marzban_username:
        try:
            await marzban_client.delete_user(active_sub.marzban_username)
        except Exception:
            # Marzban недоступен — логируем, но продолжаем удаление
            pass

    # Каскадное удаление: платежи → подписки → пользователь
    for payment in user.payments:
        await db.delete(payment)
    for sub in user.subscriptions:
        await db.delete(sub)

    await db.delete(user)
    await db.commit()

    return DeleteUserResponse(detail=f"Пользователь {user_id} удалён", user_id=user_id)


@router.delete("/subscriptions/{sub_id}", response_model=DeleteSubscriptionResponse)
async def delete_subscription(
    sub_id: int,
    admin: User = Depends(get_owner_user),
    db: AsyncSession = Depends(get_db),
):
    """Удалить подписку и связанные платежи (только owner)."""
    result = await db.execute(select(Subscription).where(Subscription.id == sub_id))
    sub = result.scalar_one_or_none()

    if not sub:
        raise HTTPException(status_code=404, detail="Подписка не найдена")

    # Если подписка активна — отключаем в Marzban
    if sub.status == "active" and sub.marzban_username:
        try:
            await marzban_client.delete_user(sub.marzban_username)
        except Exception:
            pass

    # Удаляем связанные платежи
    payments_result = await db.execute(select(Payment).where(Payment.subscription_id == sub_id))
    for payment in payments_result.scalars().all():
        await db.delete(payment)

    await db.delete(sub)
    await db.commit()

    return DeleteSubscriptionResponse(detail="Подписка удалена", subscription_id=sub_id)


@router.delete("/payments/{payment_id}", response_model=DeletePaymentResponse)
async def delete_payment(
    payment_id: int,
    admin: User = Depends(get_owner_user),
    db: AsyncSession = Depends(get_db),
):
    """Удалить платёж (только owner)."""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Платёж не найден")

    await db.delete(payment)
    await db.commit()

    return DeletePaymentResponse(detail="Платёж удалён", payment_id=payment_id)


@router.delete("/plans/{plan_id}", response_model=DeletePlanResponse)
async def delete_plan(
    plan_id: int,
    admin: User = Depends(get_owner_user),
    db: AsyncSession = Depends(get_db),
):
    """Удалить тариф (только owner)."""
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Тариф не найден")

    # Защита: нельзя удалить тариф с активными подписками
    active_subs = await db.scalar(
        select(func.count(Subscription.id)).where(
            Subscription.plan_id == plan_id,
            Subscription.status == "active",
        )
    )
    if active_subs:
        raise HTTPException(
            status_code=400,
            detail=f"Нельзя удалить: есть {active_subs} активных подписок на этом тарифе",
        )

    await db.delete(plan)
    await db.commit()

    return DeletePlanResponse(detail="Тариф удалён", plan_id=plan_id)
