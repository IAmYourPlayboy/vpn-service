# Multi-Gateway Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить ЮКасса на мультигейт систему (Cryptomus + Robokassa) с абстрактным интерфейсом провайдеров для лёгкого добавления новых шлюзов.

**Architecture:** Базовый абстрактный класс `BasePaymentProvider` с двумя реализациями — `CryptomusProvider` и `RobokassaProvider`. Каждый провайдер скрывает детали API за общим интерфейсом. Пользователь выбирает провайдер на UI (radio-кнопки).

**Tech Stack:** FastAPI, SQLAlchemy async, SQLite, React/TypeScript, Cryptomus REST API, Robokassa HTTP API, httpx

---

## File Map

| Действие | Файл | Ответственность |
|----------|------|-----------------|
| **Create** | `backend/app/services/payment_providers/__init__.py` | Factory `get_provider(name)` |
| **Create** | `backend/app/services/payment_providers/base.py` | `BasePaymentProvider` ABC |
| **Create** | `backend/app/services/payment_providers/cryptomus.py` | Cryptomus API адаптер |
| **Create** | `backend/app/services/payment_providers/robokassa.py` | Robokassa API адаптер |
| **Modify** | `backend/app/services/payment.py` | Полная замена: обёртка над провайдерами |
| **Modify** | `backend/app/models/payment.py` | Добавить `provider`, `provider_payment_id` |
| **Modify** | `backend/app/config.py` | Новые env-переменные для двух провайдеров |
| **Modify** | `backend/app/api/schemas.py` | `CreatePaymentRequest` → добавить `provider`, `AdminPaymentResponse` → добавить `provider` |
| **Modify** | `backend/app/api/payments.py` | Переписать: create_payment + два webhook |
| **Modify** | `backend/app/api/admin.py` | Заменить `yokassa_payment_id` на `provider_payment_id` + `provider` |
| **Modify** | `backend/app/bot/handlers/subscription.py` | Заменить ЮКассу на мультигейт |
| **Modify** | `frontend/src/api/client.ts` | `createPayment` → добавить `provider` параметр |
| **Modify** | `frontend/src/pages/Subscription.tsx` | Добавить выбор провайдера (radio-кнопки) |
| **Modify** | `frontend/src/pages/admin/AdminPayments.tsx` | `yokassa_payment_id` → `provider_payment_id` + колонка `provider` |
| **Modify** | `backend/requirements.txt` | Убрать `yookassa` |
| **Modify** | `backend/.env.example` | Новые env-переменные |
| **Create** | Alembic migration | `add_provider_fields_to_payments` |

---

### Task 1: Config — новые переменные окружения

**Files:**
- Modify: `backend/app/config.py:29-31`

- [ ] **Step 1: Обновить config.py — заменить ЮКасса на мультигейт**

Заменить блок ЮКасса (строки 29-31) на:

```python
    # --- Cryptomus (крипто-платежи) ---
    cryptomus_merchant_id: str = ""
    cryptomus_api_key: str = ""

    # --- Robokassa (карты/СБП) ---
    robokassa_merchant_login: str = ""
    robokassa_password1: str = ""   # Для SignatureValue при создании платежа
    robokassa_password2: str = ""   # Для проверки ResultURL webhook
```

- [ ] **Step 2: Обновить backend/.env.example**

Заменить строки про ЮКасса на:

```
# Cryptomus (крипто-платежи)
CRYPTOMUS_MERCHANT_ID=id-магазина
CRYPTOMUS_API_KEY=api-ключ

# Robokassa (карты/СБП)
ROBOKASSA_MERCHANT_LOGIN=логин
ROBOKASSA_PASSWORD1=пароль1
ROBOKASSA_PASSWORD2=пароль2
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/config.py backend/.env.example
git commit -m "refactor: replace Yookassa config with Cryptomus + Robokassa env vars"
```

---

### Task 2: Модель Payment — добавить provider поля

**Files:**
- Modify: `backend/app/models/payment.py:19`

- [ ] **Step 1: Обновить модель Payment**

Заменить `yokassa_payment_id` на мультигейт поля:

```python
"""Модель платежа."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, text, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    subscription_id: Mapped[int | None] = mapped_column(ForeignKey("subscriptions.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="RUB")
    provider: Mapped[str] = mapped_column(String(30), default="cryptomus")  # имя провайдера
    provider_payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)  # внешний ID платежа
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending / succeeded / cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("datetime('now', '+3 hours')"))

    __table_args__ = (
        CheckConstraint("provider IN ('cryptomus', 'robokassa')", name="ck_payment_provider"),
    )

    # Связи
    user = relationship("User", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment id={self.id} provider={self.provider} amount={self.amount} status={self.status}>"
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/payment.py
git commit -m "feat: add provider and provider_payment_id to Payment model"
```

