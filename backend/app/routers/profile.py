from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserBooking, LoyaltyPoints
from app.security import decode_access_token, hash_password, verify_password
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Annotated, Optional
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

router = APIRouter(prefix="/profile", tags=["Profile"])
security = HTTPBearer(auto_error=False)

NOT_LOGGED_IN = "Not logged in"


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
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


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.get("/me", responses={401: {"description": NOT_LOGGED_IN}})
def get_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    if not current_user:
        raise HTTPException(status_code=401, detail=NOT_LOGGED_IN)

    bookings = db.query(UserBooking).filter(
        UserBooking.user_id == current_user.id
    ).all()
    loyalty = db.query(LoyaltyPoints).filter(
        LoyaltyPoints.user_id == current_user.id
    ).first()

    confirmed = [b for b in bookings if b.status == "confirmed"]
    cancelled = [b for b in bookings if b.status == "cancelled"]
    total_spent = sum(b.price for b in confirmed)

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "is_verified": current_user.is_verified,
        "member_since": str(current_user.created_at),
        "stats": {
            "total_bookings": len(confirmed),
            "cancelled_bookings": len(cancelled),
            "total_spent": total_spent,
            "loyalty_points": loyalty.points if loyalty else 0,
            "loyalty_tier": loyalty.tier if loyalty else "Bronze",
            "total_earned": loyalty.total_earned if loyalty else 0,
        }
    }


@router.put("/update", responses={400: {"description": "Bad request"}, 401: {"description": NOT_LOGGED_IN}})
def update_profile(
    req: UpdateProfileRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    if not current_user:
        raise HTTPException(status_code=401, detail=NOT_LOGGED_IN)

    if req.name and req.name.strip():
        current_user.name = req.name.strip()

    if req.email and req.email != current_user.email:
        existing = db.query(User).filter(
            User.email == req.email,
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another account")
        current_user.email = req.email

    db.commit()
    db.refresh(current_user)
    return {
        "status": "updated",
        "name": current_user.name,
        "email": current_user.email
    }


@router.put("/change-password", responses={400: {"description": "Bad request"}, 401: {"description": NOT_LOGGED_IN}})
def change_password(
    req: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    if not current_user:
        raise HTTPException(status_code=401, detail=NOT_LOGGED_IN)

    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    current_user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"status": "password_changed", "message": "Password updated successfully!"}


@router.delete("/delete-account", responses={401: {"description": NOT_LOGGED_IN}})
def delete_account(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    if not current_user:
        raise HTTPException(status_code=401, detail=NOT_LOGGED_IN)

    # Cancel all bookings
    db.query(UserBooking).filter(
        UserBooking.user_id == current_user.id,
        UserBooking.status == "confirmed"
    ).update({"status": "cancelled"})

    db.delete(current_user)
    db.commit()
    return {"status": "deleted", "message": "Account deleted successfully"}
