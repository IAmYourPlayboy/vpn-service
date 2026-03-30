# AI Context — Andigo (VPN-сервис)

> Этот файл — полный контекст для AI-ассистента, продолжающего работу над проектом.
> Читай его в начале каждого сеанса вместе с CLAUDE.md.

---

## Кто пользователь

- **Не программист** — весь код пишет AI, пользователь не знает код
- Работает один, без команды
- Язык общения: **русский**. Английский только для кода/терминов
- Ценит **качество > скорость** — думай глубоко, не торопись
- Не ограничивай длину ответов

## Окружение

| Параметр | Значение |
|---|---|
| ОС | Windows 10 Pro |
| Python | 3.13.12 |
| Node.js | установлен |
| Docker | Docker Desktop установлен |
| Проект | `D:\Projects\vpn` (бренд: **Andigo**) |
| Домен | **andigo.su** |
| VDS | 1 vCPU, 2 ГБ RAM, 40 ГБ SSD, Ubuntu 24.04, IP: **37.230.115.104** |
| Backend venv | `backend/venv` (зависимости установлены) |
| Frontend | `frontend/node_modules` (зависимости установлены) |
| БД | `backend/vpn.db` (SQLite, 5 таблиц через Alembic) |
| Git | инициализирован, remote: `git@github.com:IAmYourPlayboy/vpn-service.git` |
| SSH-ключ | `~/.ssh/id_ed25519` (ed25519, добавлен на GitHub) |
| GitHub CLI | `gh` v2.89.0 установлен, **НЕ авторизован** |

---

## Как запускать

### Бэкенд (FastAPI)
```bash
cd D:\Projects\vpn\backend
PYTHONPATH=. PYTHONIOENCODING=utf-8 venv/Scripts/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- **PYTHONPATH=.** — обязательно, иначе `from app.xxx` падает с ModuleNotFoundError
- **PYTHONIOENCODING=utf-8** — обязательно на Windows, иначе русский текст в логах вызывает UnicodeEncodeError (cp1252)
- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

### Фронтенд (React + Vite)
```bash
cd D:\Projects\vpn\frontend
npm run dev
```
- Откроется на http://localhost:5173
- Vite прокси: `/api` → `localhost:8000`, `/ws` → `ws://localhost:8000`

### Alembic (миграции БД)
```bash
cd D:\Projects\vpn\backend
PYTHONPATH=. venv/Scripts/alembic revision --autogenerate -m "описание"
PYTHONPATH=. venv/Scripts/alembic upgrade head
```

### Seed-данные
```bash
cd D:\Projects\vpn\backend
venv/Scripts/python seed.py
```
Скрипт сам проверяет, есть ли данные — повторный запуск безопасен.

---

## Что сделано (2026-03-30)

1. **passlib заменён на прямой bcrypt** — passlib 1.7.4 несовместим с Python 3.13 + bcrypt 5.0. В `requirements.txt` теперь `bcrypt>=4.0.0`. Код в `backend/app/services/auth.py` использует `bcrypt.hashpw()` / `bcrypt.checkpw()` напрямую.

2. **Все зависимости установлены** — pip install (backend), npm install (frontend)

3. **БД создана** — Alembic миграция `31bdd89fbeef_initial.py`, 5 таблиц: users, plans, subscriptions, payments, servers

4. **Seed-данные добавлены:**
   - Тариф "Стандарт" — 249 руб, 30 дней
   - Сервер "Нидерланды #1" — NL, 37.230.115.104
   - Админ — admin@test.com / admin123 (is_admin=True)

5. **Бэкенд проверен** — все 15+ API эндпоинтов работают: регистрация, вход, /me, /servers, /admin/stats, health

6. **Фронтенд проверен** — TypeScript без ошибок, Vite прокси настроен

7. **Мелкие фиксы:**
   - `backend/app/bot/bot.py:17` — type hint: `tuple[Bot | None, Dispatcher | None]`
   - `backend/app/main.py` — try/except для webhook setup, safe cancel для ping_task
   - `frontend/src/pages/Dashboard.tsx` — добавлено приветствие с user.email

8. **Git + GitHub** — первый коммит (72 файла), SSH-ключ, push на `IAmYourPlayboy/vpn-service`

9. **Удалены 6 некорректных файлов ревью** от предыдущего Claude (содержали ложные баги)

10. **CLAUDE.md обновлён** — пути `впн` → `vpn`, статус обновлён

11. **Ребрендинг (2026-03-30):** VPN Service → **Andigo**, домен **andigo.su**, VDS IP **37.230.115.104**, цена **249 руб/мес**

---

## ВАЖНО: Ложные баги — НЕ применять!

