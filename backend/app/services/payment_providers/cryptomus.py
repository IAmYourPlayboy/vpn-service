"""Cryptomus платёжный провайдер — крипто-платежи."""

import base64
import hashlib
import json
import logging

import httpx

from app.config import settings
from app.services.payment_providers.base import BasePaymentProvider

logger = logging.getLogger(__name__)

CRYPTOMUS_API_URL = "https://api.cryptomus.com/v1"


class CryptomusProvider(BasePaymentProvider):
    """Провайдер крипто-платежей через Cryptomus.

    Поддерживает: USDT, BTC, ETH и др.
    Комиссия: от 0.4%.
    """

    @property
    def name(self) -> str:
        return "cryptomus"

    def _build_sign(self, body_json: str) -> str:
        """Создать подпись для Cryptomus API.

        Sign = base64(md5(JSON_body + API_KEY)).
        """
        raw = body_json.encode() + settings.cryptomus_api_key.encode()
        md5_hash = hashlib.md5(raw).digest()
        return base64.b64encode(md5_hash).decode()

    async def create_payment(
        self,
        amount: float,
        order_id: str,
        return_url: str,
        webhook_url: str,
        metadata: dict | None = None,
    ) -> dict:
        """Создать крипто-платёж через Cryptomus.

        Клиент сможет оплатить в USDT/BTC/ETH (выбор на странице Cryptomus).
        """
        payload = {
            "amount": f"{amount:.2f}",
            "currency": "RUB",
            "order_id": order_id,
            "url_success": return_url,
            "url_callback": webhook_url,
            "lifetime": 900,  # 15 минут
            "to_currency": "USDT",  # предпочитаемая валюта
        }

        body_json = json.dumps(payload, separators=(",", ":"))
        sign = self._build_sign(body_json)

        headers = {
            "merchant": settings.cryptomus_merchant_id,
            "sign": sign,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{CRYPTOMUS_API_URL}/payment",
                content=body_json,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

        if data.get("state") != 0:
            raise RuntimeError(f"Cryptomus API error: {data}")

        result = data["result"]
        logger.info(f"Cryptomus: создан платёж {result['uuid']} на {amount} RUB")

        return {
            "confirmation_url": result["url"],
            "provider_payment_id": result["uuid"],
        }

    def verify_webhook(self, request_data: dict, headers: dict) -> bool:
        """Проверить подпись webhook от Cryptomus.

        Cryptomus шлёт POST с JSON-телом и заголовком `sign`.
        Sign = base64(md5(JSON_body + API_KEY)).
        """
        sign_from_header = request_data.get("sign") or headers.get("sign", "")

        # Убираем sign из тела для проверки (он не участвует в хешировании)
        body_for_verify = {k: v for k, v in request_data.items() if k != "sign"}
        body_json = json.dumps(body_for_verify, separators=(",", ":"))
        expected_sign = self._build_sign(body_json)

        return sign_from_header == expected_sign

    async def get_payment_status(self, provider_payment_id: str) -> dict | None:
        """Получить статус платежа из Cryptomus."""
        payload = {"uuid": provider_payment_id}
        body_json = json.dumps(payload, separators=(",", ":"))
        sign = self._build_sign(body_json)

        headers = {
            "merchant": settings.cryptomus_merchant_id,
            "sign": sign,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{CRYPTOMUS_API_URL}/payment/info",
                content=body_json,
                headers=headers,
            )
            if resp.status_code != 200:
                return None
            data = resp.json()

        if data.get("state") != 0:
            return None

        return data.get("result")
