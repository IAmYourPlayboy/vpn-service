FROM python:3.11-slim

WORKDIR /app

# Зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Установка таймзоны (для TZ env var в docker-compose)
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*

# Код
COPY . .

# Порт
EXPOSE 8000

# Запуск
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
