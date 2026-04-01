import random
from datetime import datetime, timedelta
from app.cities_loader import get_all_cities

cities = get_all_cities()

buses = []

for i in range(10000):

    origin = random.choice(cities)
    destination = random.choice(cities)

    if origin != destination:

        buses.append({
            "id": i,
            "bus": "MR Express",
            "origin": origin,
            "destination": destination,
            "departure": (datetime.now() + timedelta(hours=random.randint(1,200))).strftime("%Y-%m-%d %H:%M"),
            "price": random.randint(20,150)
        })

print(f"Successfully generated {len(buses)} bus routes!")