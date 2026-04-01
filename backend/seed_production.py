from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Bus
from app.cities_loader import DB_CITIES
from datetime import datetime, timedelta
import random, hashlib

DB_URL = "postgresql://mrbus_user:MrBus2026!@127.0.0.1:5432/mrbus_db"
engine = create_engine(DB_URL)
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

BUS_COMPANIES = ["MR Express","BlueLine Express","SwiftCoach","EagleTransit","CoastalRider","GreatPlains","PacificCoach","MidwestExpress","SouthernLines","GreenLine Bus"]

cities = list(DB_CITIES)
print(f"Seeding buses for {len(cities)} cities...")
total = 0

for origin in cities:
    for destination in cities:
        if origin == destination:
            continue
        rng = random.Random(int(hashlib.md5(f"{origin}{destination}".encode()).hexdigest(), 16) % 10**8)
        for j in range(3):
            dep = datetime.now() + timedelta(hours=rng.randint(2,168)+j*4)
            arr = dep + timedelta(hours=rng.randint(3,12))
            db.add(Bus(
                bus=rng.choice(BUS_COMPANIES),
                origin=origin, destination=destination,
                departure=dep.strftime("%m-%d-%Y %H:%M"),
                arrival=arr.strftime("%m-%d-%Y %H:%M"),
                price=rng.randint(25,150),
                seats_total=32, duration=f"{rng.randint(3,10)}h {rng.randint(0,59):02d}m",
                distance_miles=rng.randint(100,800), is_active=True
            ))
            total += 1
        if total % 10000 == 0:
            db.commit()
            print(f"Seeded {total} buses...")

db.commit()
print(f"Done! Total: {total} buses seeded into production!")
db.close()
