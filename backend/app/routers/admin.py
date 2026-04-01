from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Annotated, Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone

from app.database import get_db
from app.models import User, UserBooking, LoyaltyPoints, Bus
from app.security import decode_access_token
from app.email_utils import send_email
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/admin", tags=["Admin"])
security = HTTPBearer()


# ── Admin guard ───────────────────────────────────────────────────────────────

def get_admin_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
) -> User:
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Stats / Dashboard ─────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(
    _admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)]
):
    total_users = db.query(User).count()
    total_bookings = db.query(UserBooking).count()
    confirmed = db.query(UserBooking).filter(UserBooking.status == "confirmed").count()
    cancelled = db.query(UserBooking).filter(UserBooking.status == "cancelled").count()

    # Revenue
    revenue_rows = db.query(UserBooking.price).filter(UserBooking.status == "confirmed").all()
    total_revenue = sum(r.price for r in revenue_rows)
    avg_fare = round(total_revenue / confirmed, 2) if confirmed > 0 else 0

    # New users this month
    now = datetime.now(timezone.utc)
    new_users_month = db.query(User).filter(
        func.extract('month', User.created_at) == now.month,
        func.extract('year', User.created_at) == now.year
    ).count()

    # Revenue by route (top 5)
    route_revenue = (
        db.query(
            UserBooking.origin,
            UserBooking.destination,
            func.count(UserBooking.id).label("bookings"),
            func.sum(UserBooking.price).label("revenue")
        )
        .filter(UserBooking.status == "confirmed")
        .group_by(UserBooking.origin, UserBooking.destination)
        .order_by(func.sum(UserBooking.price).desc())
        .limit(5)
        .all()
    )

    # Bookings per day (last 7 days)
    daily = (
        db.query(
            func.date(UserBooking.created_at).label("date"),
            func.count(UserBooking.id).label("count"),
            func.sum(UserBooking.price).label("revenue")
        )
        .filter(UserBooking.status == "confirmed")
        .group_by(func.date(UserBooking.created_at))
        .order_by(func.date(UserBooking.created_at).desc())
        .limit(7)
        .all()
    )

    return {
        "total_users": total_users,
        "new_users_month": new_users_month,
        "total_bookings": total_bookings,
        "confirmed_bookings": confirmed,
        "cancelled_bookings": cancelled,
        "total_revenue": total_revenue,
        "avg_fare": avg_fare,
        "cancellation_rate": round((cancelled / total_bookings * 100), 1) if total_bookings > 0 else 0,
        "top_routes": [
            {"route": f"{r.origin.split(',')[0]} → {r.destination.split(',')[0]}", "bookings": r.bookings, "revenue": r.revenue}
            for r in route_revenue
        ],
        "daily_stats": [
            {"date": str(d.date), "bookings": d.count, "revenue": d.revenue or 0}
            for d in reversed(daily)
        ],
    }


# ── All Bookings ──────────────────────────────────────────────────────────────

@router.get("/bookings")
def get_all_bookings(
    _admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    q = db.query(UserBooking, User).join(User, UserBooking.user_id == User.id)

    if status and status != "all":
        q = q.filter(UserBooking.status == status)

    if search:
        s = f"%{search}%"
        q = q.filter(
            (UserBooking.transaction_id.ilike(s)) |  # noqa: spelling
            (UserBooking.origin.ilike(s)) |  # noqa: spelling
            (UserBooking.destination.ilike(s)) |  # noqa: spelling
            (User.name.ilike(s)) |  # noqa: spelling
            (User.email.ilike(s))  # noqa: spelling
        )

    total = q.count()
    rows = q.order_by(UserBooking.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "bookings": [
            {
                "id": b.id,
                "transaction_id": b.transaction_id,
                "user_name": u.name,
                "user_email": u.email,
                "bus_name": b.bus_name,
                "origin": b.origin,
                "destination": b.destination,
                "departure": b.departure,
                "seat_number": b.seat_number,
                "price": b.price,
                "status": b.status,
                "created_at": str(b.created_at),
            }
            for b, u in rows
        ]
    }


@router.post("/bookings/{transaction_id}/cancel", responses={404: {"description": "Booking not found"}})
def admin_cancel_booking(
    transaction_id: str,
    _admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)]
):
    booking = db.query(UserBooking).filter(UserBooking.transaction_id == transaction_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.status = "cancelled"
    db.commit()
    return {"status": "cancelled", "transaction_id": transaction_id}


# ── All Users ─────────────────────────────────────────────────────────────────

@router.get("/users")
def get_all_users(
    _admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    q = db.query(User)
    if search:
        s = f"%{search}%"
        q = q.filter(
            (User.name.ilike(s)) | (User.email.ilike(s))  # noqa: spelling
        )

    total = q.count()
    users = q.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for u in users:
        bookings = db.query(UserBooking).filter(UserBooking.user_id == u.id, UserBooking.status == "confirmed").all()
        total_spent = sum(b.price for b in bookings)
        loyalty = db.query(LoyaltyPoints).filter(LoyaltyPoints.user_id == u.id).first()
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "is_verified": u.is_verified,
            "is_admin": u.is_admin,
            "total_bookings": len(bookings),
            "total_spent": total_spent,
            "loyalty_tier": loyalty.tier if loyalty else "Bronze",
            "loyalty_points": loyalty.points if loyalty else 0,
            "referral_code": u.referral_code,
            "joined": str(u.created_at),
        })

    return {"total": total, "users": result}


