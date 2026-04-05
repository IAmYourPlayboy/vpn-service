# Andigo -- CLAUDE.md

Этот файл описывает Andigo (VPN-сервис) для мини-бизнеса. Читай его при каждом новом сеансе.

---

## 1. О пользователе

- **Не кодер** -- весь код пишет Claude Code
- Работает один, без команды
- **Windows 10 Pro** -- основная машина для разработки (Docker Desktop установлен, 700 ГБ свободных)
- MacBook -- только для Claude Code (места мало, зависимости не установить)
- Бюджет до 10 000 руб/мес на инфраструктуру
- Язык общения: русский. Английский только для кода/терминов
- Ценит **качество > скорость**, без лимитов на ответы
- Код с русскими комментариями

---

## 2. Описание проекта

- **Что:** Andigo — VPN-сервис (мини-бизнес, десятки-сотни пользователей)
- **Подход:** Marzban (VPN-ядро) + кастомный фронтенд + Telegram-бот + оплата (Cryptomus + Robokassa)
- **VDS:** Ubuntu 24.04, 1 vCPU, 2 ГБ RAM, 40 ГБ SSD, IP: 37.230.115.104
- **Старт:** всё на одном VDS, архитектура масштабируемая (будущие VPN-ноды в других странах)
- **Домен:** andigo.su
- **Цена:** 249 руб/мес (один тариф "Стандарт")
- **Статус:** код написан, работает локально, зависимости установлены, seed-данные загружены

---

## 3. Архитектура

```
Пользователи (сайт / TG-бот)                          Внешние VPN-ноды
        |                                                    |
        v                                                    v
+----------------------------------------------+    +--------------------------+
|     VDS 37.230.115.104 (2 ГБ RAM)           |    | Париж 109.120.179.67    |
|  Nginx (reverse proxy + статика React)       |===>| marzban-node (mTLS)     |
|  FastAPI (API + aiogram бот в одном процессе)|    | Xray core v25.3.6       |
|  SQLite (наша БД)    Marzban (VPN-ядро)     |    | Порт 62050/62051        |
+----------------------------------------------+    +--------------------------+
```

**Marzban Dashboard доступ:** через Nginx порт `8888` (SSL-терминация, проксирует HTTPS на marzban:8080). URL: `https://andigo.su:8888/`

**mTLS аутентификация нод:** Marzban панель (клиент mTLS) инициирует подключение к ноде. Сертификаты хранятся в таблице `tls` БД Marzban. Нода использует `cert.pem` как CA для проверки клиентских подключений.

**RAM-бюджет (2 ГБ):** OS ~200 МБ, Marzban ~250 МБ, FastAPI+бот ~150 МБ, Nginx ~20 МБ, свободно ~1300 МБ + 1 ГБ swap.

---

## 4. Техстек

| Компонент | Технология |
|-----------|-----------|
| VPN-ядро | Marzban (Docker) |
| Backend API | FastAPI (Python 3.11) |
| Telegram-бот | aiogram 3 (webhook, встроен в FastAPI) |
| БД | SQLite + SQLAlchemy (async) + Alembic |
| Фронтенд | React 19 + Vite 6 + Tailwind CSS 3 + TypeScript 5 |
| Веб-сервер | Nginx (reverse proxy + статика) |
| SSL | Let's Encrypt (certbot) |
| Оплата | Мультигейт: Cryptomus (крипто 0.4%) + Robokassa (карты/СБП ~3.5%) |
| Реалтайм | WebSocket (FastAPI, пинги серверов каждые 5 сек) |
| HTTP-клиент | httpx (async, для Marzban API) |
| QR-код | qrcode[pil] |
| Деплой | Docker Compose |

---

## 5. Структура проекта

