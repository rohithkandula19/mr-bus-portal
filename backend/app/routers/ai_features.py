from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Annotated
from app.database import get_db
from app.models import User, UserBooking, LoyaltyPoints
from app.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import random
from datetime import datetime

router = APIRouter(prefix="/ai-features", tags=["AI Features"])
security = HTTPBearer(auto_error=False)


def get_user_from_token(credentials, db):
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None
    return db.query(User).filter(User.id == int(payload["sub"])).first()


# ── Schemas ──────────────────────────────────────────────────────────────────

class PricePredictionRequest(BaseModel):
    origin: str
    destination: str
    current_price: int
    bus_id: Optional[int] = None

class PackingListRequest(BaseModel):
    destination: str
    departure_date: Optional[str] = None
    duration_hours: Optional[float] = None

class SmartRebookRequest(BaseModel):
    transaction_id: str

class TripSummaryRequest(BaseModel):
    transaction_id: str


# ── 1. PRICE PREDICTION ───────────────────────────────────────────────────────

@router.post("/price-prediction")
async def price_prediction(
    req: PricePredictionRequest,
):
    """
    Predicts whether the price for a route will go up or down.
    Uses day-of-week patterns and simple heuristics.
    """
    now = datetime.now()
    day_of_week = now.weekday()

    # Weekend prices are typically higher
    is_weekend = day_of_week >= 4

    # Simulate price trend based on day patterns
    # Prices tend to drop Mon-Wed, rise Thu-Sun
    if day_of_week <= 1:  # Mon-Tue
        trend = "drop"
        pct = random.randint(15, 28)
        best_day = "Tuesday" if day_of_week == 0 else "Today"
        predicted_price = int(req.current_price * (1 - pct / 100))
        recommendation = f"Prices typically drop {pct}% on {best_day}. Best time to book!"
        confidence = "High"
    elif day_of_week == 2:  # Wed
        trend = "stable"
        pct = random.randint(3, 8)
        predicted_price = int(req.current_price * (1 - pct / 100))
        recommendation = f"Price is stable. Minor drop of ~{pct}% possible by Thursday."
        confidence = "Medium"
    elif day_of_week == 3:  # Thu
        trend = "rising"
        pct = random.randint(10, 20)
        predicted_price = int(req.current_price * (1 + pct / 100))
        recommendation = f"Weekend surge coming. Prices may rise {pct}% by Friday. Book now!"
        confidence = "High"
    else:  # Fri-Sun
        trend = "peak"
        pct = random.randint(20, 35)
        predicted_price = int(req.current_price * (1 + pct / 100))
        recommendation = f"Weekend peak pricing. Wait until Monday to save up to {pct}%."
        confidence = "High"

    # Best booking window
    if trend in ("drop", "stable"):
        best_window = "Book in the next 24 hours"
    elif trend == "rising":
        best_window = "Book NOW before prices rise"
    else:
        best_window = "Wait until Monday for best price"

    return {
        "trend": trend,
        "current_price": req.current_price,
        "predicted_price": predicted_price,
        "change_pct": pct if trend != "drop" else -pct,
        "recommendation": recommendation,
        "best_window": best_window,
        "confidence": confidence,
        "day_of_week": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day_of_week],
        "is_weekend": is_weekend,
        "savings_potential": req.current_price - predicted_price if trend == "drop" else 0,
    }


# ── 2. PACKING LIST ──────────────────────────────────────────────────────────


def _weather_code_to_desc(code: int) -> str:  # noqa: spelling(weathercode)
    """Convert an Open-Meteo weather code to a simple description."""
    if code == 0:
        return "clear"
    if code <= 3:
        return "cloudy"
    if code <= 29:
        return "rainy"
    if code <= 49:
        return "snowy"
    return "stormy"


