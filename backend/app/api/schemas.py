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
    is_active: bool
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


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


class PaymentResponse(BaseModel):
    id: int
    amount: float
    currency: str
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
