"""Клиент Marzban API — управление VPN-пользователями."""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class MarzbanClient:
    """HTTP-клиент для взаимодействия с Marzban API."""

    def __init__(self):
        self.base_url = settings.marzban_url
        self.username = settings.marzban_username
        self.password = settings.marzban_password
        self._token: str | None = None

    async def _get_token(self) -> str:
        """Получить токен авторизации Marzban."""
        if self._token:
            return self._token

        async with httpx.AsyncClient(verify=False) as client:
            response = await client.post(
                f"{self.base_url}/api/admin/token",
                data={
                    "username": self.username,
                    "password": self.password,
                },
            )
            response.raise_for_status()
            self._token = response.json()["access_token"]
            return self._token

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        """Выполнить запрос к Marzban API с авторизацией."""
        token = await self._get_token()
        headers = {"Authorization": f"Bearer {token}"}

        # Отключаем SSL-верификацию (self-signed cert)
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.request(
                method,
                f"{self.base_url}{path}",
                headers=headers,
                **kwargs,
            )

            # Токен истёк — обновляем и повторяем
            if response.status_code == 401:
                self._token = None
                token = await self._get_token()
                headers["Authorization"] = f"Bearer {token}"
                response = await client.request(
                    method,
                    f"{self.base_url}{path}",
                    headers=headers,
                    **kwargs,
                )

            response.raise_for_status()
            return response.json()

    async def create_user(self, username: str, data_limit_gb: int = 0) -> dict:
        """Создать VPN-пользователя в Marzban.

        Args:
            username: Уникальное имя пользователя (наш marzban_username)
            data_limit_gb: Лимит трафика в ГБ (0 = безлимит)

        Returns:
            Данные созданного пользователя (включая subscription_url)
        """
        payload = {
            "username": username,
            "proxies": {
                "shadowsocks": {
                    "method": "chacha20-ietf-poly1305",
                    "password": f"ss_{username[:20]}_pass",
                },
            },
            "inbounds": {
                "shadowsocks": ["Shadowsocks TCP"],
            },
            "data_limit": data_limit_gb * 1024 * 1024 * 1024 if data_limit_gb else 0,
            "status": "active",
        }

        result = await self._request("POST", "/api/user", json=payload)
        logger.info(f"Marzban: создан пользователь {username}")
        return result

    async def get_user(self, username: str) -> dict | None:
        """Получить данные VPN-пользователя."""
        try:
            return await self._request("GET", f"/api/user/{username}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise

    async def delete_user(self, username: str) -> bool:
        """Удалить VPN-пользователя."""
        try:
            await self._request("DELETE", f"/api/user/{username}")
            logger.info(f"Marzban: удалён пользователь {username}")
            return True
        except httpx.HTTPStatusError:
            return False

    async def disable_user(self, username: str) -> dict | None:
        """Деактивировать VPN-пользователя (подписка истекла)."""
        try:
            return await self._request(
                "PUT",
                f"/api/user/{username}",
                json={"status": "disabled"},
            )
        except httpx.HTTPStatusError:
            return None

    async def enable_user(self, username: str) -> dict | None:
        """Активировать VPN-пользователя (подписка продлена)."""
        try:
            return await self._request(
                "PUT",
                f"/api/user/{username}",
                json={"status": "active"},
            )
        except httpx.HTTPStatusError:
            return None

    async def get_subscription_link(self, username: str) -> str | None:
        """Получить ссылку подписки для пользователя."""
        user = await self.get_user(username)
        if user and "subscription_url" in user:
            return user["subscription_url"]
        return None

    async def get_system_stats(self) -> dict:
        """Получить статистику системы Marzban."""
        return await self._request("GET", "/api/system")

    async def get_nodes(self) -> list[dict]:
        """Получить список нод (серверов)."""
        try:
            return await self._request("GET", "/api/node")
        except httpx.HTTPStatusError:
            return []


# Синглтон клиента
marzban_client = MarzbanClient()


async def create_marzban_user(user_id: int) -> str:
    """Создать VPN-пользователя в Marzban (вызывается при активации подписки).

    Returns:
        marzban_username — имя пользователя в Marzban.
    """
    import uuid

    # Уникальное имя: vpn_user_{id}_{short_uuid}
    marzban_username = f"vpn_{user_id}_{uuid.uuid4().hex[:8]}"

    await marzban_client.create_user(username=marzban_username)
    return marzban_username
