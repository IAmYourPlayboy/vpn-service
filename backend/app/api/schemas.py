"""Pydantic-схемы для API запросов и ответов."""

from datetime import datetime

from pydantic import BaseModel, EmailStr


# === Авторизация ===

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TelegramAuthRequest(BaseModel):
    """Данные от Telegram Login Widget."""
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str | None
    telegram_id: int | None
    nickname: str | None = None
    is_active: bool
    role: str
    created_at: datetime
    has_active_subscription: bool = False

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    """Обновление профиля пользователя."""
    nickname: str | None = None


# === Подписки ===

class SubscriptionResponse(BaseModel):
    id: int
    status: str
    started_at: datetime
    expires_at: datetime
    auto_renew: bool
    plan_name: str | None = None

    model_config = {"from_attributes": True}


# === Платежи ===

class CreatePaymentRequest(BaseModel):
    plan_id: int
    provider: str = "cryptomus"  # "cryptomus" | "robokassa"


class PaymentResponse(BaseModel):
    id: int
    amount: float
    currency: str
    provider: str
    status: str
    created_at: datetime
    confirmation_url: str | None = None

    model_config = {"from_attributes": True}


# === Серверы ===

class ServerResponse(BaseModel):
    id: int
    name: str
    country: str
    country_code: str
    is_active: bool
    current_load: int
    last_ping_ms: int | None
    ping_status: str

    model_config = {"from_attributes": True}


class ServerCreateRequest(BaseModel):
    name: str
    country: str
    country_code: str
    host: str


# === VPN ===

class VPNConfigResponse(BaseModel):
    subscription_link: str
    qr_code_base64: str | None = None


# === Привязка аккаунтов ===

class LinkEmailRequest(BaseModel):
    email: EmailStr
    password: str


class LinkTelegramRequest(BaseModel):
    telegram_id: int


class ChangeEmailRequest(BaseModel):
    """Смена email — требует подтверждение текущим паролем."""
    new_email: EmailStr
    password: str


class TelegramLinkResponse(BaseModel):
    """Ответ с deep-link для привязки Telegram."""
    link: str


# === Админка ===

class AdminSubscriptionResponse(BaseModel):
    """Подписка с данными пользователя и тарифа (для админки)."""
    id: int
    user_id: int
    user_email: str | None = None
    user_telegram_id: int | None = None
    plan_name: str
    marzban_username: str
    status: str
    started_at: datetime
    expires_at: datetime
    auto_renew: bool

    model_config = {"from_attributes": True}


class AdminPaymentResponse(BaseModel):
    """Платёж с данными пользователя (для админки)."""
    id: int
    user_id: int
    user_email: str | None = None
    user_telegram_id: int | None = None
    amount: float
    currency: str
    provider: str
    provider_payment_id: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PlanResponse(BaseModel):
    """Тариф."""
    id: int
    name: str
    price: float
    duration_days: int
    is_active: bool

    model_config = {"from_attributes": True}


class PlanCreateRequest(BaseModel):
    """Создание тарифа."""
    name: str
    price: float
    duration_days: int = 30


class PlanUpdateRequest(BaseModel):
    """Обновление тарифа (все поля опциональны)."""
    name: str | None = None
    price: float | None = None
    duration_days: int | None = None


# === Расширенная админка ===

class UserDetailResponse(BaseModel):
    """Подробная информация о пользователе (для кнопки 'Подробнее')."""
    # Базовая инфо
    id: int
    email: str | None = None
    telegram_id: int | None = None
    nickname: str | None = None
    role: str
    is_active: bool
    created_at: datetime
    last_login: datetime | None = None
    # VPN-данные из Marzban (nullable если нет подписки)
    vpn_status: str | None = None
    vpn_username: str | None = None
    subscription_url: str | None = None
    used_traffic_bytes: int | None = None
    data_limit_bytes: int | None = None
    # Связанные данные
    subscriptions: list[SubscriptionResponse] = []
    payments: list[PaymentResponse] = []

    model_config = {"from_attributes": True}


class CreateUserRequest(BaseModel):
    """Ручное создание пользователя (owner only)."""
    email: EmailStr
    password: str
    role: str = "user"
    activate_subscription: bool = False


class ChangeRoleRequest(BaseModel):
    """Изменение роли пользователя."""
    role: str  # "owner", "support", "user"


class ResetPasswordResponse(BaseModel):
    """Ответ на сброс пароля — новый пароль показывается один раз."""
    new_password: str


class ChangePasswordRequest(BaseModel):
    """Смена пароля пользователя."""
    current_password: str
    new_password: str


# === Удаление записей ===

class DeleteUserResponse(BaseModel):
    """Ответ на удаление пользователя."""
    detail: str
    user_id: int


class DeleteSubscriptionResponse(BaseModel):
    """Ответ на удаление подписки."""
    detail: str
    subscription_id: int


class DeletePaymentResponse(BaseModel):
    """Ответ на удаление платежа."""
    detail: str
    payment_id: int


class DeletePlanResponse(BaseModel):
    """Ответ на удаление тарифа."""
    detail: str
    plan_id: int
