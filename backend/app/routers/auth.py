import random
import os
import secrets
from datetime import datetime, timedelta, UTC
from typing import Annotated
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

from app.database import get_db
from app.models import User, OTPCode, PasswordResetToken
from app.schemas import SignupRequest, VerifyOTPRequest, LoginRequest, TokenResponse
from app.security import hash_password, verify_password, create_access_token
from app.email_utils import send_otp_email, send_reset_email
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Auth"])

# ── Google OAuth ──────────────────────────────────────────────────────────────
class GoogleAuthRequest(BaseModel):
    token: str

@router.post("/google", response_model=TokenResponse, responses={
    400: {"description": "No email in Google token"},
    401: {"description": "Invalid Google token"},
    500: {"description": "Google OAuth not configured or library not installed"},
})
def google_auth(payload: GoogleAuthRequest, db: Annotated[Session, Depends(get_db)]):
    """Verify Google ID token and sign the user in (or auto-register them)."""
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as grequests

        GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
        if not GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=500, detail="Google OAuth not configured on server")

        idinfo = id_token.verify_oauth2_token(
            payload.token,
            grequests.Request(),
            GOOGLE_CLIENT_ID
        )

        email = idinfo.get("email")
        name = idinfo.get("name", email.split("@")[0])

        if not email:
            raise HTTPException(status_code=400, detail="No email in Google token")

        # Find or create user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                name=name,
                email=email,
                password_hash=hash_password(secrets.token_hex(32)),  # random unusable password
                is_verified=True  # Google accounts are pre-verified
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_access_token({
            "sub": str(user.id),
            "email": user.email,
            "name": user.name
        })
        return TokenResponse(access_token=token)

    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Google auth library not installed. Run: pip install google-auth"
        )


# ── Signup ────────────────────────────────────────────────────────────────────
@router.post("/signup", responses={400: {"description": "Email already registered"}})
def signup(payload: SignupRequest, db: Annotated[Session, Depends(get_db)]):
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate unique referral code for new user
    from app.routers.referrals import generate_referral_code
    ref_code = generate_referral_code(payload.name)
    while db.query(User).filter(User.referral_code == ref_code).first():
        ref_code = generate_referral_code(payload.name)

    # Check if referred by someone
    referrer = None
    if hasattr(payload, 'referral_code') and payload.referral_code:
        referrer = db.query(User).filter(
            User.referral_code == payload.referral_code.strip().upper()
        ).first()

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        is_verified=False,
        referral_code=ref_code,
        referred_by=referrer.id if referrer else None
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create pending referral record
    if referrer:
        from app.models import Referral as ReferralModel
        referral = ReferralModel(
            referrer_id=referrer.id,
            referred_id=user.id,
            referral_code=payload.referral_code.strip().upper(),
            status="pending",
            bonus_points=0
        )
        db.add(referral)
        db.commit()

    otp = str(random.randint(100000, 999999))
    otp_row = OTPCode(email=payload.email, otp=otp, is_used=False)
    db.add(otp_row)
    db.commit()

    send_otp_email(payload.email, otp)
    return {"message": "Signup successful. OTP sent to email."}


# ── Verify OTP ────────────────────────────────────────────────────────────────
@router.post("/verify-otp", responses={400: {"description": "Invalid OTP"}, 404: {"description": "User not found"}})
def verify_otp(payload: VerifyOTPRequest, db: Annotated[Session, Depends(get_db)]):
    otp_row = (
        db.query(OTPCode)
        .filter(OTPCode.email == payload.email, OTPCode.otp == payload.otp, OTPCode.is_used == False)
        .order_by(OTPCode.id.desc())
        .first()
    )
    if not otp_row:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp_row.is_used = True
    user.is_verified = True
    db.commit()
    return {"message": "OTP verified successfully"}


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse, responses={400: {"description": "Invalid credentials"}})
def login(payload: LoginRequest, db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Please verify your email first")

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "name": user.name
    })
    return TokenResponse(access_token=token)


# ── Forgot Password ───────────────────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: str

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}

    # Invalidate old tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.email == payload.email,
        PasswordResetToken.is_used == False
    ).update({"is_used": True})
    db.commit()

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(hours=1)

    reset_token = PasswordResetToken(
        email=payload.email,
        token=token,
        is_used=False,
        expires_at=expires_at
    )
    db.add(reset_token)
    db.commit()

    reset_link = f"http://localhost:3000/reset-password?token={token}&email={payload.email}"
    send_reset_email(payload.email, reset_link)

    return {"message": "If that email exists, a reset link has been sent."}


# ── Reset Password ────────────────────────────────────────────────────────────
class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    new_password: str

@router.post("/reset-password", responses={
    400: {"description": "Invalid or expired reset link"},
    404: {"description": "User not found"},
})
def reset_password(payload: ResetPasswordRequest, db: Annotated[Session, Depends(get_db)]):
    reset_token = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == payload.email,
            PasswordResetToken.token == payload.token,
            PasswordResetToken.is_used == False
        )
        .first()
    )

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    # Check expiry
    expires = reset_token.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if datetime.now(UTC) > expires:
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    reset_token.is_used = True
    db.commit()

    return {"message": "Password reset successfully. You can now log in."}