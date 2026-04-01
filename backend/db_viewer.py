"""
DB Viewer — простой веб-просмотрщик SQLite БД Andigo.
Запуск: python db_viewer.py
Открыть: http://localhost:8888
"""

import sqlite3
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

DB_PATH = "vpn.db"
PORT = 8888


def get_db_data():
    """Читает все таблицы из БД и возвращает dict."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [r[0] for r in cur.fetchall()]

    result = {}
    for table in tables:
        cur.execute(f"PRAGMA table_info([{table}])")
        columns = [r[1] for r in cur.fetchall()]

        cur.execute(f"SELECT * FROM [{table}]")
        rows = []
        for row in cur.fetchall():
            rows.append([str(v) if v is not None else "" for v in row])

        result[table] = {"columns": columns, "rows": rows}

    conn.close()
    return result


def build_html():
    """HTML-страница с таблицами."""
    data = get_db_data()

    tables_html = ""
    nav_html = ""

    for table_name, info in data.items():
        count = len(info["rows"])
        nav_html += f'<a href="#{table_name}" class="nav-link">{table_name} <span class="badge">{count}</span></a>\n'

        headers = "".join(f"<th>{c}</th>" for c in info["columns"])
        rows = ""
        for row in info["rows"]:
            cells = "".join(f"<td>{v}</td>" for v in row)
            rows += f"<tr>{cells}</tr>\n"

        tables_html += f"""
        <div class="table-section" id="{table_name}">
            <h2>{table_name} <span class="count">({count})</span></h2>
            <div class="table-wrap">
                <table>
                    <thead><tr>{headers}</tr></thead>
                    <tbody>{rows if rows else '<tr><td colspan="99" class="empty">no data</td></tr>'}</tbody>
                </table>
            </div>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Andigo DB Viewer</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    background: #000; color: #ccc; padding: 20px;
}}
h1 {{ color: #fff; margin-bottom: 8px; font-size: 24px; }}
.subtitle {{ color: #555; font-size: 13px; margin-bottom: 24px; }}
.nav {{ display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 32px; }}
.nav-link {{
    color: #888; text-decoration: none; padding: 6px 14px;
    border: 1px solid #222; font-size: 13px; transition: all 0.2s;
}}
.nav-link:hover {{ color: #fff; border-color: #555; }}
.badge {{ color: #00ff41; font-size: 11px; }}
.table-section {{ margin-bottom: 40px; }}
h2 {{ color: #fff; font-size: 16px; margin-bottom: 12px; }}
.count {{ color: #555; font-weight: normal; font-size: 13px; }}
.table-wrap {{ overflow-x: auto; }}
table {{ border-collapse: collapse; width: 100%; font-size: 12px; }}
th {{
    background: #0a0a0a; color: #00ff41; text-align: left;
    padding: 8px 12px; border: 1px solid #222; white-space: nowrap;
}}
td {{
    padding: 6px 12px; border: 1px solid #1a1a1a;
    max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}}
tr:hover td {{ background: #0a0a0a; }}
.empty {{ text-align: center; color: #444; padding: 20px; }}
</style>
</head>
<body>
<h1>$ andigo db --view</h1>
<div class="subtitle">SQLite: {DB_PATH} | Auto-refresh: F5</div>
<nav class="nav">{nav_html}</nav>
{tables_html}
</body>
</html>"""


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/data":
            data = get_db_data()
            body = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(body)
        else:
            body = build_html().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(body)

    def log_message(self, format, *args):
        pass  # тихий режим


if __name__ == "__main__":
    print(f"DB Viewer: http://localhost:{PORT}")
    print(f"Database:  {DB_PATH}")
    print("Ctrl+C to stop")
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
