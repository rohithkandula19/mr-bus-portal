from typing import Annotated, Optional, List
from typing_extensions import TypeAlias
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserBooking
from app.security import decode_access_token
from app.email_utils import send_booking_receipt_email, send_email
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import hashlib
import random
import uuid
from datetime import datetime, timezone


router = APIRouter(prefix="/bookings", tags=["Bookings"])
security = HTTPBearer(auto_error=False)

DEFAULT_BUS_NAME = "MR Express"
MSG_NOT_LOGGED_IN = "Not logged in"
MSG_INVALID_TOKEN = "Invalid token"
MSG_USER_NOT_FOUND = "User not found"
MSG_BOOKING_NOT_FOUND = "Booking not found"
DbSession: TypeAlias = Annotated[Session, Depends(get_db)]
OptionalCredentials: TypeAlias = Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]

confirmed_bookings = {}
bus_cache = {}

all_seats = [
    f"{row}{num}"
    for row in ["A", "B", "C", "D", "E", "F", "G", "H"]
    for num in range(1, 5)
]


class BookingResponse(BaseModel):
    id: int
    bus_id: int
    bus_name: str
    origin: str
    destination: str
    departure: str
    arrival: Optional[str] = None
    duration: Optional[str] = None
    seat_number: str
    price: int
    transaction_id: str
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


def initial_booked_seats_for_bus(bus_id: int):
    seed = int(hashlib.md5(str(bus_id).encode()).hexdigest(), 16) % (10**8)
    rng = random.Random(seed)
    booked = rng.sample(all_seats, rng.randint(4, 14))
    return sorted(booked)


def get_optional_user(credentials: OptionalCredentials, db: DbSession):
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None
    try:
        return db.query(User).filter(User.id == int(payload["sub"])).first()
    except Exception as e:
        print(f"⚠️ User lookup error: {e} - bookings.py:73")
        return None


def _get_bus_field(bus: Optional[dict], key: str, default: str) -> str:
    if bus:
        return str(bus.get(key, default))
    return default


def _save_booking_to_db(db, user, bus_id, bus, seat, transaction_id):
    booking = UserBooking(
        user_id=user.id,
        bus_id=bus_id,
        bus_name=_get_bus_field(bus, "bus", DEFAULT_BUS_NAME),
        origin=_get_bus_field(bus, "origin", "Unknown"),
        destination=_get_bus_field(bus, "destination", "Unknown"),
        departure=_get_bus_field(bus, "departure", ""),
        arrival=_get_bus_field(bus, "arrival", "N/A"),
        duration=_get_bus_field(bus, "duration", "N/A"),
        seat_number=seat,
        price=bus.get("price", 0) if bus else 0,
        transaction_id=transaction_id,
        status="confirmed"
    )
    db.add(booking)
    db.commit()
    print(f"✅ Booking saved: {transaction_id} - bookings.py:100")


def _send_booking_email(user, bus, seat, transaction_id):
    if bus:
        send_booking_receipt_email(
            to_email=user.email,
            user_name=user.name,
            bus_name=bus.get("bus", DEFAULT_BUS_NAME),
            origin=bus.get("origin", ""),
            destination=bus.get("destination", ""),
            departure=str(bus.get("departure", "")),
            arrival=str(bus.get("arrival", "N/A")),
            duration=str(bus.get("duration", "N/A")),
            seat_number=seat,
            price=bus.get("price", 0),
            transaction_id=transaction_id
        )
    else:
        send_email(
            to_email=user.email,
            subject="MR Bus Portal - Booking Confirmed",
            body=f"Hello {user.name},\n\nSeat: {seat}\nTransaction ID: {transaction_id}\n\nThank you!"
        )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/cache-bus")
def cache_bus(bus: dict):
    bus_cache[bus["id"]] = bus
    return {"status": "cached"}


@router.get("/seats/{bus_id}")
def get_seats(bus_id: int):
    base_booked = set(initial_booked_seats_for_bus(bus_id))
    extra_booked = set(confirmed_bookings.get(bus_id, []))
    return {"bus_id": bus_id, "booked_seats": sorted(base_booked | extra_booked)}


@router.get("/my-bookings", response_model=List[BookingResponse])
def get_my_bookings(credentials: OptionalCredentials, db: DbSession):
    if not credentials:
        return []
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return []
    try:
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user:
            return []
        return (
            db.query(UserBooking)
            .filter(UserBooking.user_id == user.id)
            .order_by(UserBooking.created_at.desc())
            .all()
        )
    except Exception as e:
        print(f"❌ Error fetching bookings: {e} - bookings.py:159")
        return []


