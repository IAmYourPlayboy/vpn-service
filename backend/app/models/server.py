"""Модель VPN-сервера (локации)."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Server(Base):
    __tablename__ = "servers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))  # "Нидерланды #1"
    country: Mapped[str] = mapped_column(String(100))  # "Netherlands"
    country_code: Mapped[str] = mapped_column(String(2))  # "NL"
    host: Mapped[str] = mapped_column(String(255))  # IP или домен ноды
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    current_load: Mapped[int] = mapped_column(Integer, default=0)  # % загрузки
    last_ping_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ping_status: Mapped[str] = mapped_column(String(20), default="offline")  # online / slow / offline
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<Server id={self.id} name={self.name} status={self.ping_status}>"
