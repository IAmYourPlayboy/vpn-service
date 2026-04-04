"""Модель платежа."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    subscription_id: Mapped[int | None] = mapped_column(ForeignKey("subscriptions.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="RUB")
    yokassa_payment_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending / succeeded / cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("datetime('now', '+3 hours')"))

    # Связи
    user = relationship("User", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment id={self.id} amount={self.amount} status={self.status}>"