@router.post("/book")
def book_seat(
    bus_id: int,
    seat: str,
    current_user: Annotated[Optional[User], Depends(get_optional_user)],
    db: DbSession
):
    seat = seat.strip().upper()
    booked = set(initial_booked_seats_for_bus(bus_id)) | set(confirmed_bookings.get(bus_id, []))

    if seat in booked:
        return {"status": "seat_taken", "seat": seat}

    confirmed_bookings.setdefault(bus_id, []).append(seat)
    transaction_id = str(uuid.uuid4())[:8].upper()
    bus = bus_cache.get(bus_id)

    if current_user:
        try:
            _save_booking_to_db(db, current_user, bus_id, bus, seat, transaction_id)
        except Exception as e:
            print(f"❌ DB save failed: {e} - bookings.py:184")
            db.rollback()

        try:
            _send_booking_email(current_user, bus, seat, transaction_id)
        except Exception as e:
            print(f"❌ Email failed: {e} - bookings.py:190")

        # ── Award loyalty points: $1 spent = 1 point ──────────────────────────
        if bus:
            try:
                from app.routers.loyalty import add_points
                price = bus.get("price", 0)
                if price > 0:
                    dollar_value = round(price / 100, 2)   # e.g. $31 → 31 pts → $0.31
                    add_points(
                        db=db,
                        user_id=current_user.id,
                        points=price,   # 1 point per $1 spent
                        description=f"Booking {transaction_id} — {bus.get('origin','')} → {bus.get('destination','')} (${price} = {price} pts = ${dollar_value:.2f} value)"
                    )
                    print(f"✅ Awarded {price} pts (${dollar_value:.2f} value) to user {current_user.id} - bookings.py:205")
            except Exception as e:
                print(f"❌ Points award failed: {e} - bookings.py:207")

    return {
        "status": "confirmed",
        "seat": seat,
        "bus_id": bus_id,
        "transaction_id": transaction_id
    }


@router.post("/cancel/{transaction_id}")
def cancel_booking(
    transaction_id: str,
    credentials: OptionalCredentials,
    db: DbSession
):
    if not credentials:
        return {"status": "error", "message": MSG_NOT_LOGGED_IN}
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return {"status": "error", "message": MSG_INVALID_TOKEN}
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        return {"status": "error", "message": MSG_USER_NOT_FOUND}

    booking = db.query(UserBooking).filter(
        UserBooking.transaction_id == transaction_id,
        UserBooking.user_id == user.id
    ).first()
    if not booking:
        return {"status": "error", "message": MSG_BOOKING_NOT_FOUND}
    if booking.status == "cancelled":
        return {"status": "error", "message": "Booking already cancelled"}

    # Cancellation fee
    now = datetime.now(timezone.utc)
    created = booking.created_at.replace(tzinfo=timezone.utc)
    hours_since = (now - created).total_seconds() / 3600
    cancellation_fee = int(booking.price * 0.25) if hours_since > 24 else 0
    fee_message = f"25% cancellation fee of ${cancellation_fee} applied." if cancellation_fee else "No cancellation fee."

    booking.status = "cancelled"
    db.commit()

    # ── Reverse loyalty points on cancellation ────────────────────────────────
    points_reversed = 0
    try:
        from app.routers.loyalty import deduct_points, points_to_dollars
        price = booking.price
        if price > 0:
            deduct_points(
                db=db,
                user_id=user.id,
                points=price,
                description=f"Cancelled booking {transaction_id} — {booking.origin} → {booking.destination} (-{price} pts)"
            )
            points_reversed = price
            print(f"✅ Reversed {price} pts for cancelled booking {transaction_id} - bookings.py:264")
    except Exception as e:
        print(f"❌ Points reversal failed: {e} - bookings.py:266")

    # Send cancellation email
    try:
        dollar_value_reversed = round(points_reversed / 100, 2)
        send_email(
            to_email=user.email,
            subject=f"MR Bus Portal - Booking Cancelled #{transaction_id}",
            body=f"""Hello {user.name},

Your booking has been cancelled.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CANCELLATION NOTICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Transaction ID  :  {transaction_id}
  Route           :  {booking.origin} → {booking.destination}
  Seat            :  {booking.seat_number}
  Original Price  :  ${booking.price}
  Cancellation Fee:  ${cancellation_fee}
  Refund Amount   :  ${booking.price - cancellation_fee}

  {fee_message}

  Loyalty Points  :  -{points_reversed} pts (-${dollar_value_reversed:.2f} value) reversed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your refund will be processed in 5-7 business days.

Thank you for choosing MR Bus Portal.
— MR Bus Portal Team"""
        )
    except Exception as e:
        print(f"❌ Cancellation email failed: {e} - bookings.py:301")

    return {
        "status":           "cancelled",
        "transaction_id":   transaction_id,
        "cancellation_fee": cancellation_fee,
        "refund_amount":    booking.price - cancellation_fee,
        "fee_message":      fee_message,
        "points_reversed":  points_reversed,
        "points_value_lost": round(points_reversed / 100, 2),
    }


