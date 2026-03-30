# VPN-сервис -- CLAUDE.md

Этот файл описывает VPN-сервис для мини-бизнеса. Читай его при каждом новом сеансе.

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

- **Что:** VPN-сервис (мини-бизнес, десятки-сотни пользователей)
- **Подход:** Marzban (VPN-ядро) + кастомный фронтенд + Telegram-бот + оплата через ЮКасса
- **VDS:** Ubuntu 24.04, 1 CPU, 1 ГБ RAM, 15 ГБ SSD, 249 руб/мес
- **Старт:** всё на одном VDS, архитектура масштабируемая (будущие VPN-ноды в других странах)
- **Домен:** ещё не куплен, бренд не придуман
- **Статус:** весь код написан (69 файлов), но **ни разу не запускался** -- зависимости не установлены

---

## 3. Архитектура

```
Пользователи (сайт / TG-бот)
        |
        v
+----------------------------------------------+
|              VDS (1 ГБ RAM)                  |
|  Nginx (reverse proxy + статика React)       |
|  FastAPI (API + aiogram бот в одном процессе)|
|  SQLite (наша БД)    Marzban (VPN-ядро)     |
+----------------------------------------------+
        | (будущее)
   VPN-ноды в других странах
```

**RAM-бюджет:** OS ~200 МБ, Marzban ~250 МБ, FastAPI+бот ~150 МБ, Nginx ~20 МБ, свободно ~300 МБ + 1 ГБ swap.

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
| Оплата | YooKassa Python SDK |
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
│       │   ├── deps.py               # get_current_user (JWT), get_admin_user
│       │   ├── auth.py               # /register, /login, /telegram, /me, /link-email
│       │   ├── vpn.py                # /config (subscription link + QR)
│       │   ├── servers.py            # CRUD серверов + cached pings
│       │   ├── payments.py           # /create, /webhook (ЮКасса), /history
│       │   ├── admin.py              # /stats, /users, /ban, /unban
│       │   └── ws.py                 # WebSocket /ws/servers (реалтайм пинги)
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user.py               # id, email?, telegram_id?, password_hash?, is_active, is_admin
│       │   ├── plan.py               # id, name, price, duration_days, is_active
│       │   ├── subscription.py       # id, user_id, plan_id, marzban_username, status, expires_at
│       │   ├── payment.py            # id, user_id, subscription_id?, amount, yokassa_payment_id, status
│       │   └── server.py             # id, name, country, host, current_load, last_ping_ms, ping_status
│       ├── services/
│       │   ├── __init__.py
│       │   ├── auth.py               # bcrypt хеширование, JWT create/decode, Telegram HMAC verify
│       │   ├── marzban.py            # MarzbanClient: create/get/delete/disable/enable user, nodes, stats
│       │   ├── payment.py            # ЮКасса SDK: create_payment, get_payment
│       │   ├── subscription.py       # activate, check_expired, get_expiring
│       │   └── ping.py               # async ping, cache, ping_loop (5 сек), WebSocket push
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
│       │   └── Layout.tsx             # Sidebar (desktop) + tab bar (mobile), NavLink
│       └── pages/
│           ├── Landing.tsx            # Публичный лендинг: hero, фичи, тариф
│           ├── Login.tsx              # Форма входа (email + пароль)
│           ├── Register.tsx           # Форма регистрации
│           ├── Dashboard.tsx          # Дашборд: статус подписки, QR-код, конфиг
│           ├── Servers.tsx            # Серверы: WebSocket реалтайм пинги, флаги, цвет задержки
│           ├── Subscription.tsx       # Покупка/продление -> ЮКасса, история платежей
│           └── Settings.tsx           # Профиль, кнопка выхода
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
| password_hash | String, nullable | bcrypt (null если только Telegram) |
| is_active | Boolean, default True | |
| is_admin | Boolean, default False | |
| created_at | DateTime | |
| last_login | DateTime, nullable | |

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
| yokassa_payment_id | String, unique | ID платежа в ЮКасса |
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
GET  /api/auth/me           -- Текущий пользователь
POST /api/auth/link-email   -- Привязать email к аккаунту

# VPN
GET  /api/vpn/config        -- Subscription link + QR-код (base64)

# Серверы
GET  /api/servers            -- Список серверов с кешированными пингами
POST /api/servers            -- Добавить сервер (только админ)
DELETE /api/servers/{id}     -- Удалить сервер (только админ)

# Оплата
POST /api/payments/create    -- Создать платёж в ЮКасса
POST /api/payments/webhook   -- Webhook от ЮКасса (автоматический callback)
GET  /api/payments/history   -- История платежей текущего пользователя

