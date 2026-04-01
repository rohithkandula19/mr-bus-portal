# backend/app/routers/waitlist.py
# Waiting List system — users can join a waitlist for full buses
# When a seat opens (cancellation), notify the next person on the waitlist
#
# SETUP: Add to models.py, main.py, then run:
#   ALTER TABLE ... (or restart uvicorn to auto-create table)

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Annotated, Optional, List
from datetime import datetime, timezone
import uuid

from app.database import get_db, Base
from app.models import User, UserBooking
from app.security import decode_access_token
from app.email_utils import send_email

router = APIRouter(prefix="/waitlist", tags=["Waitlist"])
security = HTTPBearer(auto_error=False)


# ── Waitlist Model (add this class to models.py too) ──────────────────────────
class WaitlistEntry(Base):
    __tablename__ = "waitlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bus_id = Column(Integer, nullable=False)
    bus_name = Column(String, nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    departure = Column(String, nullable=False)
    preferred_seat = Column(String, nullable=True)   # optional seat preference
    status = Column(String, default="waiting")        # waiting / notified / booked / expired
    position = Column(Integer, nullable=False)         # queue position
    waitlist_id = Column(String, unique=True, nullable=False)
    notified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_optional_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[Session, Depends(get_db)]
):
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None
    try:
        return db.query(User).filter(User.id == int(payload["sub"])).first()
    except Exception:
        return None


# ── Schemas ────────────────────────────────────────────────────────────────────

class JoinWaitlistRequest(BaseModel):
    bus_id: int
    bus_name: str
    origin: str
    destination: str
    departure: str
    preferred_seat: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/join")
def join_waitlist(
    req: JoinWaitlistRequest,
    current_user: Annotated[Optional[User], Depends(get_optional_user)],
    db: Annotated[Session, Depends(get_db)]
):
    """Join the waiting list for a fully booked bus."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Please log in to join the waitlist")

    # Check if already on waitlist for this bus
    existing = db.query(WaitlistEntry).filter(
        WaitlistEntry.user_id == current_user.id,
        WaitlistEntry.bus_id == req.bus_id,
        WaitlistEntry.status == "waiting"
    ).first()

    if existing:
        return {
            "status": "already_waiting",
            "message": f"You're already on the waitlist! Position #{existing.position}",
            "waitlist_id": existing.waitlist_id,
            "position": existing.position,
        }

    # Get current queue length for this bus
    queue_count = db.query(WaitlistEntry).filter(
        WaitlistEntry.bus_id == req.bus_id,
        WaitlistEntry.status == "waiting"
    ).count()

    position = queue_count + 1

    entry = WaitlistEntry(
        user_id=current_user.id,
        bus_id=req.bus_id,
        bus_name=req.bus_name,
        origin=req.origin,
        destination=req.destination,
        departure=req.departure,
        preferred_seat=req.preferred_seat,
        status="waiting",
        position=position,
        waitlist_id=str(uuid.uuid4())[:8].upper(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Send confirmation email
    try:
        send_email(
            to_email=current_user.email,
            subject=f"🔔 MR Bus Portal — Waitlist Confirmed #{entry.waitlist_id}",
            body=f"""Hello {current_user.name},

You've been added to the waitlist! 🎫

━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WAITLIST CONFIRMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Waitlist ID   :  {entry.waitlist_id}
  Bus           :  {req.bus_name}
  Route         :  {req.origin} → {req.destination}
  Departure     :  {req.departure}
  Queue Position:  #{position}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

What happens next:
• We'll email you instantly when a seat opens
• You'll have 30 minutes to complete your booking
• If you don't book in time, the next person gets notified