---

### Task 3: Alembic миграция

**Files:**
- Create: `backend/alembic/versions/<timestamp>_add_provider_fields_to_payments.py`

Latest revision: `f5a08726feb9`

- [ ] **Step 1: Создать миграцию**

```python
"""add provider fields to payments

Revision ID: a1b2c3d4e5f6
Revises: f5a08726feb9
Create Date: 2026-04-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f5a08726feb9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем новые колонки
    op.add_column('payments', sa.Column('provider', sa.String(30), nullable=True, server_default='cryptomus'))
    op.add_column('payments', sa.Column('provider_payment_id', sa.String(255), nullable=True))

    # Мигрируем существующие данные: yokassa_payment_id → provider_payment_id, provider = 'yookassa'
    op.execute("UPDATE payments SET provider = 'yookassa', provider_payment_id = yokassa_payment_id WHERE yokassa_payment_id IS NOT NULL")

    # Делаем provider NOT NULL после миграции
    with op.batch_alter_table('payments') as batch_op:
        batch_op.alter_column('provider', nullable=False)

    # Удаляем старую колонку
    with op.batch_alter_table('payments') as batch_op:
        batch_op.drop_column('yokassa_payment_id')

    # Добавляем CHECK constraint
    op.create_check_constraint('ck_payment_provider', 'payments', "provider IN ('cryptomus', 'robokassa', 'yookassa')")


def downgrade() -> None:
    with op.batch_alter_table('payments') as batch_op:
        batch_op.drop_constraint('ck_payment_provider')
        batch_op.add_column(sa.Column('yokassa_payment_id', sa.String(255), nullable=True))

    # Возвращаем данные
    op.execute("UPDATE payments SET yokassa_payment_id = provider_payment_id WHERE provider = 'yookassa'")

    with op.batch_alter_table('payments') as batch_op:
        batch_op.drop_column('provider')
        batch_op.drop_column('provider_payment_id')
```

- [ ] **Step 2: Применить миграцию (local dev)**

```bash
cd d:/Projects/vpn/backend
.\venv\Scripts\Activate.ps1
alembic upgrade head
```

- [ ] **Step 3: Commit**

```bash
git add backend/alembic/versions/
git commit -m "migration: add provider fields to payments table (yokassa -> multi-gateway)"
```

---

### Task 4: Схемы API — обновить Pydantic модели

**Files:**
- Modify: `backend/app/api/schemas.py`

- [ ] **Step 1: Обновить CreatePaymentRequest**

Найти строку 69-70 и заменить на:

```python
class CreatePaymentRequest(BaseModel):
    plan_id: int
    provider: str = "cryptomus"  # "cryptomus" | "robokassa"
```

- [ ] **Step 2: Обновить PaymentResponse**

Найти строки 73-81 и заменить на:

```python
class PaymentResponse(BaseModel):
    id: int
    amount: float
    currency: str
    provider: str
    status: str
    created_at: datetime
    confirmation_url: str | None = None

    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Обновить AdminPaymentResponse**

Найти строки 153-165 и заменить на:

```python
class AdminPaymentResponse(BaseModel):
    """Платёж с данными пользователя (для админки)."""
    id: int
    user_id: int
    user_email: str | None = None
    user_telegram_id: int | None = None
    amount: float
    currency: str
    provider: str
    provider_payment_id: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/schemas.py
git commit -m "feat: add provider field to payment schemas"
```

---

### Task 5: Абстрактный интерфейс провайдеров

**Files:**
- Create: `backend/app/services/payment_providers/__init__.py`
- Create: `backend/app/services/payment_providers/base.py`

- [ ] **Step 1: Создать base.py**

```python
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
```

- [ ] **Step 2: Создать __init__.py**

```python
"""Factory платёжных провайдеров."""

from app.services.payment_providers.base import BasePaymentProvider

# Провайдеры будут импортированы здесь после создания
# from app.services.payment_providers.cryptomus import CryptomusProvider
# from app.services.payment_providers.robokassa import RobokassaProvider

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
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/payment_providers/
git commit -m "feat: add BasePaymentProvider ABC and provider factory"
```

---

### Task 6: Cryptomus провайдер

**Files:**
- Create: `backend/app/services/payment_providers/cryptomus.py`

API: `POST https://api.cryptomus.com/v1/payment`
Auth: `merchant` header + `sign` = base64(md5(json_body + api_key))