# Админка
GET  /api/admin/stats        -- Статистика (юзеры, подписки, выручка)
GET  /api/admin/users        -- Список пользователей
POST /api/admin/users/{id}/ban   -- Забанить
POST /api/admin/users/{id}/unban -- Разбанить

# Реалтайм
WS   /ws/servers             -- WebSocket: пинги серверов каждые 5 сек

# Сервисное
POST /api/bot/webhook        -- Telegram webhook (aiogram)
GET  /api/health             -- Health check
```

**Авторизация:** JWT HS256, срок жизни 7 дней. Токен в заголовке `Authorization: Bearer <token>`.

---

## 8. Telegram-бот (aiogram 3)

Бот встроен в FastAPI процесс (webhook mode, один процесс на VDS).

```
/start -> авто-создание аккаунта по telegram_id + главное меню

Главное меню (InlineKeyboard):
  "Мой VPN"    -> статус подписки, конфиг (subscription link), QR-код
  "Серверы"    -> список серверов с пингами
  "Подписка"   -> купить/продлить -> ссылка на оплату ЮКасса
  "Настройки"  -> профиль (email, telegram_id)
  "Помощь"     -> инструкция подключения, FAQ
  "Админка"    -> статистика, юзеры (только owner, проверка is_admin)
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

**Защита маршрутов:** `ProtectedRoute` в App.tsx проверяет JWT в localStorage, редирект на `/login` если нет.

---

## 10. Пользовательские флоу

### Регистрация
- **Сайт:** email + пароль -> POST /api/auth/register -> JWT
- **Бот:** /start -> авто-создание по telegram_id (без пароля)

### Оплата
1. Пользователь нажимает "Купить" (сайт или бот)
2. POST /api/payments/create -> ЮКасса создаёт платёж -> redirect URL
3. Пользователь оплачивает на стороне ЮКасса
4. ЮКасса шлёт webhook на POST /api/payments/webhook
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
APP_NAME=VPN Service
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
TELEGRAM_WEBHOOK_URL=       # https://your-domain.com/api/bot/webhook
YOKASSA_SHOP_ID=            # Из личного кабинета ЮКасса
YOKASSA_SECRET_KEY=         # Из личного кабинета ЮКасса
DOMAIN=localhost
```

### deploy/marzban.env (Marzban на VDS)
```
UVICORN_HOST=0.0.0.0
UVICORN_PORT=8080
SUDO_USERNAME=admin
SUDO_PASSWORD=сменить-пароль-в-проде
SQLALCHEMY_DATABASE_URL=sqlite:////var/lib/marzban/db.sqlite3
```

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
5. ~~Добавить seed-данные~~ -- тариф "Стандарт" (299р/мес), сервер NL, админ admin@test.com

### Не сделано (следующие шаги):
6. **Настроить Telegram-бота** (получить токен у @BotFather)
7. **Настроить ЮКасса** (тестовый режим, shop_id + secret_key)
8. **Купить домен**, придумать бренд
9. **Подготовить VDS** (запустить setup.sh)
10. **Задеплоить на VDS** (git clone + docker compose up)

---

## 14. Ключевые решения (не менять без обсуждения)

- **SQLite, НЕ PostgreSQL** -- экономия ~100 МБ RAM на VDS с 1 ГБ
- **Статический React через Vite** -- без Node.js на сервере, Nginx раздаёт файлы
- **aiogram встроен в FastAPI** -- один процесс, webhook mode, экономия RAM
- **ispmanager удалить с VDS** -- освобождает ~100-150 МБ RAM
- **Пинг серверов каждые 5 сек** через WebSocket, кеш в памяти
- **Один тариф** -- полный доступ ко всем серверам
- **Регистрация: email + Telegram** -- оба способа
- **ЮКасса для оплаты** -- легитимный, SDK есть, документация полная
- **НЕ Kassa AI** -- исследована и отклонена (нет API/SDK, связана с заблокированной FreeKassa, регистрация в Казахстане, сомнительный сервис)

---

## 15. Правила для Claude Code

- Весь код с **русскими комментариями**
- Не создавать лишних файлов
- Не добавлять фичи без обсуждения
- При структурных решениях -- обновлять этот CLAUDE.md
- **Качество > скорость**, думать глубоко
- Задавать уточняющие вопросы, если что-то неясно
- Команды заточены под **Windows 10 Pro (PowerShell)**
- Пользователь не кодер -- объяснять простым языком
