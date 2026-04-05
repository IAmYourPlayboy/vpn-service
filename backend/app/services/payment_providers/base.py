"""Базовый интерфейс платёжного провайдера."""

from abc import ABC, abstractmethod
from typing import Any


class BasePaymentProvider(ABC):
    """Абстрактный класс для платёжных провайдеров.

    Каждый провайдер (Cryptomus, Robokassa и др.) реализует этот интерфейс.
    """

    @abstractmethod
    async def create_payment(
        self,
        amount: float,
        order_id: str,
        return_url: str,
        webhook_url: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Создать платёж.

        Returns:
            dict с ключами:
                - confirmation_url: str  # URL для редиректа пользователя
                - provider_payment_id: str  # ID платежа во внешней системе
        """
        ...

    @abstractmethod
    def verify_webhook(self, request_data: dict[str, Any], headers: dict[str, Any]) -> bool:
        """Проверить подпись webhook.

        Returns:
            True если подпись валидна, False иначе.
        """
        ...

    @abstractmethod
    async def get_payment_status(self, provider_payment_id: str) -> dict[str, Any] | None:
        """Проверить статус платежа в API провайдера (опционально, для отладки)."""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """Уникальное имя провайдера (например 'cryptomus', 'robokassa')."""
        ...
