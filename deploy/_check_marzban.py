"""Проверка Marzban API - кто зарегистрирован."""
import asyncio
import urllib3
import requests

# Отключить проверку SSL
urllib3.disable_warnings()

BASE = "https://127.0.0.1:8080"

# Получить токен
resp = requests.post(f"{BASE}/api/admin/token",
    data={"username": "admin", "password": "change-me-in-production"},
    verify=False)
print(f"Token response: {resp.status_code}")

if resp.status_code == 200:
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Проверка узлов
    print("\n=== NODES ===")
    resp = requests.get(f"{BASE}/api/nodes", headers=headers, verify=False)
    for node in resp.json():
        print(f"  {node['name']}: status={node.get('status')} xray={node.get('xray_version','?')}")

    # Пользователи Marzban
    print("\n=== MARZBAN USERS ===")
    resp = requests.get(f"{BASE}/api/users", params={"limit": 50}, headers=headers, verify=False)
    users = resp.json() if resp.status_code == 200 else []
    if isinstance(users, dict) and "users" in users:
        users = users["users"]
    print(f"  Total users in Marzban: {len(users)}")
    for u in users:
        print(f"  username={u.get('username')} status={u.get('status')} expire={u.get('expire')} proxies={u.get('proxies',{})}")
else:
    print("ERROR: Cannot get token!")
    print(resp.text)