```
vpn/
├── CLAUDE.md                          # <-- этот файл
├── .gitignore                         # Python, Node, DB, env, IDE, OS, Docker
│
├── backend/                           # FastAPI + Telegram-бот
│   ├── Dockerfile                     # Python 3.11-slim, pip install, uvicorn
│   ├── requirements.txt               # Все Python-зависимости
│   ├── .env                           # Dev-конфиг (DEBUG=true, пустые токены)
│   ├── .env.example                   # Шаблон для продакшена
│   ├── alembic.ini                    # Конфиг Alembic
│   ├── alembic/
│   │   ├── env.py                     # Async Alembic setup
│   │   └── script.py.mako            # Шаблон миграции
│   └── app/
│       ├── __init__.py
│       ├── main.py                    # FastAPI entrypoint: lifespan, CORS, роутеры, бот webhook
│       ├── config.py                  # Pydantic Settings (env vars)
│       ├── database.py                # Async SQLAlchemy engine + session factory
│       ├── api/
│       │   ├── __init__.py
│       │   ├── schemas.py            # Все Pydantic request/response модели
│       │   ├── deps.py               # get_current_user (JWT), get_staff_user, get_owner_user
│       │   ├── auth.py               # /register, /login, /telegram, /me, /link-email
│       │   ├── vpn.py                # /config (subscription link + QR)
│       │   ├── servers.py            # CRUD серверов + cached pings
│       │   ├── payments.py           # /create, /webhook/cryptomus, /webhook/robokassa
│       │   ├── admin.py              # Админка: CRUD юзеров, роли, VPN, подписки, тарифы
│       │   └── ws.py                 # WebSocket /ws/servers (реалтайм пинги)
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user.py               # id, email?, telegram_id?, password_hash?, is_active, role
│       │   ├── plan.py               # id, name, price, duration_days, is_active
│       │   ├── subscription.py       # id, user_id, plan_id, marzban_username, status, expires_at
│       │   ├── payment.py            # id, user_id, subscription_id?, amount, provider, provider_payment_id, status
│       │   └── server.py             # id, name, country, host, current_load, last_ping_ms, ping_status
│       ├── services/
│       │   ├── __init__.py
│       │   ├── auth.py               # bcrypt хеширование, JWT create/decode, Telegram HMAC verify
│       │   ├── marzban.py            # MarzbanClient: create/get/delete/disable/enable user, nodes, stats
│       │   ├── payment.py            # мультигейт обёртка: create_and_save_payment
│       │   ├── subscription.py       # activate, check_expired, get_expiring
│       │   ├── ping.py               # async ping, cache, ping_loop (5 сек), WebSocket push
│       │   └── payment_providers/    # Абстрактные провайдеры платежей
│       │       ├── base.py           # BasePaymentProvider ABC
│       │       ├── cryptomus.py       # Крипто-платежи (API cryptomus.com)
│       │       └── robokassa.py      # Карты/СБП (API robokassa.ru)
│       └── bot/
│           ├── __init__.py
│           ├── bot.py                 # Bot + Dispatcher, регистрация роутеров, webhook setup
│           ├── keyboards/
│           │   ├── __init__.py
│           │   └── main_menu.py       # InlineKeyboard: главное меню, админ, подписка, VPN
│           └── handlers/
│               ├── __init__.py
│               ├── start.py           # /start: авто-создание аккаунта из telegram_id
│               ├── menu.py            # Навигация по меню
│               ├── vpn_handler.py     # Статус VPN, конфиг, QR-код
│               ├── subscription.py    # Статус подписки, создание платежа
│               ├── settings_handler.py # Профиль пользователя
│               ├── help_handler.py    # FAQ, инструкция подключения
│               └── admin_handler.py   # Админ: статистика, список юзеров
│
├── frontend/                          # React SPA
│   ├── Dockerfile                     # Multi-stage: Node 20 build -> копия в volume
│   ├── package.json                   # React 19, react-router-dom 7, axios, Vite 6, Tailwind 3
│   ├── index.html                     # HTML entry point
│   ├── vite.config.ts                 # Vite конфиг (proxy /api -> localhost:8000 в dev)
│   ├── tsconfig.json                  # TypeScript конфиг
│   ├── tailwind.config.js             # Tailwind конфиг
│   ├── postcss.config.js              # PostCSS конфиг
│   └── src/
│       ├── main.tsx                   # React entry point
│       ├── App.tsx                    # Роутинг с ProtectedRoute (localStorage JWT)
│       ├── index.css                  # Tailwind imports + глобальные стили
│       ├── api/
│       │   └── client.ts             # Axios instance + JWT interceptor + все API функции
│       ├── components/
│       │   ├── Layout.tsx             # Sidebar (desktop) + tab bar (mobile), NavLink
│       │   └── AdminLayout.tsx        # Админ-лейаут: зелёный сайдбар, проверка role (owner/support)
│       └── pages/
│           ├── Landing.tsx            # Публичный лендинг: hero, фичи, тариф
│           ├── Login.tsx              # Форма входа (email + пароль)
│           ├── Register.tsx           # Форма регистрации
│           ├── Dashboard.tsx          # Дашборд: статус подписки, QR-код, конфиг
│           ├── Servers.tsx            # Серверы: WebSocket реалтайм пинги, флаги, цвет задержки
│           ├── Subscription.tsx       # Покупка/продление, выбор провайдера, история
│           ├── Settings.tsx           # Профиль, кнопка выхода
│           ├── Offer.tsx              # Публичная оферта (для Робокасса / Криптомус)
│           ├── PrivacyPolicy.tsx      # Политика конфиденциальности (152-ФЗ)
│           ├── TermsOfService.tsx     # Пользовательское соглашение
│           └── admin/                 # Админ-панель (owner + support)
│               ├── AdminOverview.tsx   # Статистика: юзеры, подписки, выручка (owner)
│               ├── AdminUsers.tsx      # Таблица юзеров: роли, TG-ссылки, создание (owner)
│               ├── AdminUserDetails.tsx # Подробнее: VPN, подписки, платежи, действия
│               ├── AdminSubscriptions.tsx # Все подписки с фильтрами
│               ├── AdminPayments.tsx   # История платежей (только чтение)
│               ├── AdminServers.tsx    # Серверы: добавить/удалить, пинги (owner)
│               └── AdminPlans.tsx      # Тарифы: CRUD, вкл/выкл (owner)
│
└── deploy/                            # Docker Compose деплой
    ├── docker-compose.yml             # nginx + backend + marzban + frontend build + certbot
    ├── marzban.env                    # Marzban конфиг (admin, SQLite)
    ├── nginx/
    │   └── default.conf               # /api/ -> backend, /ws/ -> backend (upgrade), / -> React
    └── scripts/
        ├── setup.sh                   # VDS: удалить ispmanager, Docker, UFW, swap
        └── deploy.sh                  # git pull + docker compose build + up
```

---

## 6. Модель данных (5 таблиц)

### users
| Поле | Тип | Описание |
|------|-----|----------|
| id | Integer PK | |
| email | String, nullable, unique | Для входа через сайт |
| telegram_id | BigInteger, nullable, unique | Для входа через бота |
| nickname | String(50), nullable | Отображаемое имя (задаётся в настройках) |
| password_hash | String, nullable | bcrypt (null если только Telegram) |
| is_active | Boolean, default True | |
| role | String(20), default "user" | "owner" / "support" / "user" |
| created_at | DateTime | |
| last_login | DateTime, nullable | |
| telegram_link_token | String(64), nullable | Токен для привязки TG с сайта (TTL 10 мин) |
| telegram_link_token_expires | DateTime, nullable | Срок действия токена |

### plans
| Поле | Тип | Описание |
|------|-----|----------|
| id | Integer PK | |
| name | String | Название тарифа |
| price | Numeric(10,2) | Цена в рублях |
| duration_days | Integer | Срок в днях |
| is_active | Boolean, default True | |

