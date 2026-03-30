"""Модель тарифного плана."""

from sqlalchemy import Boolean, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))  # "Стандарт"
    price: Mapped[float] = mapped_column(Numeric(10, 2))  # Цена в рублях
    duration_days: Mapped[int] = mapped_column(Integer, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Связи
    subscriptions = relationship("Subscription", back_populates="plan", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Plan id={self.id} name={self.name} price={self.price}>"
