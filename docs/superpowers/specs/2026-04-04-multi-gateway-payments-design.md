# Multi-Gateway Payment System — Design Spec

**Дата:** 2026-04-04
**Статус:** Draft — ожидает ревью пользователя
**Автор:** Claude Code

---

## Context

Andigo — VPN-сервис на базе Marzban. Текущая платёжная система — ЮКасса, но есть риск блокировки из-за VPN-тематики. Нужно заменить/дополнить двумя шлюзами с разными механизмами для устойчивости.

**Цель:** Реализовать мультигейт систему приёма платежей с двумя провайдерами:
- **Cryptomus** — крипто-платежи (USDT, BTC, ETH), комиссия от 0.4%, без проверок VPN
- **Robokassa** — фиат-платежи (карты РФ, СБП, электронные кошельки), комиссия ~3.5%, работает с самозанятыми

Провайдер выбирается пользователем на UI через радио-кнопки. Каждый провайдер — отдельный адаптер с общим интерфейсом для лёгкого масштабирования.

---

## Architecture

### Слои

```
┌─────────────────────────────────────────────────┐
│  Frontend (React)                                │
│  Subscription.tsx: радио-кнопки выбора провайдера │
│  POST /api/payments/create {plan_id, provider}   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Backend API (FastAPI)                           │
│  payments.py: create_payment, webhook endpoints  │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Payment Provider Factory                        │
│  payment_providers/__init__.py                   │
│  get_provider("cryptomus") → CryptomusProvider   │
│  get_provider("robokassa") → RobokassaProvider   │
└────┬──────────────────────┬──────────────────────┘
     │                      │
     ▼                      ▼
┌──────────────┐    ┌──────────────┐
│ Cryptomus    │    │ Robokassa    │
│ Provider     │    │ Provider     │
│              │    │              │
│ create()     │    │ create()     │
│ verify()     │    │ verify()     │
│ get_status() │    │ get_status() │
└──────┬───────┘    └──────┬───────┘
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ Cryptomus    │    │ Robokassa    │
│ API          │    │ API          │
│ api.crypto   │    │ auth.robokasa│
│ mus.com/v1   │    │ aura.ru      │
└──────────────┘    └──────────────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────────────────────┐
│  Webhook Flow                                    │
│  /webhook/cryptomus → verify() → update → activate│
│  /webhook/robokassa → verify() → update → activate│
└─────────────────────────────────────────────────┘
```

### Абстрактный интерфейс (PaymentProvider)

Все провайдеры наследуют `BasePaymentProvider`:

```python
class BasePaymentProvider(ABC):
    @abstractmethod
    async def create_payment(
        self, amount: float, order_id: str, 
        return_url: str, webhook_url: str,
        metadata: dict[str, Any] = {}
    ) -> dict:
        """Создать платёж. Возвращает {confirmation_url, provider_payment_id, ...}"""
        ...

    @abstractmethod
    def verify_webhook(self, request_data: dict, headers: dict) -> bool:
        """Проверить подпись webhook. Возвращает True/False."""
        ...

    @abstractmethod
    async def get_payment_status(self, provider_payment_id: str) -> dict | None:
        """Проверить статус платежа в API провайдера. Опционально."""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """Уникальное имя провайдера: "cryptomus", "robokassa"."""
        ...
```

### Файловая структура

```
backend/app/services/
├── payment_providers/
│   ├── __init__.py              # get_provider(name) factory
│   ├── base.py                  # BasePaymentProvider ABC
│   ├── cryptomus.py             # CryptomusProvider
│   └── robokassa.py             # RobokassaProvider
├── payment.py                   # Обёртка: create_and_save_payment
├── subscription.py              # activate_subscription (без изменений)
└── ...
```

---

## Provider Details

### Cryptomus Provider

**API:** `POST https://api.cryptomus.com/v1/payment`

**Auth:** `merchant` header + `sign` (MD5 от JSON body + API key, base64)

**Создание платежа:**
```python
POST /v1/payment {
    "amount": "249",
    "currency": "RUB",
    "order_id": "payment_123",
    "url_success": "https://andigo.su/dashboard?payment=success&provider=cryptomus",
    "url_callback": "https://andigo.su/api/payments/webhook/cryptomus",
    "lifetime": 900,  # 15 минут
    "to_currency": "USDT"  # клиент платит в USDT
}
```

**Ответ:**
```json
{
    "state": 0,
    "result": {
        "uuid": "...",
        "url": "https://pay.cryptomus.com/...",
        "order_id": "payment_123",
        "status": "pending"
    }
}
```