@router.post(
    "/users/{user_id}/toggle-admin",
    responses={
        400: {"description": "Cannot change your own admin status"},
        404: {"description": "User not found"},
    },
)
def toggle_admin(
    user_id: int,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)]
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own admin status")
    user.is_admin = not user.is_admin
    db.commit()
    return {"user_id": user_id, "is_admin": user.is_admin}


# ── Bus Management ────────────────────────────────────────────────────────────

class BusCreate(BaseModel):
    bus: str
    origin: str
    destination: str
    departure: str
    arrival: Optional[str] = None
    duration: Optional[str] = None
    price: int
    seats_total: int = 32
    distance_miles: Optional[float] = None
    amenities: Optional[str] = "WiFi,USB,AC"

class BusUpdate(BusCreate):
    is_active: bool = True


@router.get("/buses")
def get_all_buses(
    _admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)]
):
    buses = db.query(Bus).order_by(Bus.created_at.desc()).all()
    return [
        {
            "id": b.id, "bus": b.bus, "origin": b.origin, "destination": b.destination,
            "departure": b.departure, "arrival": b.arrival, "duration": b.duration,
            "price": b.price, "seats_total": b.seats_total, "amenities": b.amenities,
            "is_active": b.is_active, "created_at": str(b.created_at)
        }
        for b in buses
    ]


@router.post("/buses")
def create_bus(
    payload: BusCreate,
    _admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)]
):
    bus = Bus(**payload.model_dump())
    db.add(bus)
    db.commit()
    db.refresh(bus)
    return {"status": "created", "id": bus.id}


@router.put("/buses/{bus_id}", responses={404: {"description": "Bus not found"}})
def update_bus(
    bus_id: int,
    payload: BusUpdate,
    _admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)]
):
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    for k, v in payload.model_dump().items():
        setattr(bus, k, v)
    db.commit()
    return {"status": "updated"}


@router.delete("/buses/{bus_id}", responses={404: {"description": "Bus not found"}})
def delete_bus(
    bus_id: int,
    _admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)]
):
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    db.delete(bus)
    db.commit()
    return {"status": "deleted"}


# ── Email Users ───────────────────────────────────────────────────────────────

class EmailRequest(BaseModel):
    user_ids: Optional[List[int]] = None   # None = all users
    subject: str
    body: str

@router.post("/email-users")
def email_users(
    payload: EmailRequest,
    _admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)]
):
    if payload.user_ids:
        users = db.query(User).filter(User.id.in_(payload.user_ids), User.is_verified == True).all()
    else:
        users = db.query(User).filter(User.is_verified == True).all()

    sent = 0
    failed = 0
    for u in users:
        try:
            send_email(u.email, payload.subject, payload.body)
            sent += 1
        except Exception:
            failed += 1

    return {"sent": sent, "failed": failed, "total": len(users)}

@router.post("/bookings/{transaction_id}/reschedule")
def admin_reschedule_booking(
    transaction_id: str,
    new_bus_id: int,
    new_departure: str,
    new_arrival: str,
    new_duration: str,
    new_price: int,
    _admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)]
):
    booking = db.query(UserBooking).filter(UserBooking.transaction_id == transaction_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot reschedule cancelled booking")
    
    old_departure = booking.departure
    booking.bus_id = new_bus_id
    booking.departure = new_departure
    booking.arrival = new_arrival
    booking.duration = new_duration
    booking.price = new_price
    db.commit()

    # Send email to user
    try:
        user = db.query(User).filter(User.id == booking.user_id).first()
        if user:
            send_email(
                to_email=user.email,
                subject=f"✅ Your Booking Has Been Rescheduled #{transaction_id}",
                body=f"""Hello {user.name},

Your booking has been rescheduled by our support team.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RESCHEDULE NOTICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Transaction ID  :  {transaction_id}
  Route           :  {booking.origin} → {booking.destination}
  Seat            :  {booking.seat_number}

  ❌ OLD DEPARTURE:  {old_departure}
  ✅ NEW DEPARTURE:  {new_departure}
  New Price       :  ${new_price}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you have questions, contact support@mrbusportal.com
— MR Bus Portal Team"""
            )
    except Exception as e:
        print(f"Admin reschedule email failed: {e}")

    return {"status": "rescheduled", "transaction_id": transaction_id, "old_departure": old_departure, "new_departure": new_departure}