- [ ] **Step 1: Создать cryptomus.py**

```python
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
CRYPTOMUS_WEBHOOK_IP = "91.227.144.54"


class CryptomusProvider(BasePaymentProvider):
    """Провайдер крипто-платежей через Cryptomus.

    Поддерживает: USDT, BTC, ETH и др.
    Комиссия: от 0.4%.
    """

    @property
    def name(self) -> str:
        return "cryptomus"

    def _build_sign(self, body_json: str) -> str:
        """Создать подпись для Cryptomus API."""
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

        # Убираем sign из тела для проверки (он не участвует в хешировании тела)
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
```

- [ ] **Step 2: Зарегистрировать провайдер в __init__.py**

Добавить в `backend/app/services/payment_providers/__init__.py`:

```python
"""Factory платёжных провайдеров."""

from app.services.payment_providers.base import BasePaymentProvider
from app.services.payment_providers.cryptomus import CryptomusProvider

_providers: dict[str, BasePaymentProvider] = {}


def register_provider(name: str, provider: BasePaymentProvider) -> None:
    _providers[name] = provider


def get_provider(name: str) -> BasePaymentProvider:
    if name not in _providers:
        available = ", ".join(_providers.keys()) or "нет зарегистрированных провайдеров"
        raise ValueError(f"Неизвестный провайдер: {name}. Доступные: {available}")
    return _providers[name]


# Регистрируем провайдеров при импорте
register_provider("cryptomus", CryptomusProvider())
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/payment_providers/cryptomus.py
git add backend/app/services/payment_providers/__init__.py
git commit -m "feat: add CryptomusProvider — crypto payments via cryptomus.com"
```

---

### Task 7: Robokassa провайдер

**Files:**
- Create: `backend/app/services/payment_providers/robokassa.py`

API: `POST https://auth.robokassa.ru/Merchant/Payment/Index`
Auth: `SignatureValue = md5(MerchantLogin:OutSum:InvId:Пароль1)`
Webhook verify: `md5(OutSum:InvId:Пароль2) == SignatureValue`

- [ ] **Step 1: Создать robokassa.py**

```python
"""Robokassa платёжный провайдер — карты РФ + СБП."""

import hashlib
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

    def _create_signature(self, merchant_login: str, amount: float, inv_id: int) -> str:
        """Создать SignatureValue для создания платежа (Пароль1)."""
        raw = f"{merchant_login}:{amount:.2f}:{inv_id}:{settings.robokassa_password1}"
        return hashlib.md5(raw.encode()).hexdigest()

    def _verify_signature(self, amount: float, inv_id: int, signature: str) -> bool:
        """Проверить SignatureValue из webhook (Пароль2)."""
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
        auth.robokassa.ru для оплаты. InvId = наш order_id.

        Return URL — куда вернуть пользователя после оплаты.
        """
        inv_id = int(order_id) if order_id.isdigit() else hash(order_id) % 10**9

        params = {
            "MerchantLogin": settings.robokassa_merchant_login,
            "OutSum": f"{amount:.2f}",
            "InvId": inv_id,
            "Description": "VPN подписка Andigo",
            "SignatureValue": self._create_signature(settings.robokassa_merchant_login, amount, inv_id),
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

        # Формируем Receipt для 54-ФЗ (если есть email)
        if metadata and metadata.get("email"):
            receipt = {
                "email": metadata["email"],
                "items": [
                    {
                        "name": "VPN подписка Andigo",
                        "quantity": 1,
                        "sum": f"{amount:.2f}",
                        "payment_method": "full_payment",
                        "payment_object": "service",
                        "tax": "none",
                    }
                ],
            }
            import json
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
        SignatureValue = md5(OutSum:InvId:Пароль2).
        """
        out_sum = float(request_data.get("OutSum", 0))
        inv_id = int(request_data.get("InvId", 0))
        signature = request_data.get("SignatureValue", "")

        return self._verify_signature(out_sum, inv_id, signature)

    async def get_payment_status(self, provider_payment_id: str) -> dict | None:
        """Robokassa не предоставляет REST API для проверки статуса.
        Статус определяется только через webhook.
        """
        return None
```

- [ ] **Step 2: Зарегистрировать Robokassa в __init__.py**

Добавить импорт и регистрацию:

```python
from app.services.payment_providers.robokassa import RobokassaProvider

# в конце файла:
register_provider("robokassa", RobokassaProvider())
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/payment_providers/robokassa.py
git add backend/app/services/payment_providers/__init__.py
git commit -m "feat: add RobokassaProvider — fiat payments (cards + SBP)"
```

