"""Сервис авторизации — JWT, хеширование паролей, Telegram-верификация."""

import hashlib
import hmac
from datetime import datetime, timedelta, timezone

# Московское время (UTC+3)
MOSCOW_TZ = timezone(timedelta(hours=3))

import bcrypt
from jose import JWTError, jwt

from app.config import settings


def hash_password(password: str) -> str:
    """Хешировать пароль через bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Проверить пароль против хеша."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int, role: str = "user") -> str:
    """Создать JWT-токен."""
    expire = datetime.now(MOSCOW_TZ) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    """Декодировать JWT-токен. Возвращает payload или None."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


def verify_telegram_auth(auth_data: dict) -> bool:
    """Проверить данные Telegram Login Widget.

    Telegram отправляет данные с HMAC-подписью.
    Подробности: https://core.telegram.org/widgets/login#checking-authorization
    """
    if not settings.telegram_bot_token:
        return False

    check_hash = auth_data.pop("hash", None)
    if not check_hash:
        return False

    # Сортируем поля и собираем строку для проверки
    data_check_string = "\n".join(
        f"{key}={auth_data[key]}" for key in sorted(auth_data.keys())
    )

    # Ключ = SHA256 от токена бота
    secret_key = hashlib.sha256(settings.telegram_bot_token.encode()).digest()

    # HMAC-SHA256 подпись
    computed_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(computed_hash, check_hash)