Thank you for choosing MR Bus Portal!
— MR Bus Portal Team"""
        )
    except Exception as e:
        print(f"Waitlist email failed: {e}")

    return {
        "status": "joined",
        "message": f"You're #{position} on the waitlist! We'll email you when a seat opens.",
        "waitlist_id": entry.waitlist_id,
        "position": position,
        "bus_name": req.bus_name,
        "route": f"{req.origin} → {req.destination}",
    }


@router.get("/my-waitlist")
def get_my_waitlist(
    current_user: Annotated[Optional[User], Depends(get_optional_user)],
    db: Annotated[Session, Depends(get_db)]
):
    """Get all waitlist entries for the logged-in user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Please log in")

    entries = db.query(WaitlistEntry).filter(
        WaitlistEntry.user_id == current_user.id
    ).order_by(WaitlistEntry.created_at.desc()).all()

    return [
        {
            "waitlist_id": e.waitlist_id,
            "bus_name": e.bus_name,
            "origin": e.origin,
            "destination": e.destination,
            "departure": e.departure,
            "position": e.position,
            "status": e.status,
            "created_at": str(e.created_at),
        }
        for e in entries
    ]


@router.delete("/leave/{waitlist_id}")
def leave_waitlist(
    waitlist_id: str,
    current_user: Annotated[Optional[User], Depends(get_optional_user)],
    db: Annotated[Session, Depends(get_db)]
):
    """Remove yourself from a waitlist."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Please log in")

    entry = db.query(WaitlistEntry).filter(
        WaitlistEntry.waitlist_id == waitlist_id.upper(),
        WaitlistEntry.user_id == current_user.id,
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")

    entry.status = "expired"
    db.commit()

    # Re-number remaining entries for this bus
    remaining = db.query(WaitlistEntry).filter(
        WaitlistEntry.bus_id == entry.bus_id,
        WaitlistEntry.status == "waiting"
    ).order_by(WaitlistEntry.created_at).all()

    for i, e in enumerate(remaining, 1):
        e.position = i
    db.commit()

    return {"status": "left", "message": "You've been removed from the waitlist."}


@router.get("/queue/{bus_id}")
def get_queue_size(
    bus_id: int,
    db: Annotated[Session, Depends(get_db)]
):
    """Get how many people are waiting for a bus."""
    count = db.query(WaitlistEntry).filter(
        WaitlistEntry.bus_id == bus_id,
        WaitlistEntry.status == "waiting"
    ).count()
    return {"bus_id": bus_id, "queue_size": count}


@router.post("/notify-next/{bus_id}")
def notify_next_in_queue(
    bus_id: int,
    db: Annotated[Session, Depends(get_db)]
):
    """
    Call this when a booking is cancelled to notify the next person.
    Hook this into your cancel_booking endpoint in bookings.py:

    After booking.status = "cancelled":
        import httpx
        httpx.post(f"http://127.0.0.1:8000/waitlist/notify-next/{booking.bus_id}")
    """
    next_entry = db.query(WaitlistEntry).filter(
        WaitlistEntry.bus_id == bus_id,
        WaitlistEntry.status == "waiting"
    ).order_by(WaitlistEntry.position).first()

    if not next_entry:
        return {"status": "no_waitlist", "message": "No one is waiting for this bus"}

    user = db.query(User).filter(User.id == next_entry.user_id).first()
    if not user:
        next_entry.status = "expired"
        db.commit()
        return {"status": "user_not_found"}

    next_entry.status = "notified"
    next_entry.notified_at = datetime.now(timezone.utc)
    db.commit()

    # Send notification email
    try:
        send_email(
            to_email=user.email,
            subject=f"🎉 A seat opened up! Book now — {next_entry.bus_name}",
            body=f"""Hello {user.name},

Great news — a seat just opened up on your waitlisted bus! 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SEAT AVAILABLE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Bus           :  {next_entry.bus_name}
  Route         :  {next_entry.origin} → {next_entry.destination}
  Departure     :  {next_entry.departure}
  Waitlist ID   :  {next_entry.waitlist_id}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ You have 30 MINUTES to book your seat before it goes to the next person!

👉 Go to MR Bus Portal now and search:
   {next_entry.origin} → {next_entry.destination}

— MR Bus Portal Team"""
        )
    except Exception as e:
        print(f"Waitlist notification email failed: {e}")

    return {
        "status": "notified",
        "user_name": user.name,
        "user_email": user.email,
        "waitlist_id": next_entry.waitlist_id,
        "message": f"Notified {user.name} ({user.email})",
    }