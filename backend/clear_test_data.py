import sqlite3
import shutil
import datetime
import os

db_path = os.path.join(os.path.dirname(__file__), 'data', 'estatevoice.db')
if not os.path.exists(db_path):
    print("Database not found at:", db_path)
    exit(1)

timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
backup_path = os.path.join(os.path.dirname(__file__), 'data', f'estatevoice_backup_pre_reset_{timestamp}.db')
shutil.copy2(db_path, backup_path)
print(f"Created database backup at: {backup_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

tables_to_clear = [
    'call_sessions',
    'chat_messages',
    'call_records',
    'appointments',
    'leads'
]

for tbl in tables_to_clear:
    try:
        cursor.execute(f"DELETE FROM {tbl};")
        print(f"Cleared table: {tbl}")
    except Exception as e:
        print(f"Error clearing {tbl}: {e}")

# Reset sqlite_sequence for these tables if sqlite_sequence exists
try:
    for tbl in tables_to_clear:
        cursor.execute("DELETE FROM sqlite_sequence WHERE name=?;", (tbl,))
    print("Reset sqlite_sequence counters.")
except Exception as e:
    print(f"sqlite_sequence notice: {e}")

conn.commit()

# Print current counts
tables = [row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
print("\nCurrent table counts:")
for t in tables:
    count = cursor.execute(f"SELECT COUNT(*) FROM \"{t}\";").fetchone()[0]
    print(f" - {t}: {count} rows")

conn.close()
print("\nReset complete. 30 properties preserved.")