**Webhook verification:**
- Cryptomus шлёт POST на `/api/payments/webhook/cryptomus`
- `sign` = MD5(JSON body + API key), base64 encoded
- Сравниваем `sign` из заголовка с вычисленным
- Проверяем `order_id` → находим Payment в БД → обновляем статус
- Webhook приходит с IP `91.227.144.54`

**Статусы webhook:** `paid`, `cancelled`, `expired`

### Robokassa Provider

**API:** `POST https://auth.robokassa.ru/Merchant/Payment/Index`

**Auth:** MD5 hash → `SignatureValue = md5(MerchantLogin:OutSum:InvId:Пароль1)`

**Создание платежа:**
```python
POST /Merchant/Payment/Index {
    "MerchantLogin": "andigo",
    "OutSum": "249.00",
    "InvId": 123,
    "Description": "Andigo VPN подписка",
    "SignatureValue": "abc123...",
    "SuccessURL": "https://andigo.su/dashboard?payment=success&provider=robokassa",
    "FailURL": "https://andigo.su/dashboard?payment=fail&provider=robokassa",
    "Receipt": "{\"email\": \"user@mail.ru\", \"items\": [...]}"  # 54-ФЗ чек
}
```

Пользователь редиректится на страницу оплаты Robokassa.

**Webhook (ResultURL):**
- POST на `/api/payments/webhook/robokassa/`
- Parameters: `OutSum`, `InvId`, `SignatureValue`, `Shp_item` (metadata)
- Verify: `md5(OutSum:InvId:Пароль2)` == `SignatureValue`
- Response endpoint должен вернуть `OK{InvId}` чтобы подтвердить приём

**Кастомные поля (Shp_):** Robokassa позволяет передавать произвольные поля с префиксом `Shp_`. Используем для `Shp_user_id` и `Shp_plan_id`.

**54-ФЗ чек:** Robokassa требует фискальный чек. Нужно передать Receipt JSON с `email` пользователя и одной позицией: "VPN подписка Andigo".

---

## Database Changes

### Migration: добавить provider поля, убрать yokassa-специфичные

**Добавить:**
- `provider` VARCHAR(30), NOT NULL, DEFAULT "cryptomus"  — имя провайдера
- `provider_payment_id` VARCHAR(255), nullable — внешний ID платежа (UUID от Cryptomus или InvId от Robokassa)

**Переименовать:**
- `yokassa_payment_id` → `provider_payment_id` (через ALTER TABLE RENAME COLUMN)
- Или: добавить `provider_payment_id`, оставить `yokassa_payment_id` как nullable для обратной совместимости

**Удалить:**
- Уникальный constraint на `yokassa_payment_id` (если был отдельным, не частью PK)
- По умолчанию новое поле `provider` имеет constraint: `CHECK (provider IN ('cryptomus', 'robokassa'))`

**Индексы:**
- Добавить составной индекс `(provider, provider_payment_id)` для быстрого поиска в webhooks

---

## API Changes

### POST /api/payments/create

**Request:**
```json
{
    "plan_id": 1,
    "provider": "cryptomus"  // "cryptomus" | "robokassa"
}
```

**Response:**
```json
{
    "id": 42,
    "amount": 249.00,
    "currency": "RUB",
    "status": "pending",
    "provider": "cryptomus",
    "confirmation_url": "https://pay.cryptomus.com/...",
    "created_at": "2026-04-04T10:00:00"
}
```

### POST /api/payments/webhook/cryptomus

- Проверяет подпись Cryptomus (MD5 body + API key)
- Находит Payment по `order_id`
- Обновляет статус: `paid` → `succeeded`, `cancelled`/`expired` → `cancelled`
- При `paid`: вызывает `activate_subscription(user_id, plan_id, payment_id, db)`
- Возвращает `{"ok": true}` или `{"error": "..."}`

### POST /api/payments/webhook/robokassa

- Проверяет подпись Robokassa (md5 OutSum:InvId:Пароль2)
- Находит Payment по `InvId`
- Обновляет статус на `succeeded`
- Вызывает `activate_subscription`
- Возвращает `OK{InvId}` (требование Robokassa)

### GET /api/payments/history

Без изменений — пользователь видит свои платежи с полем `provider` вместо `yokassa_payment_id`.

### Admin endpoints

- `/api/admin/payments` — добавить поле `provider` в `AdminPaymentResponse`
- Удалить `yokassa_payment_id` из ответов (заменить на `provider_payment_id`)

### DELETE старый webhook

