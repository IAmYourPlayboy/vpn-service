"""Проверка datetime после миграции (через sqlite3 напрямую, без SQLAlchemy)."""
import sqlite3
conn = sqlite3.connect("/app/vpn.db")
cur = conn.cursor()
print("=== USERS (first 5) ===")
cur.execute("SELECT id, created_at, last_login FROM users ORDER BY id LIMIT 5")
for row in cur.fetchall():
    print(f"  User {row[0]}: created_at={row[1]} last_login={row[2]}")
print()
print("=== SERVERS ===")
cur.execute("SELECT id, name, last_checked_at FROM servers")
for row in cur.fetchall():
    print(f"  Srv {row[0]}: name={row[1]} last_checked={row[2]}")
conn.close()
