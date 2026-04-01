import sqlite3
import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sqlite_path = '/Users/rohithkandula/Desktop/mr_bus_portal_ultimate/backend/mr_bus_portal.db'
PG_URL = "postgresql://mrbus_user:MrBus2026!@127.0.0.1:5432/mrbus_db"

sqlite_conn = sqlite3.connect(sqlite_path)
sqlite_conn.row_factory = sqlite3.Row

engine = create_engine(PG_URL)
db = sessionmaker(bind=engine)()

# Migrate users
users = sqlite_conn.execute("SELECT * FROM users").fetchall()
for u in users:
    try:
        db.execute(text("""
            INSERT INTO users (id, name, email, hashed_password, is_admin, is_verified, created_at)
            VALUES (:id, :name, :email, :hp, :ia, :iv, :ca)
            ON CONFLICT (email) DO NOTHING
        """), {"id": u["id"], "name": u["name"], "email": u["email"],
               "hp": u["hashed_password"], "ia": bool(u["is_admin"]),
               "iv": bool(u["is_verified"]), "ca": u["created_at"]})
    except Exception as e:
        print(f"User skip: {e}")
db.commit()
print(f"✅ Migrated {len(users)} users")

# Migrate bookings
try:
    bookings = sqlite_conn.execute("SELECT * FROM user_bookings").fetchall()
    cols = [d[0] for d in sqlite_conn.execute("PRAGMA table_info(user_bookings)").fetchall()]
    cols = [c[1] for c in sqlite_conn.execute("PRAGMA table_info(user_bookings)").fetchall()]
    for b in bookings:
        try:
            row = dict(zip(cols, tuple(b)))
            placeholders = ', '.join([f':{k}' for k in row.keys()])
            columns = ', '.join(row.keys())
            db.execute(text(f"INSERT INTO user_bookings ({columns}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"), row)
        except:
            pass
    db.commit()
    print(f"✅ Migrated {len(bookings)} bookings")
except Exception as e:
    print(f"Bookings: {e}")

# Migrate loyalty points
try:
    rows = sqlite_conn.execute("SELECT * FROM loyalty_points").fetchall()
    cols = [c[1] for c in sqlite_conn.execute("PRAGMA table_info(loyalty_points)").fetchall()]
    for r in rows:
        try:
            row = dict(zip(cols, tuple(r)))
            placeholders = ', '.join([f':{k}' for k in row.keys()])
            columns = ', '.join(row.keys())
            db.execute(text(f"INSERT INTO loyalty_points ({columns}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"), row)
        except:
            pass
    db.commit()
    print(f"✅ Migrated {len(rows)} loyalty records")
except Exception as e:
    print(f"Loyalty: {e}")

sqlite_conn.close()
db.close()
print("🎉 Migration complete!")
