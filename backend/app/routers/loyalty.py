from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, LoyaltyPoints, PointsTransaction
from app.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/loyalty", tags=["Loyalty"])
security = HTTPBearer(auto_error=False)

# ── New loyalty math ──────────────────────────────────────────────────────────
# $1 spent  → 1 point earned
# 100 points → $1.00 cash value  (so points / 100 = dollar value)
# Tiers based on total points earned (= total dollars spent)
# ─────────────────────────────────────────────────────────────────────────────

TIER_THRESHOLDS = {
    "Bronze":   0,
    "Silver":   100,   # spent $100
    "Gold":     500,   # spent $500
    "Platinum": 1500,  # spent $1500
}

TIER_COLORS = {
    "Bronze":   "#cd7f32",
    "Silver":   "#c0c0c0",
    "Gold":     "#ffd700",
    "Platinum": "#e5e4e2",
}

TIER_EMOJIS = {
    "Bronze":   "🥉",
    "Silver":   "🥈",
    "Gold":     "🥇",
    "Platinum": "💎",
}

NEXT_TIER_AT = {
    "Bronze":   100,
    "Silver":   500,
    "Gold":     1500,
    "Platinum": 999999,
}


def get_tier(total_earned: int) -> str:
    if total_earned >= 1500:
        return "Platinum"
    elif total_earned >= 500:
        return "Gold"
    elif total_earned >= 100:
        return "Silver"
    return "Bronze"


def points_to_dollars(points: int) -> float:
    """100 points = $1.00"""
    return round(points / 100, 2)


def get_or_create_loyalty(db: Session, user_id: int) -> LoyaltyPoints:
    loyalty = db.query(LoyaltyPoints).filter(LoyaltyPoints.user_id == user_id).first()
    if not loyalty:
        loyalty = LoyaltyPoints(user_id=user_id, points=0, total_earned=0, tier="Bronze")
        db.add(loyalty)
        db.commit()
        db.refresh(loyalty)
    return loyalty


def add_points(db: Session, user_id: int, points: int, description: str):
    """Award points for a booking. points = price in dollars (1:1)."""
    loyalty = get_or_create_loyalty(db, user_id)
    loyalty.points += points
    loyalty.total_earned += points
    loyalty.tier = get_tier(loyalty.total_earned)
    transaction = PointsTransaction(
        user_id=user_id,
        points=points,
        type="earned",
        description=description
    )
    db.add(transaction)
    db.commit()
    return loyalty


def deduct_points(db: Session, user_id: int, points: int, description: str):
    """Reverse points when a booking is cancelled."""
    loyalty = get_or_create_loyalty(db, user_id)
    # Never go below 0
    deduct = min(points, loyalty.points)
    loyalty.points -= deduct
    # Also reverse from total_earned so tier can drop
    loyalty.total_earned = max(0, loyalty.total_earned - deduct)
    loyalty.tier = get_tier(loyalty.total_earned)
    transaction = PointsTransaction(
        user_id=user_id,
        points=-deduct,
        type="cancelled",
        description=description
    )
    db.add(transaction)
    db.commit()
    return loyalty


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/balance")
def get_balance(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
):
    if not credentials:
        return {"points": 0, "tier": "Bronze", "total_earned": 0, "dollar_value": 0.0}
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return {"points": 0, "tier": "Bronze", "total_earned": 0, "dollar_value": 0.0}
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        return {"points": 0, "tier": "Bronze", "total_earned": 0, "dollar_value": 0.0}

    loyalty = get_or_create_loyalty(db, user.id)
    tier = loyalty.tier
    dollar_value = points_to_dollars(loyalty.points)

    return {
        "points":          loyalty.points,
        "total_earned":    loyalty.total_earned,
        "tier":            tier,
        "tier_emoji":      TIER_EMOJIS[tier],
        "tier_color":      TIER_COLORS[tier],
        "next_tier":       NEXT_TIER_AT[tier],
        "points_to_next":  max(0, NEXT_TIER_AT[tier] - loyalty.total_earned),
        # New: dollar value of current points
        "dollar_value":    dollar_value,
        "dollar_value_str": f"${dollar_value:.2f}",
    }


@router.get("/history")
def get_history(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
):
    if not credentials:
        return []
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return []
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        return []
    transactions = (
        db.query(PointsTransaction)
        .filter(PointsTransaction.user_id == user.id)
        .order_by(PointsTransaction.created_at.desc())
        .limit(20)
        .all()
    )
    return transactions


@router.post("/redeem", responses={
    400: {"description": "Insufficient points or below minimum"},
    401: {"description": "Not logged in"},
    404: {"description": "User not found"},
})
def redeem_points(
    points_to_redeem: int,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not logged in")
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    loyalty = get_or_create_loyalty(db, user.id)

    if points_to_redeem < 100:
        raise HTTPException(status_code=400, detail="Minimum redemption is 100 points ($1.00)")
    if loyalty.points < points_to_redeem:
        raise HTTPException(status_code=400, detail=f"Insufficient points. You have {loyalty.points} pts.")

    # 100 points = $1.00
    discount = points_to_dollars(points_to_redeem)

    loyalty.points -= points_to_redeem
    transaction = PointsTransaction(
        user_id=user.id,
        points=-points_to_redeem,
        type="redeemed",
        description=f"Redeemed {points_to_redeem} pts for ${discount:.2f} discount"
    )
    db.add(transaction)
    db.commit()

    return {
        "status":           "success",
        "points_redeemed":  points_to_redeem,
        "discount_amount":  discount,
        "remaining_points": loyalty.points,
        "remaining_value":  points_to_dollars(loyalty.points),
    }