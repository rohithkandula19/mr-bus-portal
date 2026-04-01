import secrets
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated

from app.database import get_db
from app.models import User, Referral, LoyaltyPoints, PointsTransaction
from app.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/referrals", tags=["Referrals"])
security = HTTPBearer(auto_error=False)

REFERRER_BONUS = 500    # points given to person who referred
REFEREE_BONUS = 250     # points given to new user who used a referral code


def get_user(credentials, db):
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None
    return db.query(User).filter(User.id == int(payload["sub"])).first()


def generate_referral_code(name: str) -> str:
    """Generate a unique referral code like ABCDEF-4X2K"""
    prefix = name[:6].upper().replace(" ", "")
    suffix = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
    return f"{prefix}-{suffix}"


def add_points(db: Session, user_id: int, points: int, description: str):
    """Add points to a user's loyalty balance"""
    loyalty = db.query(LoyaltyPoints).filter(LoyaltyPoints.user_id == user_id).first()
    if not loyalty:
        loyalty = LoyaltyPoints(user_id=user_id, points=0, total_earned=0, tier="Bronze")
        db.add(loyalty)
        db.flush()

    loyalty.points += points
    loyalty.total_earned += points

    # Update tier
    if loyalty.total_earned >= 5000:
        loyalty.tier = "Platinum"
    elif loyalty.total_earned >= 2000:
        loyalty.tier = "Gold"
    elif loyalty.total_earned >= 500:
        loyalty.tier = "Silver"

    tx = PointsTransaction(
        user_id=user_id,
        points=points,
        type="earned",
        description=description
    )
    db.add(tx)
    db.commit()


@router.get("/my-code", responses={401: {"description": "Login required"}})
def get_my_referral_code(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
):
    """Get or generate the user's referral code"""
    user = get_user(credentials, db)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")

    if not user.referral_code:
        code = generate_referral_code(user.name)
        # Ensure uniqueness
        while db.query(User).filter(User.referral_code == code).first():
            code = generate_referral_code(user.name)
        user.referral_code = code
        db.commit()

    # Count successful referrals
    total_referrals = db.query(Referral).filter(
        Referral.referrer_id == user.id,
        Referral.status == "completed"
    ).count()

    pending_referrals = db.query(Referral).filter(
        Referral.referrer_id == user.id,
        Referral.status == "pending"
    ).count()

    total_bonus_earned = total_referrals * REFERRER_BONUS

    return {
        "referral_code": user.referral_code,
        "referral_link": f"https://mrbusportal.com/signup?ref={user.referral_code}",
        "total_referrals": total_referrals,
        "pending_referrals": pending_referrals,
        "total_bonus_earned": total_bonus_earned,
        "referrer_bonus": REFERRER_BONUS,
        "referee_bonus": REFEREE_BONUS,
        "share_text": f"Book your next bus with MR Bus Portal and get {REFEREE_BONUS} bonus points! Use my code: {user.referral_code} 🚌",
    }


@router.get("/my-referrals", responses={401: {"description": "Login required"}})
def get_my_referrals(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
):
    """List all users referred by this user"""
    user = get_user(credentials, db)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")

    referrals = db.query(Referral, User).join(
        User, Referral.referred_id == User.id
    ).filter(Referral.referrer_id == user.id).order_by(Referral.created_at.desc()).all()

    return [
        {
            "id": r.id,
            "referred_name": u.name,
            "referred_email": u.email[:3] + "***" + u.email[u.email.index("@"):],
            "status": r.status,
            "bonus_points": r.bonus_points if r.status == "completed" else 0,
            "joined": str(r.created_at),
        }
        for r, u in referrals
    ]


@router.post("/complete/{referred_user_id}")
def complete_referral(
    referred_user_id: int,
    db: Annotated[Session, Depends(get_db)]
):
    """
    Called after a referred user completes their first booking.
    Awards points to both referrer and referee.
    Internal endpoint — called from booking flow.
    """
    referred_user = db.query(User).filter(User.id == referred_user_id).first()
    if not referred_user or not referred_user.referred_by:
        return {"status": "no_referral"}

    # Find the referral record
    referral = db.query(Referral).filter(
        Referral.referred_id == referred_user_id,
        Referral.status == "pending"
    ).first()

    if not referral:
        return {"status": "no_pending_referral"}

    # Award points to referrer
    add_points(db, referral.referrer_id, REFERRER_BONUS, f"Referral bonus — {referred_user.name} joined!")

    # Award points to referee
    add_points(db, referred_user_id, REFEREE_BONUS, "Welcome bonus for joining via referral")

    referral.status = "completed"
    referral.bonus_points = REFERRER_BONUS
    db.commit()

    return {"status": "completed", "referrer_bonus": REFERRER_BONUS, "referee_bonus": REFEREE_BONUS}


@router.get("/validate/{code}")
def validate_referral_code(code: str, db: Annotated[Session, Depends(get_db)]):
    """Validate a referral code at signup"""
    user = db.query(User).filter(User.referral_code == code).first()
    if not user:
        return {"valid": False, "message": "Invalid referral code"}
    return {
        "valid": True,
        "referrer_name": user.name.split()[0],
        "bonus_points": REFEREE_BONUS,
        "message": f"You'll get {REFEREE_BONUS} bonus points when you complete your first booking!"
    }

@router.get("/admin/all")
def admin_all_referrals(token: str):
    """Admin: see all referrals — who referred whom."""
    from app.security import decode_access_token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    db = SessionLocal()
    try:
        from app.models import User
        admin = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not admin or not admin.is_admin:
            raise HTTPException(status_code=403, detail="Admin only")

        from app.models import Referral
        referrals = db.query(Referral).order_by(Referral.created_at.desc()).all()

        result = []
        for r in referrals:
            referrer = db.query(User).filter(User.id == r.referrer_id).first()
            referred = db.query(User).filter(User.id == r.referred_id).first()
            result.append({
                "referrer_name": referrer.name if referrer else "Unknown",
                "referrer_email": referrer.email if referrer else "—",
                "referred_name": referred.name if referred else "Unknown",
                "referred_email": referred.email if referred else "—",
                "points_awarded": r.points_awarded if hasattr(r, "points_awarded") else 100,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })
        return result
    finally:
        db.close()