- Удалить старый `POST /api/payments/webhook` (ЮКасса) — больше не нужен
- Или оставить возвращающим 410 Gone для совместимости

---

## Environment Variables

В `backend/app/config.py` добавить:

```python
# Cryptomus
cryptomus_merchant_id: str = ""
cryptomus_api_key: str = ""

# Robokassa
robokassa_merchant_login: str = ""
robokassa_password1: str = ""   # Для генерации SignatureValue (создание платежа)
robokassa_password2: str = ""   # Для проверки ResultURL webhook
```

Удалить:
```python
yokassa_shop_id: str = ""
yokassa_secret_key: str = ""
```

---

## Frontend Changes

### Subscription.tsx

**Изменения:**
1. Добавить `useState` для выбора провайдера (по умолчанию "cryptomus")
2. Добавить радио-кнопки в стиле терминала:
   ```
   ○ Криптовалюта (USDT, BTC, ETH) — комиссия ~1%
   ○ Банковская карта / СБП — комиссия встроена в цену
   ```
3. При вызове `createPayment(planId)` — передавать выбранный `provider`
4. Показывать confirmation_url для выбранного провайдера

**Стиль:** ASCII-терминал, радиокнопки с `[selected]` / `[ ]` (без emoji, по правилу ASCII-иконок).

### API Client (client.ts)

Обновить функцию создания платежа — добавить параметр `provider`.

### AdminPayments.tsx

Заменить отображение `yokassa_payment_id` на `provider_payment_id`, добавить колонку `provider` (Crypto/Cards).

---

## Error Handling

### При создании платежа
- Провал API Cryptomus → вернуть ошибку "Крипто-платёж недоступен, попробуйте карту"
- Провал API Robokassa → вернуть ошибку "Оплата картой недоступна, попробуйте крипто"

### Webhook
- Неправильная подпись → `403 Forbidden`
- Платёж не найден → `404 Not Found`
- Дублирующий webhook (уже обработан) → `200 OK` (идемпотентность)
- Ошибка `activate_subscription` → `500 Internal Error` (webhook будет перезапущен)

### Таймауты
- Cryptomus: `lifetime` = 900 сек (15 мин). Если клиент не оплатил — счёт expires
- Robokassa: `Receipt` валидация может фейлиться → откат с ошибкой 400

---

## Testing Strategy

1. **Unit тесты:** Каждый провайдер отдельно — `create_payment`, `verify_webhook`
2. **Integration тесты:** Mock внешних API → проверить полный flow от create до webhook
3. **Local dev:** Запустить оба mock провайдера, проверить редирект и webhook
4. **Production:** Тестовые режимы Cryptomus (sandbox) и Robokassa (demo) → проверить 1 рубль

---

## Dependencies

**Добавить в requirements.txt:**
- `httpx` уже установлен (используется для Marzban API) — хватит для обоих провайдеров
- Новые библиотеки НЕ нужны — оба провайдера работают через обычные HTTP POST

**Удалить:**
- `yookassa==3.4.0` из requirements.txt

---

## Migration Plan

1. Создать `payment_providers/` с базой + оба адаптера
2. Alembic миграция: добавить `provider` + `provider_payment_id` колонки
3. Обновить `payments.py` — новый create + два webhook
4. Обновить `config.py` — новые env-переменные
5. Обновить фронтенд — Subscription.tsx + admin
6. Удалить `payment.py` (старый ЮКасса-сервис)
7. Тестирование в local dev
8. Обновить deploy — добавить env-переменные на VDS

---

## Telegram Bot Changes

Текущая реализация бота (bot/handlers/subscription.py) создаёт ЮКасса-платёж напрямую.
Нужно обновить:

- **buy_sub callback:** Переписать на использование `create_and_save_payment` из нового `payment.py`
- Выбор провайдера: по умолчанию "cryptomus" для бота (без UI выбора)
- Отправлять пользователю InlineKeyboardButton с `confirmation_url` от выбранного провайдера
- Webhook-эндпоинты те же — `/api/payments/webhook/cryptomus` и `/api/payments/webhook/robokassa`
- `Robokassa` callback для бота — пользователь получит URL, кликнет, оплатит в браузере

## Future Extensibility

Чтобы добавить новый провайдер (например, CloudPayments):
1. Создать `payment_providers/cloudpayments.py`
2. Реализовать `BasePaymentProvider`
3. Добавить env-переменные в config
4. Добавить в factory
5. Добавить UI-кнопку на фронтенде

Никакого изменения существующего кода провайдеров не требуется.
