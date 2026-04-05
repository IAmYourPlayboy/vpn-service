"""Robokassa платёжный провайдер — карты РФ + СБП."""

import hashlib
import json
import logging
from urllib.parse import urlencode

import httpx

from app.config import settings
from app.services.payment_providers.base import BasePaymentProvider

logger = logging.getLogger(__name__)

ROBOKASSA_URL = "https://auth.robokassa.ru/Merchant/Payment/Index"


class RobokassaProvider(BasePaymentProvider):
    """Провайдер фиат-платежей через Robokassa.

    Поддерживает: банковские карты РФ, СБП, электронные кошельки.
    Комиссия: ~3.5%. Работает с самозанятыми.
    """

    @property
    def name(self) -> str:
        return "robokassa"

    def _create_signature(self, amount: float, inv_id: int) -> str:
        """Создать SignatureValue для создания платежа (Пароль1).

        SignatureValue = md5(MerchantLogin:OutSum:InvId:Пароль1)
        """
        raw = f"{settings.robokassa_merchant_login}:{amount:.2f}:{inv_id}:{settings.robokassa_password1}"
        return hashlib.md5(raw.encode()).hexdigest()

    def _verify_signature(self, amount: float, inv_id: int, signature: str) -> bool:
        """Проверить SignatureValue из ResultURL webhook (Пароль2).

        SignatureValue = md5(OutSum:InvId:Пароль2)
        Robokassa шлёт md5 без MerchantLogin для ResultURL.
        """
        raw = f"{amount:.2f}:{inv_id}:{settings.robokassa_password2}"
        expected = hashlib.md5(raw.encode()).hexdigest()
        return expected == signature.lower()

    async def create_payment(
        self,
        amount: float,
        order_id: str,
        return_url: str,
        webhook_url: str,
        metadata: dict | None = None,
    ) -> dict:
        """Создать платёж через Robokassa.

        Robokassa использует redirect-форму — пользователь переходит на
        auth.robokassa.ru для оплаты. InvId — наш order_id (целое число).
        """
        # Извлекаем InvId: если order_id — число, берём его;
        # иначе — хеш (ограничен 9 цифрами).
        inv_id = int(order_id) if order_id.isdigit() else abs(hash(order_id)) % 10**9

        params = {
            "MerchantLogin": settings.robokassa_merchant_login,
            "OutSum": f"{amount:.2f}",
            "InvId": inv_id,
            "Description": "VPN подписка Andigo",
            "SignatureValue": self._create_signature(amount, inv_id),
            "SuccessURL": return_url,
            "FailURL": return_url.replace("payment=success", "payment=fail"),
            "ResultURL": webhook_url,
        }

        # Передаём user_id и plan_id через кастомные поля Shp_
        if metadata:
            if "user_id" in metadata:
                params["Shp_user_id"] = str(metadata["user_id"])
            if "plan_id" in metadata:
                params["Shp_plan_id"] = str(metadata["plan_id"])
            # Формируем Receipt для 54-ФЗ (если есть email пользователя)
            if "email" in metadata and metadata["email"]:
                receipt = {
                    "email": metadata["email"],
                    "items": [
                        {
                            "name": "VPN подписка Andigo",
                            "quantity": 1,
                            "sum": f"{amount:.2f}",
                            "payment_method": "full_prepayment",
                            "payment_object": "service",
                            "tax": "none",
                        }
                    ],
                }
                params["Receipt"] = json.dumps(receipt, ensure_ascii=False)

        # Формируем полную URL для редиректа
        redirect_url = f"{ROBOKASSA_URL}?{urlencode(params)}"

        logger.info(f"Robokassa: создан платёж InvId={inv_id} на {amount} RUB")

        return {
            "confirmation_url": redirect_url,
            "provider_payment_id": str(inv_id),
        }

    def verify_webhook(self, request_data: dict, headers: dict) -> bool:
        """Проверить подпись ResultURL webhook от Robokassa.

        Robokassa шлёт POST с параметрами: OutSum, InvId, SignatureValue, Shp_*.
        """
        out_sum = float(request_data.get("OutSum", 0))
        inv_id = int(request_data.get("InvId", 0))
        signature = request_data.get("SignatureValue", "")

        return self._verify_signature(out_sum, inv_id, signature)

    async def get_payment_status(self, provider_payment_id: str) -> dict | None:
        """Robokassa не предоставляет REST API для проверки статуса.

        Статус определяется только через webhook (ResultURL).
        """
        return None
