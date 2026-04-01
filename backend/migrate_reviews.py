import os, sys
sys.path.insert(0, '/Users/rohithkandula/Desktop/mr_bus_portal_ultimate/backend')
os.environ['DATABASE_URL'] = 'postgresql://mrbus_user:MrBus2026!@localhost:5432/mrbus_db'
from app.database import engine
from sqlalchemy import text

cols = [
    "ALTER TABLE bus_reviews ADD COLUMN IF NOT EXISTS user_name VARCHAR",
    "ALTER TABLE bus_reviews ADD COLUMN IF NOT EXISTS origin VARCHAR",
    "ALTER TABLE bus_reviews ADD COLUMN IF NOT EXISTS destination VARCHAR",
    "ALTER TABLE bus_reviews ADD COLUMN IF NOT EXISTS review_text TEXT",
    "ALTER TABLE bus_reviews ADD COLUMN IF NOT EXISTS tags VARCHAR",
    "ALTER TABLE bus_reviews ALTER COLUMN bus_id DROP NOT NULL",
    "ALTER TABLE bus_reviews ALTER COLUMN transaction_id DROP NOT NULL",
]
with engine.connect() as conn:
    for sql in cols:
        try:
            conn.execute(text(sql))
            print(f"OK: {sql[:60]}")
        except Exception as e:
            print(f"Skip: {e}")
    conn.commit()
print("Migration done!")