---

### Task 8: Обёртка payment.py — заменить ЮКассу на мультигейт

**Files:**
- Modify: `backend/app/services/payment.py` (полная перезапись)

- [ ] **Step 1: Полностью переписать payment.py**

Удалить всё содержимое и написать:

```python
"""Сервис платежей — мультигейт обёртка над провайдерами."""

import logging
import uuid
from typing import Any

from app.services.payment_providers import get_provider
from app.services.payment_providers.base import BasePaymentProvider

logger = logging.getLogger(__name__)


def get_yokassa_payment(payment_id: str) -> dict | None:
    """Заглушка для обратной совместимости — старый ЮКасса код.

    TODO: удалить когда все старые платежи будут обработаны.
    """
    logger.warning(f"get_yokassa_payment вызван — это устаревший метод. Payment ID: {payment_id}")
    return None


async def create_and_save_payment(
    user_id: int,
    plan_id: int,
    plan_price: float,
    plan_name: str,
    plan_duration: int,
    provider_name: str,
    domain: str,
    db,
) -> dict[str, Any]:
    """Создать платёж через выбранный провайдер и сохранить в БД.

    Это основная функция создания платежа. Она:
    1. Получает провайдер по имени
    2. Вызывает create_payment у провайдера
    3. Сохраняет платёж в БД
    4. Возвращает данные для фронтенда
    """
    from datetime import datetime, timezone, timedelta
    from app.models.payment import Payment

    provider = get_provider(provider_name)
    msk_tz = timezone(timedelta(hours=3))
    now = datetime.now(msk_tz)

    return_url = f"https://{domain}/dashboard?payment=success&provider={provider_name}"
    webhook_url = f"https://{domain}/api/payments/webhook/{provider_name}"
    # order_id содержит user_id:plan_id для надёжной связи в webhook
    order_id = f"pay:{user_id}:{plan_id}:{uuid.uuid4().hex[:8]}"

    payment_data = await provider.create_payment(
        amount=plan_price,
        order_id=order_id,
        return_url=return_url,
        webhook_url=webhook_url,
        metadata=metadata,
    )

    # Сохраняем в БД
    payment = Payment(
        user_id=user_id,
        provider=provider_name,
        provider_payment_id=payment_data.get("provider_payment_id"),
        amount=plan_price,
        currency="RUB",
        status="pending",
    )
    db.add(payment)
    await db.flush()

    return {
        "id": payment.id,
        "amount": plan_price,
        "currency": "RUB",
        "provider": provider_name,
        "status": "pending",
        "created_at": payment.created_at,
        "confirmation_url": payment_data.get("confirmation_url"),
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/payment.py
git commit -m "refactor: replace Yookassa payment service with multi-gateway wrapper"
```

---

### Task 9: API endpoints — переписать payments.py

**Files:**
- Modify: `backend/app/api/payments.py` (полная перезапись)

- [ ] **Step 1: Полностью переписать payments.py**

Удалить всё содержимое и написать:

