import sqlite3
import traceback
try:
    c = sqlite3.connect('estoque.db')
    print("Tables:", c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall())
except Exception as e:
    traceback.print_exc()

import requests
try:
    resp = requests.get("http://localhost:8000/lista-compras/")
    print("Status:", resp.status_code)
    print("Body:", resp.text)
except Exception as e:
    traceback.print_exc()
