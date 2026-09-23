import sqlite3
import json

conn = sqlite3.connect('kagaz_ai.db')
c = conn.cursor()
c.execute("SELECT id, ai_feedback FROM worksheets WHERE status='failed'")
rows = c.fetchall()
for r in rows:
    print(r)