```python
"""API платежей — мультигейт (Cryptomus + Robokassa)."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.schemas import CreatePaymentRequest, PaymentResponse
from app.config import settings
from app.database import get_db
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.user import User
from app.services.subscription import activate_subscription

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/create", response_model=PaymentResponse)
async def create_payment(
    data: CreatePaymentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создать платёж для покупки/продления подписки."""
    # Получаем план
    result = await db.execute(
        select(Plan).where(Plan.id == data.plan_id, Plan.is_active.is_(True))
    )
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тарифный план не найден",
        )

    # Проверяем валидность провайдера
    if data.provider not in ("cryptomus", "robokassa"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неподдерживаемый провайдер: {data.provider}. Доступные: cryptomus, robokassa",
        )

    try:
        from app.services.payment import create_and_save_payment

        result_data = await create_and_save_payment(
            user_id=user.id,
            plan_id=plan.id,
            plan_price=float(plan.price),
            plan_name=plan.name,
            plan_duration=plan.duration_days,
            provider_name=data.provider,
            domain=settings.domain,
            db=db,
        )

        return PaymentResponse(**result_data)

    except Exception as e:
        logger.exception(f"Ошибка создания платежа через {data.provider}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка платёжной системы: {e}",
        )


@router.post("/webhook/cryptomus")
async def cryptomus_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Webhook от Cryptomus — подтверждение крипто-платежа."""
    try:
        from app.services.payment_providers import get_provider
        provider = get_provider("cryptomus")
    except Exception:
        raise HTTPException(status_code=500, detail="Cryptomus провайдер не инициализирован")

    body = await request.json()
    sign_header = request.headers.get("sign", "")

    # Проверяем подпись
    if not provider.verify_webhook(body, {"sign": sign_header}):
        return {"status": "invalid_signature"}

    payment_status = body.get("status")
    order_id = body.get("order_id", "")

    if payment_status == "paid":
        # Извлекаем user_id и plan_id из order_id (формат: pay:user_id:plan_id:uuid)
        parts = order_id.split(":")
        if len(parts) >= 3:
            try:
                meta_user_id = int(parts[1])
                meta_plan_id = int(parts[2])
            except ValueError:
                meta_user_id = 0
                meta_plan_id = 1
        else:
            meta_user_id = 0
            meta_plan_id = 1

        # Ищем платёж по provider_payment_id (uuid) или provider=cryptomus + pending
        result = await db.execute(
            select(Payment).where(
                Payment.status == "pending",
                Payment.provider == "cryptomus",
                Payment.provider_payment_id == body.get("uuid"),
            )
        )
        payment = result.scalar_one_or_none()

        if not payment:
            # Fallback: ищем последний pending cryptomus платёж этого пользователя
            result = await db.execute(
                select(Payment).where(
                    Payment.status == "pending",
                    Payment.provider == "cryptomus",
                    Payment.user_id == meta_user_id,
                ).order_by(Payment.created_at.desc())
            )
            payment = result.scalars().first()

        if not payment:
            logger.warning(f"Cryptomus webhook: платёж не найден (uuid={body.get('uuid')})")
            return {"status": "payment_not_found"}

        payment.status = "succeeded"
        if body.get("uuid"):
            payment.provider_payment_id = body["uuid"]
        await db.flush()

        try:
            await activate_subscription(
                user_id=meta_user_id,
                plan_id=meta_plan_id,
                payment_id=payment.id,
                db=db,
            )
        except Exception:
            logger.exception(f"Ошибка активации подписки для user {meta_user_id}")
            return {"status": "subscription_error"}

        logger.info(f"Cryptomus webhook: платёж {body.get('uuid')} обработан")
        return {"status": "ok"}

    elif payment_status in ("cancelled", "expired"):
        # Обновляем статус на cancelled
        if body.get("uuid"):
            result = await db.execute(
                select(Payment).where(Payment.provider_payment_id == body["uuid"])
            )
            payment = result.scalar_one_or_none()
            if payment:
                payment.status = "cancelled"
                await db.flush()

        return {"status": "payment_cancelled"}

    return {"status": "ignored"}


@router.post("/webhook/robokassa")
async def robokassa_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Webhook от Robokassa (ResultURL) — подтверждение фиат-платежа."""
    try:
        from app.services.payment_providers import get_provider
        provider = get_provider("robokassa")
    except Exception:
        raise HTTPException(status_code=500, detail="Robokassa провайдер не инициализирован")

    form_data = await request.form()
    data = dict(form_data)

    out_sum = float(data.get("OutSum", 0))
    inv_id = int(data.get("InvId", 0))
    signature = data.get("SignatureValue", "")

    # Проверяем подпись
    if not provider.verify_webhook(data, {}):
        return f"bad sign"

    # Извлекаем user_id и plan_id из Shp_ полей
    shp_user_id = int(data.get("Shp_user_id", 0))
    shp_plan_id = int(data.get("Shp_plan_id", 1))

    # Ищем платёж по InvId (provider_payment_id)
    result = await db.execute(
        select(Payment).where(
            Payment.provider == "robokassa",
            Payment.provider_payment_id == str(inv_id),
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.warning(f"Robokassa webhook: платёж InvId={inv_id} не найден")
        return f"OK{inv_id}"  # Robokassa требует OK даже при ошибке

    if payment.status == "succeeded":
        return f"OK{inv_id}"  # Идемпотентность

    payment.status = "succeeded"
    await db.flush()

    # Активируем подписку — используем Shp_ поля если есть, иначе из payment
    user_id = shp_user_id or payment.user_id
    plan_id = shp_plan_id or 1

    try:
        await activate_subscription(
            user_id=user_id,
            plan_id=plan_id,
            payment_id=payment.id,
            db=db,
        )
    except Exception:
        logger.exception(f"Ошибка активации подписки для user {payment.user_id}")

    logger.info(f"Robokassa webhook: InvId={inv_id} обработан")
    return f"OK{inv_id}"


@router.get("/history", response_model=list[PaymentResponse])
async def payment_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить историю платежей текущего пользователя."""
    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == user.id)
        .order_by(Payment.created_at.desc())
        .limit(50)
    )
    payments = result.scalars().all()

    return [
        PaymentResponse(
            id=p.id,
            amount=float(p.amount),
            currency=p.currency,
            provider=p.provider,
            status=p.status,
            created_at=p.created_at,
        )
        for p in payments
    ]
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/payments.py
git commit -m "feat: rewrite payments API for multi-gateway (Cryptomus + Robokassa webhooks)"
```