### subscriptions
| Поле | Тип | Описание |
|------|-----|----------|
| id | Integer PK | |
| user_id | FK -> users | |
| plan_id | FK -> plans | |
| marzban_username | String, unique | Логин в Marzban |
| status | String | active/expired/cancelled |
| started_at | DateTime | |
| expires_at | DateTime | |
| auto_renew | Boolean, default True | |

### payments
| Поле | Тип | Описание |
|------|-----|----------|
| id | Integer PK | |
| user_id | FK -> users | |
| subscription_id | FK -> subscriptions, nullable | |
| amount | Numeric(10,2) | Сумма |
| currency | String, default "RUB" | |
| provider | String(30), default "cryptomus" | Имя провайдера: cryptomus/robokassa/yookassa |
| provider_payment_id | String, nullable | ID платежа во внешней системе |
| status | String | pending/succeeded/cancelled |
| created_at | DateTime | |

### servers
| Поле | Тип | Описание |
|------|-----|----------|
| id | Integer PK | |
| name | String | Отображаемое имя |
| country | String | Страна |
| country_code | String(2) | Код для флага |
| host | String | IP или домен |
| is_active | Boolean, default True | |
| current_load | Integer, default 0 | Загрузка % |
| last_ping_ms | Integer, nullable | Последний пинг мс |
| ping_status | String, default "unknown" | online/offline/unknown |
| last_checked_at | DateTime, nullable | |

---

## 7. API эндпоинты

```
# Авторизация
POST /api/auth/register     -- Регистрация (email + пароль)
POST /api/auth/login        -- Вход (email + пароль -> JWT)
POST /api/auth/telegram     -- Вход через Telegram Login Widget
GET  /api/auth/me           -- Текущий пользователь (+ has_active_subscription)
PUT  /api/auth/profile      -- Обновить профиль (nickname)
PUT  /api/auth/change-email -- Сменить email (требует пароль)
POST /api/auth/link-email   -- Привязать email к аккаунту
POST /api/auth/telegram-link-token -- Сгенерировать deep-link для привязки TG

# VPN
GET  /api/vpn/config        -- Subscription link + QR-код (base64)

# Серверы
GET  /api/servers            -- Список серверов с кешированными пингами
POST /api/servers            -- Добавить сервер (только админ)
DELETE /api/servers/{id}     -- Удалить сервер (только админ)

# Оплата
POST /api/payments/create    -- Создать платёж {plan_id, provider: "cryptomus"|"robokassa"}
POST /api/payments/webhook/cryptomus  -- Webhook от Cryptomus
POST /api/payments/webhook/robokassa  -- Webhook от Robokassa (ResultURL)
GET  /api/payments/history   -- История платежей текущего пользователя

# Админка — owner only
GET  /api/admin/stats                    -- Статистика (юзеры, подписки, выручка)
POST /api/admin/users/create             -- Создать юзера вручную (+подписка)
PUT  /api/admin/users/{id}/role          -- Изменить роль
POST /api/admin/users/{id}/ban           -- Забанить
POST /api/admin/users/{id}/unban         -- Разбанить
GET  /api/admin/plans                    -- Все тарифы
POST /api/admin/plans                    -- Создать тариф
PUT  /api/admin/plans/{id}               -- Обновить тариф
PATCH /api/admin/plans/{id}/toggle       -- Вкл/выкл тариф
DELETE /api/admin/plans/{id}             -- Удалить тариф (только владелец)
DELETE /api/admin/users/{id}             -- Удалить юзера + каскад подписок/платежей (только владелец)
DELETE /api/admin/subscriptions/{id}     -- Удалить подписку (только владелец)
DELETE /api/admin/payments/{id}          -- Удалить платёж (только владелец)

# Админка — staff (owner + support)
GET  /api/admin/users                    -- Список пользователей
GET  /api/admin/users/{id}/details       -- Подробнее: VPN, подписки, платежи
POST /api/admin/users/{id}/toggle-vpn    -- Приостановить/включить VPN
POST /api/admin/users/{id}/reissue-key   -- Перевыпустить VPN-ключ
POST /api/admin/users/{id}/reset-password -- Сбросить пароль
GET  /api/admin/subscriptions            -- Все подписки (фильтр ?status=active)
GET  /api/admin/payments                 -- Все платежи (фильтр ?status=succeeded)

# Реалтайм
WS   /ws/servers             -- WebSocket: пинги серверов каждые 5 сек

# Сервисное
POST /api/bot/webhook        -- Telegram webhook (aiogram)
GET  /api/health             -- Health check
```

**Авторизация:** JWT HS256, срок жизни 7 дней. Payload: `{sub, role, exp}`. Токен в заголовке `Authorization: Bearer <token>`.

**Роли:** owner → support → user. Иерархия: owner видит всё, support — юзеры/подписки/платежи/VPN-управление, user — нет доступа к админке.

**Разграничение доступа по ролям:**

| Функция | Owner | Support | User |
|---------|-------|---------|------|
| Обзор (статистика) | Полный | Ограниченный | — |
| Пользователи (список) | Полный + создание | Просмотр + бан | — |
| Подробности юзера | Полный | Просмотр + VPN | — |
| Подписки | Просмотр | Просмотр | — |
| Платежи | Просмотр | Просмотр | — |
| Серверы | CRUD | — | — |
| Тарифы | CRUD + вкл/выкл | — | — |
| Смена ролей | Да | — | — |
| Создание юзеров | Да | — | — |
| Сброс пароля | Да | — | — |
| VPN toggle/reissue | Да | Да | — |
| Личный кабинет | Да | Да | Да |
| Редактирование профиля | Да | Да | Да |

---

## 8. Telegram-бот (aiogram 3)

Бот встроен в FastAPI процесс (webhook mode, один процесс на VDS).
**Имя бота:** @ANDIGO_VpnBot

