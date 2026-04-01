from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path, override=True)

from app.database import engine, Base
from app.models import (  # noqa: F401
    User, OTPCode, UserBooking, LoyaltyPoints,
    PointsTransaction, PasswordResetToken,
    Bus, BusReview, Referral
)
from app.routers import buses, bookings, ai, auth, user, subscriptions, support
from app.routers import secure_bookings, seat_recommendation
from app.routers import payments, loyalty
from app.routers import ai_features
from app.routers import admin
from app.routers import reviews
from app.routers import referrals
from app.routers import profile, notifications
from app.routers import ai
from app.routers import support
from app.routers import waitlist
from app.routers import cities
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MR Bus Portal API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(buses.router)
app.include_router(bookings.router)
app.include_router(ai.router)
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(secure_bookings.router)
app.include_router(seat_recommendation.router)
app.include_router(payments.router)
app.include_router(loyalty.router)
app.include_router(ai_features.router)
app.include_router(admin.router)
app.include_router(reviews.router)
app.include_router(referrals.router)
app.include_router(profile.router)
app.include_router(notifications.router)
app.include_router(ai.router)
app.include_router(support.router)
app.include_router(subscriptions.router)
app.include_router(support.router)
app.include_router(waitlist.router)
app.include_router(cities.router)
@app.get("/")
def home():
    return {"message": "MR Bus Portal API v2.0 running"}