---

### Task 10: Админка — обновить AdminPaymentResponse

**Files:**
- Modify: `backend/app/api/admin.py:488-498` (list_payments endpoint)

- [ ] **Step 1: Обновить list_payments**

Найти строки 486-499 и заменить:

```python
    for p in payments:
        user = (await db.execute(select(User).where(User.id == p.user_id))).scalar_one_or_none()
        items.append(AdminPaymentResponse(
            id=p.id,
            user_id=p.user_id,
            user_email=user.email if user else None,
            user_telegram_id=user.telegram_id if user else None,
            amount=float(p.amount),
            currency=p.currency,
            provider=p.provider,
            provider_payment_id=p.provider_payment_id,
            status=p.status,
            created_at=p.created_at,
        ))
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/admin.py
git commit -m "feat: update admin payments for multi-gateway (provider + provider_payment_id)"
```

---

### Task 11: Телеграм-бот — заменить ЮКассу

**Files:**
- Modify: `backend/app/bot/handlers/subscription.py:86-121`

- [ ] **Step 1: Заменить импорт**

Строка 15: заменить
```python
from app.services.payment import create_yokassa_payment
```
на
```python
from app.services.payment_providers import get_provider
```

- [ ] **Step 2: Переписать buy_or_renew callback**

Заменить строки 86-122 на:

```python
    # Создаём платёж через Cryptomus (по умолчанию для бота)
    return_url = f"https://{settings.domain}/dashboard?payment=success&provider=cryptomus"

    try:
        provider = get_provider("cryptomus")
        payment_data = await provider.create_payment(
            amount=float(plan.price),
            order_id=f"bot_{user.id}_{msk_date(datetime.now()).strftime('%Y%m%d%H%M%S')}",
            return_url=return_url,
            webhook_url=f"https://{settings.domain}/api/payments/webhook/cryptomus",
            metadata={
                "user_id": str(user.id),
                "plan_id": str(plan.id),
            },
        )
    except Exception:
        await callback.message.answer("❌ Ошибка создания платежа. Попробуйте позже.")
        await callback.answer()
        return

    confirmation_url = payment_data.get("confirmation_url")
    if not confirmation_url:
        await callback.message.answer("❌ Ошибка платёжной системы. Попробуйте позже.")
        await callback.answer()
        return

    # Сохраняем платёж в БД
    from app.models.payment import Payment
    from datetime import datetime, timezone, timedelta
    msk_tz = timezone(timedelta(hours=3))

    payment = Payment(
        user_id=user.id,
        provider="cryptomus",
        provider_payment_id=payment_data.get("provider_payment_id"),
        amount=float(plan.price),
        currency="RUB",
        status="pending",
    )

    async with async_session() as db:
        db.add(payment)
        await db.flush()

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"💰 Оплатить {plan.price:.0f} ₽", url=confirmation_url)],
        [InlineKeyboardButton(text="◀️ Назад", callback_data="subscription")],
    ])

    await callback.message.edit_text(
        f"💳 <b>Оплата подписки</b>\n\n"
        f"📦 Тариф: {plan.name}\n"
        f"💰 Стоимость: {plan.price:.0f} ₽\n"
        f"📅 Период: {plan.duration_days} дней\n\n"
        "Нажмите кнопку ниже для оплаты:",
        reply_markup=keyboard,
    )
    await callback.answer()
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/bot/handlers/subscription.py
git commit -m "feat: update Telegram bot payments to use Cryptomus"
```

---

### Task 12: Фронтенд — API клиент

**Files:**
- Modify: `frontend/src/api/client.ts:110-112`

- [ ] **Step 1: Обновить createPayment**

Найти строку 110 и заменить:

```typescript
export async function createPayment(planId: number, provider: string = 'cryptomus') {
  const { data } = await api.post('/payments/create', { plan_id: planId, provider })
  return data
}
```

- [ ] **Step 2: Commit**

```bash
cd d:/Projects/vpn/frontend
git add src/api/client.ts
git commit -m "feat: add provider parameter to createPayment API call"
```

