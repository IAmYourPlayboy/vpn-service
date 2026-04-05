"""Factory платёжных провайдеров."""

from app.services.payment_providers.base import BasePaymentProvider
from app.services.payment_providers.cryptomus import CryptomusProvider
from app.services.payment_providers.robokassa import RobokassaProvider

_providers: dict[str, BasePaymentProvider] = {}


def register_provider(name: str, provider: BasePaymentProvider) -> None:
    """Зарегистрировать провайдер (вызывается при импорте)."""
    _providers[name] = provider


def get_provider(name: str) -> BasePaymentProvider:
    """Получить провайдер по имени."""
    if name not in _providers:
        available = ", ".join(_providers.keys()) or "нет зарегистрированных провайдеров"
        raise ValueError(f"Неизвестный провайдер: {name}. Доступные: {available}")
    return _providers[name]


# Регистрируем провайдеров при импорте
register_provider("cryptomus", CryptomusProvider())
register_provider("robokassa", RobokassaProvider())
