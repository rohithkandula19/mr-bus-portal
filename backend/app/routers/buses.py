from fastapi import APIRouter
from datetime import datetime, timedelta
import random, hashlib, math
from app.cities_loader import DB_CITIES, resolve_to_db_city, search_cities_with_state
from app.database import SessionLocal
from app.models import Bus

router = APIRouter(prefix="/buses", tags=["Buses"])

BUS_COMPANIES = [
    "MR Express", "BlueLine Express", "SwiftCoach", "EagleTransit",
    "CoastalRider", "PacificCoach", "MidwestExpress", "SouthernLines",
    "GreenLine Bus", "StarBus", "TransAmerica Bus", "PanAm Express"
]

def haversine(lat1, lng1, lat2, lng2):
    R = 3958.8
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat, dlng = lat2-lat1, lng2-lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def get_city_coords(city_name):
    try:
        from app.cities_loader import cities_df
        import pandas as pd
        if cities_df is not None:
            parts = city_name.split(",")
            name = parts[0].strip().lower()
            state = parts[1].strip().upper() if len(parts) > 1 else None
            matches = cities_df[cities_df["city"].str.lower() == name]
            if not matches.empty:
                if state:
                    sm = matches[matches["state_id"].str.upper() == state]
                    if not sm.empty:
                        row = sm.iloc[0]
                        return float(row["lat"]), float(row["lng"])
                # Pick by largest population
                matches = matches.copy()
                matches["population"] = pd.to_numeric(matches["population"], errors="coerce").fillna(0)
                row = matches.loc[matches["population"].idxmax()]
                return float(row["lat"]), float(row["lng"])
    except:
        pass
    return None, None

def calc_duration(origin, destination):
    lat1, lng1 = get_city_coords(origin)
    lat2, lng2 = get_city_coords(destination)
    if lat1 and lat2:
        miles = haversine(lat1, lng1, lat2, lng2)
        hours = max(miles / 55, 1.0)
        h = int(hours)
        m = int((hours - h) * 60)
        return f"{h}h {m:02d}m", round(miles)
    return "4h 00m", 300

def buses_from_db(origin: str, destination: str):
    db = SessionLocal()
    try:
        results = db.query(Bus).filter(
            Bus.origin == origin,
            Bus.destination == destination,
            Bus.is_active == True
        ).limit(50).all()
        if len(results) < 5:
            o = origin.split(",")[0].strip()
            d = destination.split(",")[0].strip()
            results2 = db.query(Bus).filter(
                Bus.origin.ilike(f"%{o}%"),
                Bus.destination.ilike(f"%{d}%"),
                Bus.is_active == True
            ).limit(50).all()
            if len(results2) > len(results):
                results = results2
        duration_text, distance = calc_duration(origin, destination)
        fresh = []
        for i, b in enumerate(results):
            rng = random.Random(int(hashlib.md5(f"{b.id}{b.origin}{b.destination}{i}".encode()).hexdigest(), 16) % 10**8)
            dep_hours = rng.randint(2, 168) + i * 7
            dep_minutes = rng.choice([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
            dep = (datetime.now() + timedelta(hours=dep_hours)).replace(minute=dep_minutes, second=0, microsecond=0)
            h = int(duration_text.split("h")[0])
            m_str = duration_text.split("h")[1].replace("m","").strip()
            m = int(m_str) if m_str else 0
            arr = dep + timedelta(hours=h + m/60)
            fresh.append({
                "id": b.id,
                "bus": b.bus,
                "origin": b.origin,
                "destination": b.destination,
                "departure": dep.strftime("%m-%d-%Y %H:%M"),
                "arrival": arr.strftime("%m-%d-%Y %H:%M"),
                "price": b.price,
                "total_seats": b.seats_total or 32,
                "available_seats": b.seats_total or 32,
                "duration": duration_text,
                "distance_miles": distance,
                "stops": ["Direct Route"] if distance < 200 else ["Central Stop"],
                "amenities": "WiFi,USB,AC",
            })
        return fresh
    finally:
        db.close()

def resolve_route(origin_query: str, destination_query: str):
    origin = resolve_to_db_city(origin_query.strip())
    destination = resolve_to_db_city(destination_query.strip())
    if origin and destination and origin.lower() != destination.lower():
        return [(origin, destination)]
    return []

@router.get("/search")
def search(origin: str = None, destination: str = None):
    if not origin or not destination:
        return []
    route_pairs = resolve_route(origin, destination)
    all_buses = []
    for origin_city, destination_city in route_pairs:
        all_buses.extend(buses_from_db(origin_city, destination_city))
    seen = set()
    unique = []
    for b in all_buses:
        if b["id"] not in seen:
            seen.add(b["id"])
            unique.append(b)
    unique.sort(key=lambda x: (x["price"], x["departure"]))
    return unique[:30]

@router.get("/count")
def count_buses():
    db = SessionLocal()
    try:
        total = db.query(Bus).filter(Bus.is_active == True).count()
        routes = db.query(Bus.origin, Bus.destination).distinct().count()
        return {"count": total, "routes": routes}
    finally:
        db.close()

@router.get("/cities")
def city_suggestions(q: str = "", limit: int = 8):
    if not q or len(q) < 2:
        return {"cities": []}
    results = search_cities_with_state(q, limit)
    return {"cities": results}