```
/start -> авто-создание аккаунта по telegram_id + главное меню
/start link_{token} -> привязка Telegram к аккаунту на сайте (deep link)

Главное меню (InlineKeyboard):
  "Мой VPN"    -> статус подписки, конфиг (subscription link), QR-код
  "Серверы"    -> список серверов с пингами
  "Подписка"   -> купить/продлить -> выбор провайдера -> оплата у Cryptomus/Robokassa
  "Настройки"  -> профиль (email, telegram_id)
  "Помощь"     -> инструкция подключения, FAQ
  "Админка"    -> статистика, юзеры (только owner, проверка role)
```

---

## 9. Страницы сайта

| Путь | Доступ | Компонент | Описание |
|------|--------|-----------|----------|
| `/` | Публичный | Landing.tsx | Лендинг: hero, фичи, тариф |
| `/login` | Публичный | Login.tsx | Вход (email + пароль) |
| `/register` | Публичный | Register.tsx | Регистрация |
| `/dashboard` | Авторизован | Dashboard.tsx | QR-код, конфиг, статус подписки |
| `/servers` | Авторизован | Servers.tsx | Серверы + реалтайм пинг (WebSocket) |
| `/subscription` | Авторизован | Subscription.tsx | Покупка/продление, история платежей |
| `/settings` | Авторизован | Settings.tsx | Профиль, выход |
| `/admin` | Owner | AdminOverview.tsx | Статистика сервиса |
| `/admin/users` | Staff | AdminUsers.tsx | Пользователи: роли, TG-ссылки, создание |
| `/admin/users/:id` | Staff | AdminUserDetails.tsx | Подробнее: VPN, подписки, платежи, действия |
| `/admin/subscriptions` | Staff | AdminSubscriptions.tsx | Подписки с фильтрами |
| `/admin/payments` | Staff | AdminPayments.tsx | Платежи (только чтение) |
| `/admin/servers` | Owner | AdminServers.tsx | Серверы: добавить/удалить |
| `/admin/plans` | Owner | AdminPlans.tsx | Тарифы: CRUD, вкл/выкл |

**Защита маршрутов:** `ProtectedRoute` в App.tsx проверяет JWT в localStorage, редирект на `/login` если нет.
**Админ-маршруты:** `AdminLayout` проверяет `role in ["owner", "support"]` через `getMe()`, редирект на `/dashboard` если user. Пункты меню фильтруются по роли: support не видит Обзор, Серверы, Тарифы.

---

## 10. Пользовательские флоу

### Регистрация
- **Сайт:** email + пароль -> POST /api/auth/register -> JWT
- **Бот:** /start -> авто-создание по telegram_id (без пароля)

### Оплата
1. Пользователь нажимает "Купить" (сайт или бот)
2. POST /api/payments/create {plan_id, provider} -> создаёт платёж в Cryptomus/Robokassa -> redirect URL
3. Пользователь оплачивает на стороне платёжной системы
4. Платёжный шлюз шлёт webhook на POST /api/payments/webhook/{provider}
5. Бэкенд: обновляет payment status -> activate_subscription -> создаёт юзера в Marzban

### Получение VPN-ключа
- GET /api/vpn/config -> subscription_link (ссылка для импорта в приложение) + QR-код
- Бот: отправляет QR как фото + текстовую ссылку

### Продление подписки
- Background task: check_expired_subscriptions (деактивирует просроченные)
- get_expiring_subscriptions (уведомления за 3 дня до истечения)
- При истечении: disable user в Marzban

---

## 11. Команды для разработки (Windows 10 Pro, PowerShell)

```powershell
# === ПЕРВЫЙ ЗАПУСК ===

# 1. Перейти в папку проекта
cd D:\Projects\vpn

# 2. Установить Python-зависимости
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Установить Node-зависимости
cd ..\frontend
npm install

# 4. Создать первую миграцию Alembic
cd ..\backend
.\venv\Scripts\Activate.ps1
alembic revision --autogenerate -m "initial"
alembic upgrade head

# === РАЗРАБОТКА ===

# Запустить бэкенд (dev mode)
cd D:\Projects\vpn\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Запустить фронтенд (dev mode, в отдельном терминале)
cd D:\Projects\vpn\frontend
npm run dev

# Собрать фронтенд (продакшн)
npm run build

# === DOCKER (локальная проверка перед деплоем) ===

cd D:\Projects\vpn\deploy
docker compose up --build         # Запуск с пересборкой
docker compose down               # Остановка
docker compose ps                 # Статус контейнеров
docker compose logs backend       # Логи бэкенда
docker compose logs -f            # Все логи в реальном времени

# === ALEMBIC (миграции БД) ===

cd D:\Projects\vpn\backend
.\venv\Scripts\Activate.ps1
alembic revision --autogenerate -m "описание изменений"
alembic upgrade head              # Применить миграции
alembic downgrade -1              # Откатить последнюю
alembic history                   # История миграций
```

---

## 12. Переменные окружения

### backend/.env (разработка)
```
APP_NAME=Andigo
DEBUG=true
SECRET_KEY=dev-secret-key
DATABASE_URL=sqlite+aiosqlite:///./vpn.db
JWT_SECRET=dev-jwt-secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
MARZBAN_URL=http://localhost:8080
MARZBAN_USERNAME=admin
MARZBAN_PASSWORD=admin
TELEGRAM_BOT_TOKEN=         # Получить у @BotFather
TELEGRAM_WEBHOOK_URL=       # https://andigo.su/api/bot/webhook

# Cryptomus (крипто)
CRYPTOMUS_MERCHANT_ID=      # ID магазина в кабинете Cryptomus
CRYPTOMUS_API_KEY=          # API ключ

# Robokassa (карты/СБП)
ROBOKASSA_MERCHANT_LOGIN=
ROBOKASSA_PASSWORD1=        # Для создания платежа
ROBOKASSA_PASSWORD2=        # Для проверки webhook

DOMAIN=andigo.su
```

