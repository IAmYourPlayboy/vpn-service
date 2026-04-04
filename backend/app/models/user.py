"""Модель пользователя."""

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True)
    nickname: Mapped[str | None] = mapped_column(String(50), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String(20), server_default=text("'user'"))
    # Роли: "owner" (владелец), "support" (техподдержка), "user" (пользователь)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("datetime('now', '+3 hours')"))
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Привязка Telegram с сайта (deep link токен)
    telegram_link_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    telegram_link_token_expires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Связи
    subscriptions = relationship("Subscription", back_populates="user", lazy="selectin")
    payments = relationship("Payment", back_populates="user", lazy="selectin")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} tg={self.telegram_id}>"
