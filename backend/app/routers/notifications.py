from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserBooking, PushSubscription
from app.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Annotated, Optional
from pathlib import Path
from dotenv import load_dotenv  # noqa: spelling
from datetime import datetime, timezone

load_dotenv(Path(__file__).resolve().parent.parent / ".env")  # noqa: spelling

router = APIRouter(prefix="/notifications", tags=["Notifications"])
security = HTTPBearer(auto_error=False)

NOT_LOGGED_IN = "Not logged in"

CurrentUserDep = Annotated[User, Depends("get_current_user")]
DbDep = Annotated[Session, Depends(get_db)]

UNAUTHORIZED_RESPONSE = {401: {"description": NOT_LOGGED_IN}}
UNAUTHORIZED_AND_SERVER_ERROR_RESPONSE = {
    401: {"description": NOT_LOGGED_IN},
    500: {"description": "Internal server error"},
}


class PushSubscriptionData(BaseModel):
    endpoint: str
    keys: dict  # {p256dh, auth}


class NotificationPayload(BaseModel):
    title: str
    body: str
    icon: Optional[str] = "/logo192.png"
    url: Optional[str] = "/"


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
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


@router.post("/subscribe", responses=UNAUTHORIZED_RESPONSE)
def subscribe(
    sub_data: PushSubscriptionData,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if not current_user:
        raise HTTPException(status_code=401, detail=NOT_LOGGED_IN)

    # Check if already subscribed with this endpoint
    existing = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id,
        PushSubscription.endpoint == sub_data.endpoint
    ).first()

    if existing:
        # Update keys
        existing.p256dh = sub_data.keys.get("p256dh", "")
        existing.auth = sub_data.keys.get("auth", "")
        db.commit()
        return {"status": "updated"}

    new_sub = PushSubscription(
        user_id=current_user.id,
        endpoint=sub_data.endpoint,
        p256dh=sub_data.keys.get("p256dh", ""),
        auth=sub_data.keys.get("auth", "")
    )
    db.add(new_sub)
    db.commit()
    return {"status": "subscribed", "message": "Push notifications enabled!"}


@router.delete("/unsubscribe", responses=UNAUTHORIZED_RESPONSE)
def unsubscribe(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if not current_user:
        raise HTTPException(status_code=401, detail=NOT_LOGGED_IN)
    db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id
    ).delete()
    db.commit()
    return {"status": "unsubscribed"}


@router.get("/status")
def get_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if not current_user:
        return {"subscribed": False}
    sub = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id
    ).first()
    return {"subscribed": sub is not None}


@router.post("/send-test", responses=UNAUTHORIZED_AND_SERVER_ERROR_RESPONSE)
def send_test_notification(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Send a test notification to the current user via email fallback."""
    if not current_user:
        raise HTTPException(status_code=401, detail=NOT_LOGGED_IN)
    try:
        from app.email_utils import send_email
        send_email(
            to_email=current_user.email,
            subject="🔔 MR Bus Portal — Test Notification",
            body=f"""Hello {current_user.name},

This is a test notification from MR Bus Portal! 🚌

Your notifications are working correctly. You'll receive:
• Booking confirmation reminders
• Upcoming departure alerts (24h before)
• Price drop alerts
• Cancellation confirmations

Thank you for using MR Bus Portal!"""
        )
        return {"status": "sent", "message": f"Test notification sent to {current_user.email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-departure-reminders")
def send_departure_reminders(
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Call this endpoint from a cron job every hour.
    Sends email reminders for departures within the next 24 hours.
    """
    now = datetime.now(timezone.utc)
    bookings = db.query(UserBooking).filter(
        UserBooking.status == "confirmed"
    ).all()

    reminders_sent = 0
    for booking in bookings:
        try:
            dep_dt = datetime.strptime(booking.departure, "%m-%d-%Y %H:%M")
            dep_dt = dep_dt.replace(tzinfo=timezone.utc)
            hours_until = (dep_dt - now).total_seconds() / 3600

            # Send reminder if departure is 2-26 hours away
            if 2 <= hours_until <= 26:
                user = db.query(User).filter(User.id == booking.user_id).first()
                if user:
                    background_tasks.add_task(
                        _send_departure_reminder, user, booking, round(hours_until)
                    )
                    reminders_sent += 1
        except Exception:
            continue

    return {"status": "ok", "reminders_queued": reminders_sent}


def _send_departure_reminder(user, booking, hours_until: int):
    try:
        from app.email_utils import send_email
        time_label = f"{hours_until} hours" if hours_until > 1 else "1 hour"
        send_email(
            to_email=user.email,
            subject=f"🚌 Reminder: Your bus departs in {time_label}!",
            body=f"""Hello {user.name},

Your bus departs in {time_label}! ⏰

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DEPARTURE REMINDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Transaction ID  : {booking.transaction_id}
  Bus             : {booking.bus_name}
  Route           : {booking.origin} → {booking.destination}
  Departure       : {booking.departure}
  Seat            : {booking.seat_number}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Tips:
• Arrive at the terminal 15 minutes early
• Have your ticket/boarding pass ready
• Check for platform updates at the terminal

Safe travels! 🚌
— MR Bus Portal Team"""
        )
    except Exception as e:
        print(f"Reminder email failed: {e} - notifications.py:213")