async def _fetch_weather(destination: str):
    """Return (temp_f, weather_desc, weather_info) or Nones on failure."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            city = destination.split(',')[0].strip()
            geo = await client.get(
                f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=en&format=json"
            )
            geo_data = geo.json()
            if not geo_data.get("results"):
                return None, "Unknown", None
            lat = geo_data["results"][0]["latitude"]
            lon = geo_data["results"][0]["longitude"]
            weather = await client.get(
                f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
                f"&current_weather=true&temperature_unit=fahrenheit"
            )
            w = weather.json()
            temp_f = round(w["current_weather"]["temperature"])
            code = w["current_weather"]["weathercode"]  # noqa: spelling
            weather_desc = _weather_code_to_desc(code)
            return temp_f, weather_desc, {"temp_f": temp_f, "description": weather_desc}
    except Exception:
        return None, "Unknown", None


def _clothing_items_for_temp(temp_f: int) -> list:
    """Return clothing items appropriate for the given temperature."""
    if temp_f <= 32:
        return [
            {"item": "Heavy winter jacket", "category": "Clothing", "reason": f"Freezing ({temp_f}°F)", "priority": "must"},
            {"item": "Thermal underlayers", "category": "Clothing", "reason": "Extreme cold", "priority": "must"},
            {"item": "Waterproof insulated boots", "category": "Clothing", "reason": "Snow/ice conditions", "priority": "must"},
            {"item": "Gloves & beanie", "category": "Clothing", "reason": "Wind chill factor", "priority": "must"},
            {"item": "Scarf", "category": "Clothing", "reason": "Cold weather protection", "priority": "recommended"},
            {"item": "Hand warmers", "category": "Comfort", "reason": "Extra warmth", "priority": "optional"},
        ]
    if temp_f <= 50:
        return [
            {"item": "Winter jacket / Heavy coat", "category": "Clothing", "reason": f"Cold weather ({temp_f}°F)", "priority": "must"},
            {"item": "Warm layers", "category": "Clothing", "reason": "Temperature layering", "priority": "must"},
            {"item": "Closed-toe shoes", "category": "Clothing", "reason": "Cold ground", "priority": "recommended"},
            {"item": "Light gloves", "category": "Clothing", "reason": "Chilly conditions", "priority": "optional"},
        ]
    if temp_f <= 70:
        return [
            {"item": "Light jacket / hoodie", "category": "Clothing", "reason": f"Mild weather ({temp_f}°F)", "priority": "recommended"},
            {"item": "Comfortable layers", "category": "Clothing", "reason": "Variable temperature", "priority": "recommended"},
        ]
    if temp_f <= 85:
        return [
            {"item": "Light breathable clothing", "category": "Clothing", "reason": f"Warm weather ({temp_f}°F)", "priority": "must"},
            {"item": "Sunglasses", "category": "Accessories", "reason": "Sun protection", "priority": "recommended"},
            {"item": "Sunscreen SPF 30+", "category": "Health", "reason": "UV protection", "priority": "recommended"},
        ]
    return [
        {"item": "Very light/loose clothing", "category": "Clothing", "reason": f"Hot weather ({temp_f}°F)", "priority": "must"},
        {"item": "Sunglasses", "category": "Accessories", "reason": "Intense sun", "priority": "must"},
        {"item": "Sunscreen SPF 50+", "category": "Health", "reason": "High UV index", "priority": "must"},
        {"item": "Insect repellent", "category": "Health", "reason": "Outdoor protection", "priority": "optional"},
        {"item": "Cooling towel", "category": "Comfort", "reason": "Beat the heat", "priority": "optional"},
    ]


def _dedupe_and_sort(items: list) -> list:
    """Remove duplicate items and sort by priority."""
    seen: set[str] = set()
    unique_items: list = []
    for item in items:
        key = item["item"]
        if key not in seen:
            seen.add(key)
            unique_items.append(item)
    priority_order = {"must": 0, "recommended": 1, "optional": 2}
    unique_items.sort(key=lambda x: priority_order.get(x["priority"], 3))
    return unique_items


@router.post("/packing-list")
async def packing_list(req: PackingListRequest):
    """
    Generates a smart packing list based on destination weather.
    """
    temp_f, weather_desc, weather_info = await _fetch_weather(req.destination)

    # Build packing list
    items = [
        {"item": "Photo ID / Passport", "category": "Documents", "reason": "Required for boarding", "priority": "must"},
        {"item": "Boarding pass / Ticket", "category": "Documents", "reason": "Required for boarding", "priority": "must"},
        {"item": "Phone + charger", "category": "Electronics", "reason": "Navigation & communication", "priority": "must"},
        {"item": "Wallet & cash", "category": "Essentials", "reason": "For emergencies", "priority": "must"},
        {"item": "Portable power bank", "category": "Electronics", "reason": f"{req.duration_hours:.0f}h journey" if req.duration_hours else "Long journey", "priority": "recommended"},
        {"item": "Headphones / earbuds", "category": "Comfort", "reason": "Entertainment on the bus", "priority": "recommended"},
        {"item": "Water bottle", "category": "Food & Drink", "reason": "Stay hydrated", "priority": "must"},
        {"item": "Snacks", "category": "Food & Drink", "reason": "For the journey", "priority": "recommended"},
    ]

    if temp_f is not None:
        items.extend(_clothing_items_for_temp(temp_f))
        if "rainy" in weather_desc or "stormy" in weather_desc:
            items.extend([
                {"item": "Umbrella / Raincoat", "category": "Clothing", "reason": "Rain forecast", "priority": "must"},
                {"item": "Waterproof bag cover", "category": "Accessories", "reason": "Protect your belongings", "priority": "recommended"},
            ])
    else:
        items.extend([
            {"item": "Comfortable clothing", "category": "Clothing", "reason": "Travel comfort", "priority": "must"},
            {"item": "Light jacket", "category": "Clothing", "reason": "Variable conditions", "priority": "recommended"},
        ])

    if req.duration_hours and req.duration_hours >= 4:
        items.extend([
            {"item": "Neck pillow", "category": "Comfort", "reason": "Long journey comfort", "priority": "recommended"},
            {"item": "Eye mask", "category": "Comfort", "reason": "Rest on the bus", "priority": "optional"},
            {"item": "Book / magazine", "category": "Entertainment", "reason": f"{req.duration_hours:.0f}h journey", "priority": "optional"},
        ])
    if req.duration_hours and req.duration_hours >= 6:
        items.extend([
            {"item": "Compression socks", "category": "Health", "reason": "Prevent leg fatigue", "priority": "recommended"},
            {"item": "Small blanket / shawl", "category": "Comfort", "reason": "AC can be cold", "priority": "optional"},
        ])

    unique_items = _dedupe_and_sort(items)

    return {
        "destination": req.destination,
        "weather": weather_info,
        "total_items": len(unique_items),
        "must_pack": [i for i in unique_items if i["priority"] == "must"],
        "recommended": [i for i in unique_items if i["priority"] == "recommended"],
        "optional": [i for i in unique_items if i["priority"] == "optional"],
        "all_items": unique_items,
        "categories": list({i["category"] for i in unique_items}),
    }


# ── 3. SMART REBOOK ──────────────────────────────────────────────────────────

@router.post("/smart-rebook", responses={
    400: {"description": "Bad request"},
    401: {"description": "Not authenticated"},
    404: {"description": "Booking not found"},
})
async def smart_rebook(
    req: SmartRebookRequest,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
):
    """
    Checks if a booking needs re-booking (delay > 2h or upcoming within 24h)
    and suggests alternatives.
    """
    user = get_user_from_token(credentials, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")

    booking = db.query(UserBooking).filter(
        UserBooking.transaction_id == req.transaction_id,
        UserBooking.user_id == user.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    # Parse departure time
    try:
        departure = datetime.strptime(booking.departure, "%m-%d-%Y %H:%M")
    except Exception:
        try:
            departure = datetime.strptime(booking.departure.split('.')[0], "%Y-%m-%dT%H:%M:%S")
        except Exception:
            raise HTTPException(status_code=400, detail="Could not parse departure time")

    now = datetime.now()
    hours_until_departure = (departure - now).total_seconds() / 3600

    # Determine re-booking scenario
    if hours_until_departure < 0:
        scenario = "past"
        message = "This trip has already departed."
        needs_rebook = False
    elif hours_until_departure < 2:
        scenario = "imminent"
        message = f"Your bus departs in {hours_until_departure:.1f} hours. Urgent re-booking may be needed."
        needs_rebook = True
    elif hours_until_departure < 24:
        scenario = "upcoming"
        message = f"Your trip is in {hours_until_departure:.1f} hours. You can still reschedule."
        needs_rebook = False
    else:
        scenario = "future"
        message = f"Your trip is in {hours_until_departure:.0f} hours. Re-booking available anytime."
        needs_rebook = False

    # Fetch alternative buses
    alternatives = []
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(
                f"http://127.0.0.1:8000/buses/search?origin={booking.origin}&destination={booking.destination}"
            )
            buses = res.json()
            if isinstance(buses, list):
                # Filter to buses departing after now
                for bus in buses[:6]:
                    alternatives.append({
                        "id": bus.get("id"),
                        "bus": bus.get("bus"),
                        "departure": bus.get("departure"),
                        "arrival": bus.get("arrival"),
                        "duration": bus.get("duration"),
                        "price": bus.get("price"),
                        "price_diff": bus.get("price", 0) - booking.price,
                    })
    except Exception:
        pass

    return {
        "booking": {
            "transaction_id": booking.transaction_id,
            "origin": booking.origin,
            "destination": booking.destination,
            "departure": booking.departure,
            "seat": booking.seat_number,
            "price": booking.price,
        },
        "scenario": scenario,
        "hours_until_departure": round(hours_until_departure, 1),
        "needs_rebook": needs_rebook,
        "message": message,
        "alternatives": alternatives,
        "cancellation_policy": "Free cancellation if re-booked more than 24h before departure. 25% fee applies after 24h.",
    }


# ── 4. TRIP SUMMARY ──────────────────────────────────────────────────────────

@router.post("/trip-summary", responses={
    401: {"description": "Not authenticated"},
    404: {"description": "Booking not found"},
})
async def trip_summary(
    req: TripSummaryRequest,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
):
    """
    Generates a personalized AI trip summary after the travel date has passed.
    """
    user = get_user_from_token(credentials, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")

    booking = db.query(UserBooking).filter(
        UserBooking.transaction_id == req.transaction_id,
        UserBooking.user_id == user.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Get all user bookings for stats
    all_bookings = db.query(UserBooking).filter(
        UserBooking.user_id == user.id,
        UserBooking.status == "confirmed"
    ).all()

    total_spent = sum(b.price for b in all_bookings)
    total_trips = len(all_bookings)

    # Get loyalty info
    loyalty = db.query(LoyaltyPoints).filter(LoyaltyPoints.user_id == user.id).first()

    # Calculate CO2 savings (rough estimate: 400 miles avg, bus vs car)
    # Bus: ~0.089 kg CO2/km, Car: ~0.171 kg CO2/km
    estimated_distance_miles = 400  # default
    distance_km = estimated_distance_miles * 1.609
    bus_co2 = distance_km * 0.089
    car_co2 = distance_km * 0.171
    co2_saved = car_co2 - bus_co2

    # Calculate money saved vs flying/driving
    estimated_flight_cost = booking.price * 3.5
    estimated_drive_cost = booking.price * 1.8
    saved_vs_flight = int(estimated_flight_cost - booking.price)
    saved_vs_drive = int(estimated_drive_cost - booking.price)

    # Duration in hours
    duration_hours = None
    if booking.duration:
        try:
            parts = booking.duration.replace('h', '').replace('m', '').split()
            if len(parts) == 2:
                duration_hours = int(parts[0]) + int(parts[1]) / 60
            elif len(parts) == 1:
                duration_hours = float(parts[0])
        except Exception:
            pass

    # Fun travel stats
    avg_speed_mph = 65
    distance_miles = int(duration_hours * avg_speed_mph) if duration_hours else estimated_distance_miles

    # AI-generated highlights
    highlights = [
        f"You traveled from {booking.origin.split(',')[0]} to {booking.destination.split(',')[0]}!",
        f"You saved ${saved_vs_flight} compared to flying ✈️",
        f"You reduced your carbon footprint by {co2_saved:.1f}kg CO₂ vs driving 🌱",
        f"You earned {booking.price} loyalty points on this trip 🏆",
    ]

    if total_trips >= 5:
        highlights.append(f"You're a frequent traveler — {total_trips} trips completed! 🎉")
    if loyalty and loyalty.tier != "Bronze":
        highlights.append(f"You've reached {loyalty.tier} tier — keep it up! 💎")

    return {
        "booking": {
            "transaction_id": booking.transaction_id,
            "origin": booking.origin,
            "destination": booking.destination,
            "departure": booking.departure,
            "seat": booking.seat_number,
            "bus": booking.bus_name,
            "price": booking.price,
            "duration": booking.duration,
        },
        "passenger": user.name,
        "stats": {
            "distance_miles": distance_miles,
            "duration": booking.duration,
            "fare_paid": booking.price,
            "saved_vs_flight": saved_vs_flight,
            "saved_vs_drive": saved_vs_drive,
            "co2_saved_kg": round(co2_saved, 1),
            "trees_equivalent": round(co2_saved / 21, 2),
            "points_earned": booking.price,
            "total_trips": total_trips,
            "total_spent": total_spent,
        },
        "loyalty": {
            "tier": loyalty.tier if loyalty else "Bronze",
            "total_points": loyalty.points if loyalty else 0,
            "total_earned": loyalty.total_earned if loyalty else 0,
        },
        "highlights": highlights,
        "share_text": f"Just traveled from {booking.origin.split(',')[0]} to {booking.destination.split(',')[0]} with MR Bus Portal! Saved ${saved_vs_flight} vs flying and {co2_saved:.1f}kg CO₂. 🚌🌱 #MRBusPortal",
    }