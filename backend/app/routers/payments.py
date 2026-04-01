from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import stripe
import os
from dotenv import load_dotenv  # noqa: spelling
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/payments", tags=["Payments"])
security = HTTPBearer(auto_error=False)


class PaymentIntentRequest(BaseModel):
    amount: int  # in cents
    bus_id: int
    seat: str
    bus_name: str
    origin: str
    destination: str


@router.post(
    "/create-payment-intent",
    responses={
        401: {"description": "Not logged in or invalid token"},
        404: {"description": "User not found"},
        400: {"description": "Payment intent creation failed"},
    },
)
def create_payment_intent(
    req: PaymentIntentRequest,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not logged in")

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        intent = stripe.PaymentIntent.create(
            amount=req.amount * 100,  # convert dollars to cents
            currency="usd",
            metadata={
                "user_id": user.id,
                "user_email": user.email,
                "bus_id": req.bus_id,
                "seat": req.seat,
                "bus_name": req.bus_name,
                "origin": req.origin,
                "destination": req.destination
            },
            description=f"MR Bus Portal - {req.origin} → {req.destination} | Seat {req.seat}"
        )
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": req.amount,
            "publishable_key": os.getenv("STRIPE_PUBLISHABLE_KEY")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/confirm-payment",
    responses={
        401: {"description": "Not logged in"},
        400: {"description": "Payment confirmation failed"},
    },
)
def confirm_payment(
    payment_intent_id: str,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not logged in")

    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status == "succeeded":
            return {"status": "success", "message": "Payment confirmed!"}
        else:
            return {"status": intent.status, "message": "Payment not completed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))