### deploy/marzban.env (Marzban на VDS)
```
UVICORN_HOST=0.0.0.0
UVICORN_PORT=8080
UVICORN_SSL_CERTFILE=/var/lib/marzban/ssl_cert.pem
UVICORN_SSL_KEYFILE=/var/lib/marzban/ssl_key.pem
UVICORN_SSL_CA_TYPE=private
SUDO_USERNAME=admin
SUDO_PASSWORD=сменить-пароль-в-проде
SQLALCHEMY_DATABASE_URL=sqlite:////var/lib/marzban/db.sqlite3
```
Примечание: SSL нужен для того, чтобы Marzban слушал на 0.0.0.0 (без SSL биндится только на 127.0.0.1). `UVICORN_SSL_CA_TYPE=private` позволяет использовать self-signed сертификаты.

---

## 13. Текущий статус

### Написано (весь код):
- Backend: FastAPI + все API + сервисы + модели + Alembic
- Frontend: React + все страницы + компоненты + API-клиент
- Telegram-бот: aiogram 3 + все handlers + keyboards
- Deploy: Docker Compose + Nginx + скрипты настройки VDS

### Выполнено (2026-03-30):
1. ~~Установить зависимости~~ -- passlib заменён на прямой bcrypt (несовместимость с Python 3.13)
2. ~~Создать первую миграцию Alembic~~ -- 5 таблиц, миграция применена
3. ~~Запустить и протестировать локально~~ -- бэкенд и фронтенд работают
4. ~~Исправить баги~~ -- passlib→bcrypt, type hint в bot.py, обработка ошибок в main.py
5. ~~Добавить seed-данные~~ -- тариф "Стандарт" (249р/мес), сервер NL, админ gysy545@gmail.com
6. ~~Ребрендинг~~ -- VPN Service → Andigo, домен andigo.su, VDS IP 37.230.115.104, цена 249р

7. ~~Подготовить VDS~~ -- Docker, UFW, SSH-ключ, проект в /opt/vpn/
8. ~~Задеплоить на VDS~~ -- docker compose up, 4 контейнера, http://37.230.115.104 работает

### Выполнено (2026-03-31):
9. ~~Настроить DNS~~ -- A-запись andigo.su → 37.230.115.104 добавлена в DNSmanager FirstVDS. Ждёт распространения (домен только что активирован)
10. ~~Nginx конфиг обновлён~~ -- server_name andigo.su, HTTPS-блок подготовлен (закомментирован)
11. ~~Дизайн лендинга утверждён~~ -- "ASCII Cinema / Darknet Gateway", спецификация в docs/design-spec.md
12. ~~Юридический анализ проведён~~ -- самозанятый + ЮКасса возможен, но VPN-бизнес в серой зоне (нужна лицензия ФСБ). Решение: работать как есть, принять риски

### Выполнено (2026-03-31, сессия 2):
13. ~~Админ-панель~~ -- 6 страниц: обзор, пользователи, подписки, платежи, серверы, тарифы
14. ~~Расширение API~~ -- новые эндпоинты: admin/subscriptions, admin/payments, admin/plans CRUD
15. ~~Смена email админа~~ -- admin@test.com → gysy545@gmail.com в seed.py

### Выполнено (2026-04-01):
16. ~~Система ролей~~ -- is_admin → role (owner/support/user), миграция Alembic, JWT с ролью
17. ~~Расширенная админка~~ -- подробности юзера (VPN/подписки/платежи/действия), управление VPN, сброс пароля, перевыпуск ключа, создание юзеров, смена ролей
18. ~~Ограничение доступа~~ -- AdminLayout фильтрует меню по роли, owner-only эндпоинты защищены

### Выполнено (2026-04-01, сессия 2):
19. ~~DNS проверен~~ -- andigo.su и www.andigo.su → 37.230.115.104 (Google DNS + Cloudflare)
20. ~~SSL получен~~ -- Let's Encrypt certbot, действует до 29.06.2026, HTTPS + HTTP→HTTPS редирект + HSTS + HTTP/2
21. ~~Автопродление SSL~~ -- cron на VDS: каждые 12ч (03:17, 15:17) certbot renew + nginx reload

### Выполнено (2026-04-01, сессия 3):
22. ~~Никнейм пользователя~~ -- поле nickname в модели User, Alembic миграция, PUT /api/auth/profile, редактирование в Settings
23. ~~Лендинг для авторизованных~~ -- хедер показывает имя/email вместо "Войти/Получить", CTA-кнопка "ВЫ ПОДКЛЮЧЕНЫ" (зелёная) если есть подписка, иначе ведёт на /subscription
24. ~~Фикс вылета аккаунта на лендинге~~ -- 401 interceptor не перенаправляет с публичных страниц (/, /login, /register)
25. ~~Фикс дёргания мобильных блоков~~ -- фиксированная высота текста в карточках фич (h-[4.5rem] overflow-hidden)
26. ~~Иконки откат~~ -- [S] → [>] для серверов, [⬅] → [←] для стрелки назад
27. ~~Toggle видимости пароля~~ -- кнопка [●]/[○] на Login и Register
28. ~~Цвет текста кнопки подписки~~ -- text-black на кнопке "Купить / Продлить"
29. ~~Привязка Telegram~~ -- в Settings: "Не привязан. Привязать" → ссылка на t.me/andigo_bot
30. ~~Elastic overscroll~~ -- мобильный таб-бар тянется и пружинит при свайпе (Samsung-like)
31. ~~Документация ролей~~ -- таблица разграничения доступа owner/support/user в CLAUDE.md
32. ~~Никнейм в Dashboard~~ -- приветствие whoami показывает nickname > email > "пользователь"
33. ~~has_active_subscription~~ -- добавлен в /api/auth/me для проверки подписки на лендинге

