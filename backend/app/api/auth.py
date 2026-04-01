"""API авторизации — регистрация, вход, Telegram Login."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.schemas import (
    LinkEmailRequest,
    LoginRequest,
    RegisterRequest,
    TelegramAuthRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.database import get_db
from app.models.subscription import Subscription
from app.models.user import User
from app.services.auth import (
    create_access_token,
    hash_password,
    verify_password,
    verify_telegram_auth,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Регистрация по email + пароль."""
    # Проверка: email уже занят?
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email уже зарегистрирован",
        )

    # Создаём пользователя
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    await db.flush()

    token = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Вход по email + пароль."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован",
        )

    # Обновляем last_login
    user.last_login = datetime.now(timezone.utc)
    token = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token)


@router.post("/telegram", response_model=TokenResponse)
async def telegram_auth(data: TelegramAuthRequest, db: AsyncSession = Depends(get_db)):
    """Вход/регистрация через Telegram Login Widget."""
    # Проверяем подпись от Telegram
    auth_dict = data.model_dump()
    if not verify_telegram_auth(auth_dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидные данные Telegram",
        )

    # Ищем пользователя по telegram_id
    result = await db.execute(select(User).where(User.telegram_id == data.id))
    user = result.scalar_one_or_none()

    if not user:
        # Создаём нового пользователя
        user = User(telegram_id=data.id)
        db.add(user)
        await db.flush()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован",
        )

    user.last_login = datetime.now(timezone.utc)
    token = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить данные текущего пользователя + статус подписки."""
    # Проверяем наличие активной подписки
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
        )
    )
    has_sub = result.scalar_one_or_none() is not None

    return UserResponse(
        id=user.id,
        email=user.email,
        telegram_id=user.telegram_id,
        nickname=user.nickname,
        is_active=user.is_active,
        role=user.role,
        created_at=user.created_at,
        has_active_subscription=has_sub,
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    data: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Обновить профиль пользователя (nickname)."""
    if data.nickname is not None:
        # Очистка: пустая строка → None
        user.nickname = data.nickname.strip() or None
    await db.flush()

    # Вернуть обновлённые данные с подпиской
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
        )
    )
    has_sub = result.scalar_one_or_none() is not None

    return UserResponse(
        id=user.id,
        email=user.email,
        telegram_id=user.telegram_id,
        nickname=user.nickname,
        is_active=user.is_active,
        role=user.role,
        created_at=user.created_at,
        has_active_subscription=has_sub,
    )


@router.post("/link-email")
async def link_email(
    data: LinkEmailRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Привязать email к аккаунту (для пользователей из Telegram)."""
    if user.email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email уже привязан",
        )

    # Проверка: email не занят другим пользователем
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот email уже используется другим аккаунтом",
        )

    user.email = data.email
    user.password_hash = hash_password(data.password)
    return {"detail": "Email привязан"}