---

### Task 13: Фронтенд — страница подписки с выбором провайдера

**Files:**
- Modify: `frontend/src/pages/Subscription.tsx`

- [ ] **Step 1: Полностью переписать Subscription.tsx**

```typescript
/**
 * Страница подписки — покупка, продление, история.
 * С выбором способа оплаты: крипто или карта/СБП.
 */

import { useEffect, useState } from 'react'
import { createPayment, getPaymentHistory } from '../api/client'

interface Payment {
  id: number
  amount: number
  currency: string
  provider: string
  status: string
  created_at: string
}

type Provider = 'cryptomus' | 'robokassa'

export default function Subscription() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider>('cryptomus')

  useEffect(() => {
    getPaymentHistory().then(setPayments).catch(() => {})
  }, [])

  async function handleBuy() {
    setLoading(true)
    try {
      const data = await createPayment(1, selectedProvider)
      if (data.confirmation_url) {
        window.location.href = data.confirmation_url
      }
    } catch {
      alert('Ошибка создания платежа')
    } finally {
      setLoading(false)
    }
  }

  function statusLabel(status: string) {
    if (status === 'succeeded') return '[OK] Оплачен'
    if (status === 'pending') return '[..] Ожидание'
    return '[XX] Отменён'
  }

  function providerLabel(provider: string) {
    return provider === 'cryptomus' ? '[Crypto]' : '[Card]'
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Подписка</h1>

      {/* Кнопка покупки */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Тариф «Стандарт»</h2>
        <p className="text-gray-400 text-sm mb-4">
          Полный доступ ко всем серверам · Безлимитный трафик · 30 дней
        </p>

        {/* Выбор способа оплаты */}
        <div className="mb-4 space-y-2">
          <label className="text-sm text-gray-400">Способ оплаты:</label>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setSelectedProvider('cryptomus')}
              className={`px-4 py-2 rounded-lg text-left font-mono text-sm border transition-colors ${
                selectedProvider === 'cryptomus'
                  ? 'border-green-400 text-green-400 bg-green-400/5'
                  : 'border-dark-border text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              {selectedProvider === 'cryptomus' ? '[x]' : '[ ]'} Криптовалюта (USDT, BTC, ETH)
            </button>
            <button
              onClick={() => setSelectedProvider('robokassa')}
              className={`px-4 py-2 rounded-lg text-left font-mono text-sm border transition-colors ${
                selectedProvider === 'robokassa'
                  ? 'border-green-400 text-green-400 bg-green-400/5'
                  : 'border-dark-border text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              {selectedProvider === 'robokassa' ? '[x]' : '[ ]'} Банковская карта / СБП
            </button>
          </div>
        </div>

        <button
          onClick={handleBuy}
          disabled={loading}
          className="bg-accent hover:bg-accent/80 disabled:opacity-50 px-6 py-3 rounded-lg font-semibold transition-colors text-black"
        >
          {loading ? 'Создание платежа...' : 'Оплатить 249 ₽ [→]'}
        </button>
      </div>

      {/* История платежей */}
      <h2 className="text-lg font-semibold mb-4">История платежей</h2>
      {payments.length === 0 ? (
        <p className="text-gray-500 text-sm">Платежей пока нет</p>
      ) : (
        <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-4 py-3 border-b border-dark-border/50 last:border-0"
            >
              <div>
                <div className="text-sm font-medium">{p.amount} {p.currency}</div>
                <div className="text-xs text-gray-500">
                  {new Date(p.created_at).toLocaleDateString('ru')}
                  {' '}· {providerLabel(p.provider)}
                </div>
              </div>
              <div className="text-sm">{statusLabel(p.status)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd d:/Projects/vpn/frontend
git add src/pages/Subscription.tsx
git commit -m "feat: add payment provider selection (crypto vs card) to subscription page"
```

---

### Task 14: Фронтенд — админка платежей

**Files:**
- Modify: `frontend/src/pages/admin/AdminPayments.tsx`

- [ ] **Step 1: Обновить таблицу платежей**

Заменить заголовки таблицы (строки 91-98):

```tsx
<th className="text-left p-3">ID</th>
<th className="text-left p-3">Пользователь</th>
<th className="text-left p-3">Сумма</th>
<th className="text-left p-3">Валюта</th>
<th className="text-left p-3">Провайдер</th>
<th className="text-left p-3">Статус</th>
<th className="text-left p-3">ID платежа</th>
<th className="text-left p-3">Дата</th>
<th className="text-left p-3">Действия</th>
```

Заменить строки тела таблицы (строки 103-127):

```tsx
<tr key={p.id} className="border-b border-dark-border/50 text-gray-300">
  <td className="p-3">{p.id}</td>
  <td className="p-3">{p.user_email || `TG:${p.user_telegram_id}` || '—'}</td>
  <td className="p-3">{p.amount}</td>
  <td className="p-3">{p.currency}</td>
  <td className="p-3">
    <span className={p.provider === 'cryptomus' ? 'text-green-400' : 'text-blue-400'}>
      {p.provider === 'cryptomus' ? '[Crypto]' : '[Card]'}
    </span>
  </td>
  <td className="p-3">
    <span className={statusColor(p.status)}>{p.status}</span>
  </td>
  <td className="p-3 text-xs text-gray-500">{p.provider_payment_id || '—'}</td>
  <td className="p-3">{formatDate(p.created_at)}</td>
  <td className="p-3">
    {isOwner && (
      <button
        onClick={() => handleDelete(p.id)}
        className="text-red-600 hover:text-red-500 text-xs font-bold"
      >
        [Удалить]
      </button>
    )}
  </td>
</tr>
```

Изменить colspan пустой строки на 9:
```tsx
<tr><td colSpan={9} className="p-3 text-gray-600">Нет данных</td></tr>
```

- [ ] **Step 2: Commit**

```bash
cd d:/Projects/vpn/frontend
git add src/pages/admin/AdminPayments.tsx
git commit -m "feat: update admin payments table for multi-gateway (provider column)"
```

---

### Task 15: Очистка — убрать ЮКассу из зависимостей

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Удалить yookassa из requirements.txt**

Найти строку `yookassa==3.4.0` и удалить её.

- [ ] **Step 2: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore: remove yookassa dependency (replaced by multi-gateway)"
```

---

### Task 16: Обновить CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Обновить секции CLAUDE.md**

Обновить следующие секции:

**Секция 4 (Техстек):**
```
| Оплата | Cryptomus (крипто) + Robokassa (карты/СБП) |
```

**Секция 7 (API):**
```
POST /api/payments/create    -- body: {plan_id, provider: "cryptomus"|"robokassa"}
POST /api/payments/webhook/cryptomus  -- Cryptomus callback
POST /api/payments/webhook/robokassa  -- Robokassa ResultURL
```

**Секция 12 (Env переменные):**
Заменить:
```
# ЮКасса
CRYPTOMUS_MERCHANT_ID=id-магазина
CRYPTOMUS_API_KEY=api-ключ

# Robokassa
ROBOKASSA_MERCHANT_LOGIN=логин
ROBOKASSA_PASSWORD1=пароль1
ROBOKASSA_PASSWORD2=пароль2
```

**Секция 10 (Флоу оплаты):**
Обновить — ЮКасса → мультигейт с провайдерами.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for multi-gateway payment system"
```

---

### Task 17: Финальное тестирование

- [ ] **Step 1: Проверить что всё собирается**

```bash
cd d:/Projects/vpn/backend
.\venv\Scripts\Activate.ps1
pip uninstall yookassa -y
# Проверить импорты
python -c "from app.services.payment_providers import get_provider; print('OK')"
python -c "from app.api.payments import router; print('OK')"
```

- [ ] **Step 2: Проверить фронтенд**

```bash
cd d:/Projects/vpn/frontend
npm run build
```

- [ ] **Step 3: Commit финальный**

```bash
git add -A
git commit -m "chore: multi-gateway payment system complete — Cryptomus + Robokassa"
```

---

## Verification Checklist

После реализации проверить:

1. **Local dev:**
   - [ ] `uvicorn app.main:app --reload` запускается без ошибок
   - [ ] POST /api/payments/create возвращает confirmation_url для обоих провайдеров
   - [ ] GET /api/payments/history возвращает поле `provider`
   - [ ] POST /api/payments/webhook/cryptomus принимает test webhook
   - [ ] POST /api/payments/webhook/robokassa принимает test webhook

2. **Фронтенд:**
   - [ ] Radio-кнопки отображаются на странице /subscription
   - [ ] Выбор провайдера передаётся в API
   - [ ] Редирект на confirmation_url работает
   - [ ] Админка платежей показывает колонку "Провайдер"

3. **Бот:**
   - [ ] buy_sub создаёт крипто-платёж через Cryptomus
   - [ ] Ссылка на оплату работает в Telegram

4. **Миграция:**
   - [ ] `alembic upgrade head` применяет миграцию
   - [ ] Существующие платежи с yokassa_payment_id корректно мигрированы
