from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.sql import func
from app.database import Base

USERS_ID_FK = "users.id"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)          # ✅ admin flag
    referral_code = Column(String, nullable=True)  # ✅ their own referral code
    referred_by = Column(String, nullable=True)        # ✅ code they used at signup
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OTPCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserBooking(Base):
    __tablename__ = "user_bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(USERS_ID_FK), nullable=False)
    bus_id = Column(Integer, nullable=False)
    bus_name = Column(String, nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    departure = Column(String, nullable=False)
    arrival = Column(String, nullable=True)
    duration = Column(String, nullable=True)
    seat_number = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    transaction_id = Column(String, unique=True, nullable=False)
    status = Column(String, default="confirmed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LoyaltyPoints(Base):
    __tablename__ = "loyalty_points"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(USERS_ID_FK), nullable=False)
    points = Column(Integer, default=0)
    total_earned = Column(Integer, default=0)
    tier = Column(String, default="Bronze")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PointsTransaction(Base):
    __tablename__ = "points_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(USERS_ID_FK), nullable=False)
    points = Column(Integer, nullable=False)
    type = Column(String, nullable=False)   # "earned" or "redeemed"
    description = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    token = Column(String, unique=True, nullable=False)
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ✅ NEW: Bus table (for admin bus management)
class Bus(Base):
    __tablename__ = "buses"

    id = Column(Integer, primary_key=True, index=True)
    bus = Column(String, nullable=False)              # bus name / operator
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    departure = Column(String, nullable=False)
    arrival = Column(String, nullable=True)
    duration = Column(String, nullable=True)
    price = Column(Integer, nullable=False)
    seats_total = Column(Integer, default=32)
    distance_miles = Column(Float, nullable=True)
    amenities = Column(String, nullable=True)         # comma-separated: WiFi,USB,AC
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ✅ NEW: Bus reviews & ratings
class BusReview(Base):
    __tablename__ = "bus_reviews"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(USERS_ID_FK), nullable=False)
    user_name = Column(String, nullable=True)
    bus_id = Column(Integer, nullable=True)
    bus_name = Column(String, nullable=False)
    origin = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    transaction_id = Column(String, nullable=True)
    rating = Column(Integer, nullable=False)
    title = Column(String, nullable=True)
    body = Column(Text, nullable=True)
    review_text = Column(Text, nullable=True)
    tags = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    helpful_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ✅ NEW: Referral system
class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey(USERS_ID_FK), nullable=False)  # who shared
    referred_id = Column(Integer, ForeignKey(USERS_ID_FK), nullable=False)  # who joined
    referral_code = Column(String, nullable=False)
    status = Column(String, default="pending")        # pending / completed
    bonus_points = Column(Integer, default=500)       # points awarded
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint = Column(String, nullable=False)
    p256dh = Column(String, nullable=True)
    auth = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id           = Column(String, nullable=False)
    plan_name         = Column(String, nullable=False)
    billing_cycle     = Column(String, default="monthly")
    price_paid        = Column(Float, nullable=False)
    original_price    = Column(Float, nullable=False)
    promo_code        = Column(String, nullable=True)
    status            = Column(String, default="active")
    rides_remaining   = Column(Integer, nullable=True)
    rides_used        = Column(Integer, default=0)
    points_multiplier = Column(Float, default=1.0)
    invoice_number    = Column(String, unique=True, nullable=False)
    started_at        = Column(DateTime, default=datetime.utcnow)
    next_billing_at   = Column(DateTime, nullable=True)
    cancelled_at      = Column(DateTime, nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", backref="subscriptions")


class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id          = Column(Integer, primary_key=True, index=True)
    ticket_id   = Column(String, unique=True, nullable=False)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    name        = Column(String, nullable=False)
    email       = Column(String, nullable=False)
    category    = Column(String, nullable=False)
    subject     = Column(String, nullable=False)
    message     = Column(Text, nullable=False)
    status      = Column(String, default="open")
    priority    = Column(String, default="normal")
    admin_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", backref="support_tickets")
