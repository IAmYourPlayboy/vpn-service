"""Конфигурация приложения через переменные окружения."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Приложение ---
    app_name: str = "Andigo"
    debug: bool = False
    secret_key: str = "change-me-in-production"

    # --- База данных ---
    database_url: str = "sqlite+aiosqlite:///./vpn.db"

    # --- JWT ---
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 дней

    # --- Marzban ---
    marzban_url: str = "http://localhost:8080"
    marzban_username: str = "admin"
    marzban_password: str = "admin"

    # --- Telegram ---
    telegram_bot_token: str = ""
    telegram_webhook_url: str = ""  # https://site.com/api/bot/webhook

    # --- ЮКасса ---
    yokassa_shop_id: str = ""
    yokassa_secret_key: str = ""

    # --- Домен ---
    domain: str = "localhost"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
