"""Модель подписки."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"))
    marzban_username: Mapped[str] = mapped_column(String(100), unique=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active / expired / cancelled
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("datetime('now', '+3 hours')"))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=False)

    # Связи
    user = relationship("User", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Subscription id={self.id} user={self.user_id} status={self.status}>"
