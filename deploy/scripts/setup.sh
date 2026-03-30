#!/bin/bash
# Первоначальная настройка VDS (Ubuntu 24.04)
# Запускать от root: bash setup.sh

set -e

echo "=== Настройка VDS для VPN-сервиса ==="

# 1. Удаляем ispmanager (освобождаем RAM)
echo ">>> Удаление ispmanager..."
if command -v /usr/local/mgr5/sbin/mgrctl &> /dev/null; then
    apt-get remove --purge -y ispmanager* coremanager* || true
    apt-get autoremove -y
    echo "ispmanager удалён"
else
    echo "ispmanager не найден, пропускаем"
fi

# 2. Обновляем систему
echo ">>> Обновление системы..."
apt-get update && apt-get upgrade -y

# 3. Устанавливаем Docker
echo ">>> Установка Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker установлен"
else
    echo "Docker уже установлен"
fi

# 4. Устанавливаем Docker Compose
echo ">>> Проверка Docker Compose..."
docker compose version

# 5. Устанавливаем Git
apt-get install -y git

# 6. Настраиваем файрвол
echo ">>> Настройка UFW..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "Файрвол настроен"

# 7. Создаём swap (для 1 ГБ RAM)
echo ">>> Создание swap 1 ГБ..."
if [ ! -f /swapfile ]; then
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap создан"
else
    echo "Swap уже существует"
fi

echo ""
echo "=== Настройка завершена ==="
echo "Следующие шаги:"
echo "  1. Купи домен и настрой DNS (A-запись → IP сервера)"
echo "  2. Склонируй репозиторий: git clone <url> /opt/vpn"
echo "  3. Настрой .env файлы (backend/.env и deploy/marzban.env)"
echo "  4. Запусти: cd /opt/vpn/deploy && docker compose up -d"
echo "  5. Получи SSL: docker compose run certbot certonly --webroot -w /var/www/certbot -d your-domain.com"
echo ""
