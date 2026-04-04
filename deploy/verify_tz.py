"""Прямая проверка дат через sqlite3 (без SQLAlchemy escaping)."""
import sqlite3
conn = sqlite3.connect("/app/vpn.db")
cur = conn.cursor()
cur.execute("SELECT id, created_at, last_login FROM users ORDER BY id LIMIT 5")
for row in cur.fetchall():
    print(f"User {row[0]}: created_at={row[1]} last_login={row[2]}")
conn.close()