### Выполнено (2026-04-01, сессия 4):
34. ~~Привязка Telegram с сайта~~ -- deep-link механизм: POST /api/auth/telegram-link-token → t.me/ANDIGO_VpnBot?start=link_{token} → бот подтверждает привязку
35. ~~Смена email~~ -- PUT /api/auth/change-email (с подтверждением паролем)
36. ~~Никнейм в админке~~ -- nickname отображается в списке пользователей и подробностях
37. ~~Убран "Статус" из личного кабинета~~ -- пользователи больше не путают со статусом подписки
38. ~~ASCII-иконки в админ-действиях~~ -- все emoji заменены на [x]-стиль (наследуют цвет текста)
39. ~~Мобильный лендинг~~ -- карточки фич авто-высота на мобильных (текст не обрезается)
40. ~~Имя бота обновлено~~ -- andigo_bot → ANDIGO_VpnBot во всех ссылках

### Выполнено (2026-04-04):
41. ~~Мультигейт оплата~~ -- Cryptomus (крипто) + Robokassa (карты/СБП), абстрактный PaymentProvider
42. ~~Юридические документы~~ -- Оферта, Политика конфиденциальности, Пользовательское соглашение
43. ~~Юр. позиционирование~~ -- VPN как "защищённый доступ к интернету", данные самозанятого на сайте
44. ~~Footer со ссылками~~ -- все страницы содержат ссылки на оферту, политику, соглашение, телефон

### Не сделано (следующие шаги):
45. **Реализовать новый дизайн лендинга** -- ASCII Cinema стиль (спецификация: docs/design-spec.md)
46. **Настроить Telegram-бота** (получить токен у @BotFather для @ANDIGO_VpnBot)
47. **Настроить Cryptomus** (регистрация, получить merchant_id + api_key)
48. ~~Настроить Robokassa~~ -- регистрация как самозанятый, MD5 хеш, пароли записаны, webhook URL: /api/payments/webhook/robokassa (POST). Merchant login: andigosu
48.1. ~~Сохранить пароли Robokassa в проект~~ -- .env.example (andigosu, IFFZR612rRDV0nc9NyIC, dTe1q4jBmcNmt87AZw0b) + production .env на VDS + restart backend
49. **Смена пароля в личном кабинете** -- сброс старого + ввод нового (отложено)
50. **Фаза 2: Система поддержки** -- тикеты от пользователей + FAQ/база знаний (отдельная БД)

---

## 14. Ключевые решения (не менять без обсуждения)

- **3 роли: owner/support/user** -- строковое поле `role` вместо boolean `is_admin`. Owner = полный доступ, support = просмотр + VPN-управление, user = без админки
- **SQLite, НЕ PostgreSQL** -- экономия ~100 МБ RAM на VDS
- **Статический React через Vite** -- без Node.js на сервере, Nginx раздаёт файлы
- **aiogram встроен в FastAPI** -- один процесс, webhook mode, экономия RAM
- **ispmanager удалить с VDS** -- освобождает ~100-150 МБ RAM
- **Пинг серверов каждые 5 сек** через WebSocket, кеш в памяти
- **Один тариф** -- полный доступ ко всем серверам
- **Регистрация: email + Telegram** -- оба способа
- **Мультигейт оплата** -- Cryptomus (крипто от 0.4%) + Robokassa (карты/СБП ~3.5%)
- **Абстрактный интерфейс PaymentProvider** -- легко добавлять новые шлюзы
- **НЕ ЮКасса** -- отклонена из-за риска блокировки за VPN-тематику
- **Дизайн: ASCII Cinema / Darknet** -- чёрный фон, ASCII-анимация (символы текут), белая типографика, darknet-вайб. Спецификация: docs/design-spec.md
- **Юридическая формулировка** -- на сайте: "приватный доступ", "защищённое подключение". НЕ использовать: "обход блокировок", "анонимность". Слово "VPN" минимизировать
- **Позиционирование для платёжных систем** -- VPN позиционируется как "сервис защищённого доступа к интернету" (услуги шифрования трафика). Это правда, не обман. Все коммерческие VPN так формулируют. Категория: IT-услуги, не "VPN"
- **Юридические документы на сайте** -- Оферта (/offer), Политика конфиденциальности (/privacy, 152-ФЗ), Пользовательское соглашение (/terms). Ссылки в футере каждой страницы
- **Данные самозанятого** -- Многолет Михаил Юрьевич, ИНН 682805907931, тел. +7 (980) 538-26-48. Указаны в оферте и политике конфиденциальности
- **Самозанятый + Cryptomus** -- нет проверок, нет требований к юрлицу, VPN не проблема

---

## 15. Подключение новой VPN-ноды: дерево решений

Алгоритм подключения удалённой ноды (marzban-node) к основной панели (Marzban на FirstVDS).
Каждый шаг — с развилками "если так, то ... если иначе, то ...".

### Шаг 1: Установка ноды на удалённом сервере

```bash
curl -sSL https://github.com/Gozargah/Marzban-scripts/raw/master/marzban-node.sh | bash -s -- install
```

**Развилка:**
```
Установка завершена?
├─ ДА → перейти к Шагу 2
└─ НЕТ ("already installed", но сервис не запускается)
    │
    └─ systemctl status marzban-node → "Unit not found"?
        ├─ ДА → Нода установлена через Docker, не systemd!
        │   └─ Проверить: docker ps -a | grep marzban
        │       └─ Контейнер есть? → cd /opt/marzban-node && docker compose restart
        │           └─ Нет docker-compose.yml? → Удалить и переустановить
        └─ НЕТ → Другая ошибка, смотреть логи: journalctl -u marzban-node
```

### Шаг 2: Извлечь TLS-сертификат из основной панели

```bash
# На основной VDS (37.230.115.104)
ssh root@37.230.115.104 "
docker compose -f /opt/vpn/deploy/docker-compose.yml exec -T marzban python3 -c \"
import sqlite3
conn = sqlite3.connect('/var/lib/marzban/db.sqlite3')
cur = conn.cursor()
cur.execute('SELECT key, certificate FROM tls LIMIT 1')
row = cur.fetchone()
with open('/tmp/panel_key.pem', 'w') as f: f.write(row[0])
with open('/tmp/panel_cert.pem', 'w') as f: f.write(row[1])
print('Extracted key and cert')
\""
```

