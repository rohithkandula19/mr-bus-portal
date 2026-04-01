import uuid
from fastapi import APIRouter, Depends
from typing import Annotated, Any
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserBooking
from app.schemas import SecureBookingRequest
from app.routers.user import get_current_user
from app.email_utils import send_booking_receipt_email

router = APIRouter(prefix="/secure-bookings", tags=["Secure Bookings"])


@router.post("/book")
def secure_book(
    payload: SecureBookingRequest,
    current_user: Annotated[
        Any, Depends(get_current_user)
    ],
    db: Annotated[
        Session, Depends(get_db)
    ]
):
    transaction_id = f"TXN-{uuid.uuid4().hex[:10].upper()}"

    booking = UserBooking(
        user_id=current_user.id,
        bus_id=payload.bus_id,
        bus_name=payload.bus_name,
        origin=payload.origin,
        destination=payload.destination,
        departure=payload.departure,
        arrival=payload.arrival,
        duration=payload.duration,
        seat_number=payload.seat_number,
        price=payload.price,
        transaction_id=transaction_id,
        status="confirmed",
    )

    db.add(booking)
    db.commit()
    db.refresh(booking)

    send_booking_receipt_email(
        to_email=current_user.email,
        user_name=current_user.name,
        bus_name=payload.bus_name,
        origin=payload.origin,
        destination=payload.destination,
        departure=payload.departure,
        arrival=payload.arrival,
        duration=payload.duration,
        seat_number=payload.seat_number,
        price=payload.price,
        transaction_id=transaction_id,
    )

    return {
        "message": "Booking confirmed",
        "transaction_id": transaction_id,
        "booking_id": booking.id
    }