Предыдущий Claude создал файлы ревью с ошибочными "критическими багами". Они удалены, но если ты обнаружишь те же "проблемы" — **это ложные находки**:

| "Баг" | Почему это НЕ баг |
|---|---|
| JWT `"exp": expire` нужен `int(timestamp)` | python-jose сама конвертирует datetime → Unix timestamp в encode() |
| Alembic нужен `get_section_dict()` | Метод `get_section_dict()` НЕ СУЩЕСТВУЕТ. `get_section()` — корректен |
| Нет `await db.commit()` в link_email | `get_db()` в database.py делает auto-commit после yield |
| Hardcoded secrets в config.py | `.env` файл перекрывает дефолты. В проде будут реальные значения |

---

## Где мы остановились

Весь код написан и работает локально. Следующие шаги:

### 7. Настроить Telegram-бота
- Получить токен у @BotFather
- Вписать `TELEGRAM_BOT_TOKEN` в `backend/.env`
- Для локальной разработки можно использовать polling вместо webhook
- Код бота полностью написан: `backend/app/bot/`

### 8. Настроить ЮКасса
- Зарегистрироваться, получить тестовый shop_id + secret_key
- Вписать `YOKASSA_SHOP_ID` и `YOKASSA_SECRET_KEY` в `backend/.env`
- Код оплаты: `backend/app/services/payment.py`, `backend/app/api/payments.py`

### 9. Подготовить VDS
- Ubuntu 24.04, 1 vCPU, 2 ГБ RAM, 40 ГБ SSD, IP: 37.230.115.104
- Скрипт настройки: `deploy/scripts/setup.sh`

### 10. Задеплоить на VDS
- `deploy/docker-compose.yml` — 5 сервисов (nginx, backend, marzban, frontend build, certbot)
- `deploy/scripts/deploy.sh` — git pull + docker compose up

---

## Архитектура (краткая)

```
Пользователи (сайт / TG-бот)
        |
        v
   Nginx (reverse proxy + статика React)
   FastAPI (API + aiogram бот в одном процессе)
   SQLite (наша БД)    Marzban (VPN-ядро, Docker)
```

- **Backend:** FastAPI + aiogram 3 (webhook mode) + SQLAlchemy async + Alembic + SQLite
- **Frontend:** React 19 + Vite 6 + Tailwind CSS 3 + TypeScript 5
- **VPN-ядро:** Marzban (отдельный Docker-контейнер)
- **Оплата:** ЮКасса Python SDK
- **Деплой:** Docker Compose + Nginx + Let's Encrypt

Подробная архитектура, модель данных, все API — в `CLAUDE.md`.

---

## Структура проекта (ключевые файлы)

```
vpn/
├── CLAUDE.md                    # Полная документация проекта
├── AI_CONTEXT.md                # Этот файл — контекст для AI
├── .gitignore
├── backend/
│   ├── .env                     # Переменные окружения (не в git)
│   ├── .env.example             # Шаблон
│   ├── requirements.txt         # Python-зависимости (bcrypt, НЕ passlib)
│   ├── seed.py                  # Начальные данные
│   ├── vpn.db                   # SQLite база (не в git)
│   ├── venv/                    # Python venv (не в git)
│   ├── alembic/                 # Миграции
│   │   └── versions/31bdd89fbeef_initial.py
│   └── app/
│       ├── main.py              # FastAPI entrypoint + lifespan
│       ├── config.py            # Pydantic Settings
│       ├── database.py          # Async SQLAlchemy + session
│       ├── api/                 # 8 файлов (auth, vpn, servers, payments, admin, ws, schemas, deps)
│       ├── models/              # 5 моделей (user, plan, subscription, payment, server)
│       ├── services/            # 5 сервисов (auth, marzban, payment, subscription, ping)
│       └── bot/                 # Telegram-бот (bot.py + 7 handlers + keyboards)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts           # Прокси /api → localhost:8000
│   └── src/
│       ├── App.tsx              # Роутинг + ProtectedRoute
│       ├── api/client.ts        # Axios + JWT interceptor
│       └── pages/               # 7 страниц (Landing, Login, Register, Dashboard, Servers, Subscription, Settings)
└── deploy/
    ├── docker-compose.yml       # 5 сервисов
    ├── nginx/default.conf       # Reverse proxy
    └── scripts/                 # setup.sh, deploy.sh
```

---

## Git

- **Remote:** `git@github.com:IAmYourPlayboy/vpn-service.git` (SSH)
- **Branch:** `main`
- **Последний коммит:** Initial commit (72 файла, 7426 строк)
- **Git config (локальный):** user.name=IAmYourPlayboy, user.email=gysy545@gmail.com