**КРИТИЧНО:** Эти сертификаты — то, чем панель аутентифицируется перед нодой через mTLS.
SERVICE_JWT_TOKEN НЕ НУЖЕН. Аутентификация нод — только через mTLS.

### Шаг 3: Настройка сертификатов на ноде

```bash
# Скопировать cert.pem на удалённую ноду как CA-сертификат
scp panel_cert.pem root@NODE_IP:/var/lib/marzban-node/cert.pem
```

**Развилка:**
```
Скопировано? Рестарт ноды?
├─ ДА → перейти к Шагу 4
└─ НЕТ → Подключение панели к ноде не работает (TCP RST / connection closed)
    │
    └─ Проверить: openssl x509 -in cert.pem -noout -text | grep "Version:"
        ├─ Version: 1 → OpenSSL 3.x отклоняет v1 как CA!
        │   └─→ Сгенерировать v3 CA с расширениями:
        │       openssl req -x509 -newkey rsa:4096 -keyout ca_key.pem -out ca_cert.pem
        │         -days 3650 -nodes -subj '/CN=MarzbanNode-CA'
        │         -addext 'basicConstraints=critical,CA:TRUE'
        │         -addext 'keyUsage=critical,keyCertSign,cRLSign'
        │       Затем подписать клиентский cert этим CA и обновить в панели
        │
        └─ Проверить логи ноды: docker compose logs --tail 20
            ├─ Есть записи от IP панели?
            │   ├─ ДА, но "503 Service Unavailable" → Xray не запущен → Шаг 3.1
            │   └─ НЕТ → TLS отвергает клиентский сертификат → проверить ca_cert.pem
```

### Шаг 3.1: Проверка Xray на ноде

```bash
# На удалённой ноде
/var/lib/marzban-node/xray-core/xray version
```

**Развилка:**
```
Xray работает?
├─ ДА → перейти к Шагу 4
└─ НЕТ
    │
    ├─ "command not found" / "binary not found"
    │   └─→ Скачать Xray вручную:
    │       wget https://github.com/XTLS/Xray-core/releases/download/v25.3.6/Xray-linux-64.zip
    │       unzip, xray → /var/lib/marzban-node/xray-core/xray
    │       chmod +x /var/lib/marzban-node/xray-core/xray
    │
    └─ Проверить geo-файлы:
        ls -la /var/lib/marzban-node/xray-core/*.dat
        ├─ geoip.dat = 0 bytes → Xray молча падает!
        │   └─→ curl -sL .../geoip.dat -o geoip.dat (скачать свежий)
        └─ geosite.dat отсутствует → то же самое
```

### Шаг 4: Обновить сертификаты в панели

```bash
# Если заменили CA на ноде — ОБНОВИТЬ клиентский cert в панели!
docker compose -f /opt/vpn/deploy/docker-compose.yml cp client_cert.pem marzban:/tmp/
docker compose -f /opt/vpn/deploy/docker-compose.yml cp client_key.pem marzban:/tmp/

docker exec deploy-marzban-1 python3 << 'PYEOF'
import sqlite3
with open('/tmp/client_cert.pem') as f: cert = f.read()
with open('/tmp/client_key.pem') as f: key = f.read()
conn = sqlite3.connect('/var/lib/marzban/db.sqlite3')
cur = conn.cursor()
cur.execute('UPDATE tls SET key=?, certificate=?', (key, cert))
conn.commit()
print('Updated TLS certificates in DB')
PYEOF

docker compose -f /opt/vpn/deploy/docker-compose.yml restart marzban
```

### Шаг 5: Проверка подключения

```bash
# Проверить статус ноды через API
docker exec deploy-marzban-1 python3 << 'PYEOF'
import requests, urllib3
urllib3.disable_warnings()
# Получить токен
token = requests.post("https://127.0.0.1:8080/api/admin/token",
    data={"username": "admin", "password": "..."}, verify=False).json()["access_token"]
# Статус нод
nodes = requests.get("https://127.0.0.1:8080/api/nodes",
    headers={"Authorization": f"Bearer {token}"}, verify=False).json()
for n in nodes:
    print(f"Node: {n['name']} | Status: {n['status']} | Xray: {n.get('xray_version','?')}")
PYEOF
```

**Развилка:**
```
Статус ноды?
├─ "connected" → ГОТОВО! Всё работает
├─ "disconnected" → Смотреть логи
│   ├─ "Unable to connect" → TCP/TLS проблема (Шаги 3-4)
│   ├─ "Unable to restart" → Xray проблема (Шаг 3.1)
│   └─ "Connected" → Подождать несколько секунд, статус скоро обновится
└─ "error" → Логи панели: docker compose logs marzban --tail 30
```

### Шаг 6: Доступ к панели через Nginx (порт 8888)

```
Nginx проксирует HTTPS на marzban:8080

Развилка:
curl -sk https://localhost:8888/ → ?
├─ 200 OK → Работает
└─ 502 Bad Gateway
    │
    ├─ Marzban слушает HTTPS (UVICORN_SSL_* env установлен)
    │   → nginx: proxy_pass https://marzban:8080 + proxy_ssl_verify off;
    │     (proxy_ssl_verify off потому что cert self-signed)
    │
    └─ Marzban слушает только 127.0.0.1 (нет SSL env)
        → Добавить SSL env vars обратно:
          UVICORN_SSL_CERTFILE, UVICORN_SSL_KEYFILE, UVICORN_SSL_CA_TYPE=private
        → docker compose restart marzban
```

---

## 15.1. Критические правила (запомнить навсегда)

