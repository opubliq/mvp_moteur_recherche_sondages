import sqlite3

conn = sqlite3.connect("surveys_bd.sqlite")
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
print("Tables dans la base :", tables)
