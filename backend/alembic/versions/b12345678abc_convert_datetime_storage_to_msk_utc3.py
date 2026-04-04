"""convert datetime storage from UTC to Moscow time (UTC+3)

Revision ID: b12345678abc
Revises: f5a08726feb9
Create Date: 2026-04-04

Сдвигает все существующие datetime-значения на +3 часа.
Новые записи автоматически сохраняются в MSK через server_default.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b12345678abc'
down_revision: Union[str, None] = 'f5a08726feb9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Сдвинуть все UTC-времена на +3 часа (Москва)."""
    # Пользователи: created_at, last_login, telegram_link_token_expires
    op.execute("UPDATE users SET created_at = datetime(created_at, '+3 hours') "
               "WHERE created_at IS NOT NULL")
    op.execute("UPDATE users SET last_login = datetime(last_login, '+3 hours') "
               "WHERE last_login IS NOT NULL")
    op.execute("UPDATE users SET telegram_link_token_expires = "
               "datetime(telegram_link_token_expires, '+3 hours') "
               "WHERE telegram_link_token_expires IS NOT NULL")

    # Подписки: started_at, expires_at
    op.execute("UPDATE subscriptions SET started_at = datetime(started_at, '+3 hours') "
               "WHERE started_at IS NOT NULL")
    op.execute("UPDATE subscriptions SET expires_at = datetime(expires_at, '+3 hours') "
               "WHERE expires_at IS NOT NULL")

    # Платежи: created_at
    op.execute("UPDATE payments SET created_at = datetime(created_at, '+3 hours') "
               "WHERE created_at IS NOT NULL")

    # Серверы: last_checked_at
    op.execute("UPDATE servers SET last_checked_at = datetime(last_checked_at, '+3 hours') "
               "WHERE last_checked_at IS NOT NULL")


def downgrade() -> None:
    """Обратный сдвиг: -3 часа (вернуть к UTC)."""
    op.execute("UPDATE users SET created_at = datetime(created_at, '-3 hours') "
               "WHERE created_at IS NOT NULL")
    op.execute("UPDATE users SET last_login = datetime(last_login, '-3 hours') "
               "WHERE last_login IS NOT NULL")
    op.execute("UPDATE users SET telegram_link_token_expires = "
               "datetime(telegram_link_token_expires, '-3 hours') "
               "WHERE telegram_link_token_expires IS NOT NULL")
    op.execute("UPDATE subscriptions SET started_at = datetime(started_at, '-3 hours') "
               "WHERE started_at IS NOT NULL")
    op.execute("UPDATE subscriptions SET expires_at = datetime(expires_at, '-3 hours') "
               "WHERE expires_at IS NOT NULL")
    op.execute("UPDATE payments SET created_at = datetime(created_at, '-3 hours') "
               "WHERE created_at IS NOT NULL")
    op.execute("UPDATE servers SET last_checked_at = datetime(last_checked_at, '-3 hours') "
               "WHERE last_checked_at IS NOT NULL")
