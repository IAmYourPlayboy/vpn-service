"""Проверка Marzban API."""
import urllib3
import requests

urllib3.disable_warnings()

BASE = "https://127.0.0.1:8080"

resp = requests.post(f"{BASE}/api/admin/token",
    data={"username": "admin", "password": "сменить-пароль-в-проде"},
    verify=False)
print(f"Token response: {resp.status_code}")

if resp.status_code == 200:
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("\n=== NODES ===")
    resp = requests.get(f"{BASE}/api/nodes", headers=headers, verify=False)
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        for n in resp.json():
            print(f"  {n.get('name')}: status={n.get('status')} xray={n.get('xray_version','?')}")

    print("\n=== USERS (first 20) ===")
    resp = requests.get(f"{BASE}/api/users", params={"limit": 50}, headers=headers, verify=False)
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        users = data.get("users") if isinstance(data, dict) else data
        print(f"  Total: {len(users) if users else 0}")
        if users:
            for u in users[:20]:
                username = u.get('username', '?')
                status = u.get('status', '?')
                expire = u.get('expire')
                data_limit = u.get('data_limit', '?')
                print(f"  {username}: status={status} expire={expire} data_limit={data_limit}")
else:
    print("ERROR! Response:", resp.text[:200])