- **Marzban без SSL env → биндится на 127.0.0.1.** Это hardcoded в main.py строка 88.
- **DEBUG=true в Marzban → падает** (пытается запустить npm, которого нет в контейнере).
- **X.509 v1 сертификаты → отклоняются OpenSSL 3.x.** Всегда использовать v3 с `basicConstraints=CA:TRUE`.
- **geoip.dat = 0 bytes → Xray молча падает.** Всегда проверять размер файлов.
- **SERVICE_JWT_TOKEN не нужен.** Аутентификация нод — через mTLS (cert + key из таблицы tls).
- **sshpass не работает на Windows.** Все команды с паролями запускать hop через VDS: `ssh root@vds "sshpass -p ... ssh root@node ..."`.

---

## 15.2. Журнал ошибок: Paris node (2026-04-03)

**#1: "no such table: core"**
- **Что:** Искал SERVICE_JWT_TOKEN в таблице `core` SQLite БД Marzban
- **Почему:** Предположил что JWT хранится в таблице core
- **Решение:** JWT не нужен. Механизм аутентификации нод — mTLS через таблицу `tls`
- **Урок:** Всегда проверять реальную схему БД, а не гадать

**#2: "already installed" но systemctl не находит**
- **Что:** Скрипт сказал node установлен, но `systemctl status marzban-node` → "Unit not found"
- **Почему:** Установка через Docker, не systemd
- **Решение:** `docker ps -a | grep marzban`, рестарт через `docker compose restart`
- **Урок:** Сперва проверять тип установки (systemd или Docker)

**#3: TCP RST после TLS handshake — САМАЯ ТРРДНАЯ ОШИБКА**
- **Что:** TCP handshake → TLS handshake OK → POST /connect отправлен → node шлёт TCP RST. В логах ноды ни одной записи от IP панели
- **Почему:** cert.pem был X.509 v1 (без basicConstraints:CA:TRUE). OpenSSL 3.x на Ubuntu 24.04 отклоняет v1 как CA при mTLS проверке. Соединение закрывается на TLS уровне ДО HTTP
- **Решение:** Сгенерировать X.509v3 CA cert с `basicConstraints=critical,CA:TRUE` и `keyUsage=keyCertSign,cRLSign`. Подписать клиентский cert этим CA. Обновить cert.pem на ноде и tls таблицу в панели
- **Урок:** v1 сертификаты без CA расширений = невидимый deadlock на Ubuntu 24.04. Всегда проверять `openssl x509 -text | grep "Version:"`

**#4: 503 Service Unavailable на /start**
- **Что:** mTLS подключился (/connect 200 OK), но /start возвращает 503
- **Почему:** geoip.dat = 0 байт — битый файл при копировании. Xray не может запуститься без валидных geo-файлов
- **Решение:** Скачать свежие geoip.dat и geosite.dat с github.com/Loyalsoldier/v2ray-rules-dat/
- **Урок:** Xray молча падает при отсутствующих/битых geo файлах

**#5: Xray binary not found**
- **Что:** Установщик marzban-node не скачал Xray автоматически
- **Почему:** Скрипт установки может не скачать Xray core
- **Решение:** Скачать вручную с github.com/XTLS/Xray-core/releases/ и поместить в /var/lib/marzban-node/xray-core/

**#6: Marzban слушает только 127.0.0.1**
- **Что:** UVICORN_HOST=0.0.0.0 в env, но Marzban биндится на 127.0.0.1:8080
- **Почему:** main.py строка 88: если нет SSL env vars → принудительно host='127.0.0.1'
- **Решение:** Добавить UVICORN_SSL_CERTFILE, UVICORN_SSL_KEYFILE, UVICORN_SSL_CA_TYPE=private
- **Урок:** Без SSL Marzban работает только на localhost. Для nginx прокси нужен SSL

**#7: DEBUG=true крашит Marzban**
- **Что:** Добавил DEBUG=true чтобы обойти 127.0.0.1 биндинг → Marzban не запускается
- **Почему:** debug mode пытается запустить `npm` для dev dashboard — в Docker контейнере нет npm
- **Решение:** Убрать DEBUG=true, использовать SSL env подход
- **Урок:** DEBUG=true работает только если npm доступен в контейнере

**#8: Nginx 502 Bad Gateway на порт 8888**
- **Что:** Nginx `proxy_pass http://marzban:8080` → 502
- **Почему:** Marzban слушает HTTPS (SSL env установлен), nginx шлёт HTTP
- **Решение:** `proxy_pass https://marzban:8080` + `proxy_ssl_verify off;`
- **Урок:** Nginx должен соответствовать протоколу Marzban (HTTP или HTTPS)

**#9: sshpass 'command not found' на Windows**
- **Что:** sshpass -p password ssh ... → command not found на Windows
- **Почему:** Git Bash на Windows не включает sshpass
- **Решение:** Запускать через VDS: `ssh root@vds "sshpass -p ... ssh root@node ..."`
- **Урок:** Все команды с паролями — только через hop на Linux VDS

**#10: Экранирование через тройной SSH**
- **Что:** Сложные команды с кавычками через ssh root@vds "sshpass ssh node 'python...'" ломаются
- **Почему:** Конфликт экранирования кавычек через несколько SSH прыжков
- **Решение:** Использовать heredoc (`<< 'PYEOF'`) или писать команды в файлы, запускать отдельно
- **Урок:** Тройной SSH + Python f-strings = кавычки ломаются. Делать шаги отдельно

---

## 16. Правила для Claude Code

- Весь код с **русскими комментариями**
- Не создавать лишних файлов
- Не добавлять фичи без обсуждения
- При структурных решениях -- обновлять этот CLAUDE.md
- **Качество > скорость**, думать глубоко
- Задавать уточняющие вопросы, если что-то неясно
- Команды заточены под **Windows 10 Pro (PowerShell)**
- Пользователь не кодер -- объяснять простым языком