@router.post("/resend-receipt/{transaction_id}")
def resend_receipt(transaction_id: str, credentials: OptionalCredentials, db: DbSession):
    if not credentials:
        return {"status": "error", "message": MSG_NOT_LOGGED_IN}
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return {"status": "error", "message": MSG_INVALID_TOKEN}
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        return {"status": "error", "message": MSG_USER_NOT_FOUND}
    booking = db.query(UserBooking).filter(
        UserBooking.transaction_id == transaction_id,
        UserBooking.user_id == user.id
    ).first()
    if not booking:
        return {"status": "error", "message": MSG_BOOKING_NOT_FOUND}
    try:
        send_booking_receipt_email(
            to_email=user.email,
            user_name=user.name,
            bus_name=booking.bus_name,
            origin=booking.origin,
            destination=booking.destination,
            departure=booking.departure,
            arrival=booking.arrival,
            duration=booking.duration,
            seat_number=booking.seat_number,
            price=booking.price,
            transaction_id=booking.transaction_id
        )
        return {"status": "sent", "message": f"Receipt resent to {user.email}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/reschedule/{transaction_id}")
def reschedule_booking(
    transaction_id: str,
    new_bus_id: int,
    new_departure: str,
    new_arrival: str,
    new_duration: str,
    new_price: int,
    credentials: OptionalCredentials,
    db: DbSession
):
    if not credentials:
        return {"status": "error", "message": MSG_NOT_LOGGED_IN}
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return {"status": "error", "message": MSG_INVALID_TOKEN}
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        return {"status": "error", "message": MSG_USER_NOT_FOUND}
    booking = db.query(UserBooking).filter(
        UserBooking.transaction_id == transaction_id,
        UserBooking.user_id == user.id
    ).first()
    if not booking:
        return {"status": "error", "message": MSG_BOOKING_NOT_FOUND}
    if booking.status == "cancelled":
        return {"status": "error", "message": "Cannot reschedule a cancelled booking"}

    old_price = booking.price
    old_departure = booking.departure
    booking.bus_id = new_bus_id
    booking.departure = new_departure
    booking.arrival = new_arrival
    booking.duration = new_duration
    booking.price = new_price
    db.commit()

    # Adjust loyalty points for price difference
    if new_price != old_price:
        try:
            from app.routers.loyalty import add_points, deduct_points
            diff = new_price - old_price
            if diff > 0:
                add_points(db, user.id, diff, f"Price difference on reschedule {transaction_id} (+{diff} pts)")
            elif diff < 0:
                deduct_points(db, user.id, abs(diff), f"Price difference on reschedule {transaction_id} ({diff} pts)")
        except Exception as e:
            print(f"❌ Points adjustment on reschedule failed: {e} - bookings.py:395")

    # Send reschedule confirmation email
    try:
        send_email(
            to_email=user.email,
            subject=f"✅ Booking Rescheduled #{transaction_id} — MR Bus Portal",
            body=f"""Hello {user.name},

Your booking has been successfully rescheduled!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RESCHEDULE CONFIRMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Transaction ID  :  {transaction_id}
  Route           :  {booking.origin} → {booking.destination}
  Seat            :  {booking.seat_number}

  ❌ OLD DEPARTURE:  {old_departure}
  ✅ NEW DEPARTURE:  {new_departure}
  New Price       :  ${new_price}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for choosing MR Bus Portal!
— MR Bus Portal Team"""
        )
    except Exception as e:
        print(f"❌ Reschedule email failed: {e}")

    return {"status": "rescheduled", "transaction_id": transaction_id, "new_departure": new_departure}

@router.post("/award-completed-trip-points")
def award_completed_trip_points(credentials: OptionalCredentials, db: DbSession):
    """Call this to award points for trips whose departure has now passed."""
    if not credentials:
        return {"status": "error", "message": "Not logged in"}
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return {"status": "error", "message": "Invalid token"}
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        return {"status": "error", "message": "User not found"}

    from app.routers.loyalty import add_points, get_or_create_loyalty, PointsTransaction
    now = datetime.now(timezone.utc)
    awarded = []

    completed = db.query(UserBooking).filter(
        UserBooking.user_id == user.id,
        UserBooking.status == "confirmed"
    ).all()

    for booking in completed:
        try:
            dep = datetime.fromisoformat(booking.departure)
            if dep.tzinfo is None:
                dep = dep.replace(tzinfo=timezone.utc)
        except Exception:
            continue

        if dep > now:
            continue  # trip hasn't happened yet

        # Check if points already awarded for this booking
        already = db.query(PointsTransaction).filter(
            PointsTransaction.user_id == user.id,
            PointsTransaction.description.contains(booking.transaction_id),
            PointsTransaction.type == "earned"
        ).first()
        if already:
            continue

        if booking.price > 0:
            add_points(
                db=db,
                user_id=user.id,
                points=booking.price,
                description=f"Trip completed {booking.transaction_id} — {booking.origin} → {booking.destination} (${booking.price} = {booking.price} pts)"
            )
            awarded.append({"transaction_id": booking.transaction_id, "points": booking.price})
            print(f"✅ Post-trip points awarded: {booking.price} pts for {booking.transaction_id}")

    return {"status": "ok", "awarded": awarded, "count": len(awarded)}
