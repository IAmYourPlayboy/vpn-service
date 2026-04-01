# Этап 1: сборка React-приложения
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Этап 2: копирование файлов в volume при каждом запуске
# Используем busybox вместо nginx — контейнер только копирует файлы и завершается
FROM busybox:latest
COPY --from=build /app/dist /build
# При каждом старте: очищаем старую сборку и копируем свежую
CMD sh -c "rm -rf /usr/share/nginx/html/* && cp -r /build/* /usr/share/nginx/html/ && echo '[frontend] Сборка обновлена'"
