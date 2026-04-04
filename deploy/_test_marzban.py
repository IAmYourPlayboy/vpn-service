"""Проверка HTTPS подключения к Marzban."""
import asyncio
import httpx


async def test():
    async with httpx.AsyncClient(verify=False) as c:
        # 1. Token
        r = await c.post(
            "https://marzban:8080/api/admin/token",
            data={"username": "admin", "password": "сменить-пароль-в-проде"},
        )
        print("Token:", r.status_code)
        if r.status_code != 200:
            print("  Response:", r.text[:200])
            return
        tok = r.json()["access_token"]
        headers = {"Authorization": "Bearer " + tok}

        # 2. System status
        r2 = await c.get("https://marzban:8080/api/system", headers=headers)
        print("System:", r2.status_code, r2.json().get("version", "?"))

        # 3. Nodes
        r3 = await c.get("https://marzban:8080/api/node", headers=headers)
        if r3.status_code == 200:
            nodes = r3.json()
            print("Nodes count:", len(nodes) if isinstance(nodes, list) else "N/A")
            if isinstance(nodes, list):
                for n in nodes:
                    name = n.get("name", "?")
                    status = n.get("status", "?")
                    xray = n.get("xray_version", "?")
                    print(f"  {name}: status={status} xray={xray}")

        # 4. Users count
        r4 = await c.get(
            "https://marzban:8080/api/users",
            params={"limit": 10},
            headers=headers,
        )
        data = r4.json() if r4.status_code == 200 else []
        print("Users:", r4.status_code, "total:", len(data) if isinstance(data, list) else "?")


asyncio.run(test())
