# Этап 1: сборка
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Этап 2: статика для Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
