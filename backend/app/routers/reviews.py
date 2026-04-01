from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Annotated, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import User, UserBooking, BusReview
from app.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/reviews", tags=["Reviews"])
security = HTTPBearer(auto_error=False)


def get_user(credentials, db):
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None
    return db.query(User).filter(User.id == int(payload["sub"])).first()


class ReviewCreate(BaseModel):
    bus_id: Optional[int] = None
    bus_name: str
    transaction_id: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    rating: int
    title: Optional[str] = None
    review_text: Optional[str] = None
    body: Optional[str] = None
    tags: Optional[str] = None


@router.post("/create")
def create_review(
    payload: ReviewCreate,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
):
    user = get_user(credentials, db)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    booking = None
    if payload.transaction_id:
        booking = db.query(UserBooking).filter(
            UserBooking.transaction_id == payload.transaction_id,
            UserBooking.user_id == user.id,
        ).first()
        existing = db.query(BusReview).filter(
            BusReview.user_id == user.id,
            BusReview.transaction_id == payload.transaction_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="You already reviewed this booking")
    review_text = payload.review_text or payload.body
    review = BusReview(
        user_id=user.id,
        user_name=user.name,
        bus_id=payload.bus_id or (booking.bus_id if booking else None),
        bus_name=payload.bus_name,
        origin=payload.origin or (booking.origin if booking else None),
        destination=payload.destination or (booking.destination if booking else None),
        transaction_id=payload.transaction_id,
        rating=payload.rating,
        title=payload.title,
        review_text=review_text,
        body=review_text,
        tags=payload.tags,
        is_verified=booking is not None,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return {"status": "created", "review_id": review.id}


@router.get("/bus/{bus_id}")
def get_bus_reviews(
    bus_id: int,
    db: Annotated[Session, Depends(get_db)],
    limit: int = 20,
    offset: int = 0,
):
    reviews = (
        db.query(BusReview, User)
        .join(User, BusReview.user_id == User.id)
        .filter(BusReview.bus_id == bus_id)
        .order_by(BusReview.created_at.desc())
        .offset(offset).limit(limit)
        .all()
    )

    total = db.query(BusReview).filter(BusReview.bus_id == bus_id).count()
    avg = db.query(func.avg(BusReview.rating)).filter(BusReview.bus_id == bus_id).scalar()

    # Rating breakdown
    breakdown = {}
    for i in range(1, 6):
        count = db.query(BusReview).filter(BusReview.bus_id == bus_id, BusReview.rating == i).count()
        breakdown[str(i)] = count

    return {
        "total": total,
        "avg_rating": round(float(avg), 1) if avg else 0,
        "breakdown": breakdown,
        "reviews": [
            {
                "id": r.id,
                "user_name": u.name,
                "rating": r.rating,
                "title": r.title,
                "body": r.body,
                "is_verified": r.is_verified,
                "helpful_count": r.helpful_count,
                "created_at": str(r.created_at),
            }
            for r, u in reviews
        ]
    }


@router.get("/my-reviews", responses={
    401: {"description": "Login required"},
})
def get_my_reviews(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
):
    user = get_user(credentials, db)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")

    reviews = db.query(BusReview).filter(BusReview.user_id == user.id).order_by(BusReview.created_at.desc()).all()
    return [
        {
            "id": r.id, "bus_name": r.bus_name, "rating": r.rating,
            "title": r.title, "body": r.body, "created_at": str(r.created_at)
        }
        for r in reviews
    ]


@router.post("/helpful/{review_id}", responses={
    404: {"description": "Review not found"},
})
def mark_helpful(
    review_id: int,
    db: Annotated[Session, Depends(get_db)]
):
    review = db.query(BusReview).filter(BusReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.helpful_count += 1
    db.commit()
    return {"helpful_count": review.helpful_count}


@router.get("/can-review/{transaction_id}")
def can_review(
    transaction_id: str,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
):
    """Check if user can review this booking (booked it, trip is past, hasn't reviewed yet)"""
    user = get_user(credentials, db)
    if not user:
        return {"can_review": False, "reason": "not_logged_in"}

    booking = db.query(UserBooking).filter(
        UserBooking.transaction_id == transaction_id,
        UserBooking.user_id == user.id,
        UserBooking.status == "confirmed"
    ).first()

    if not booking:
        return {"can_review": False, "reason": "booking_not_found"}

    existing = db.query(BusReview).filter(
        BusReview.user_id == user.id,
        BusReview.transaction_id == transaction_id
    ).first()

    if existing:
        return {"can_review": False, "reason": "already_reviewed", "review_id": existing.id}

    return {"can_review": True, "booking": {"bus_id": booking.bus_id, "bus_name": booking.bus_name}}

@router.get("/all")
def get_all_reviews(limit: int = 100, db: Session = Depends(get_db)):
    reviews = db.query(BusReview).order_by(BusReview.created_at.desc()).limit(limit).all()
    review_list = [{
        "id": r.id,
        "bus_name": r.bus_name,
        "origin": getattr(r, "origin", None),
        "destination": getattr(r, "destination", None),
        "rating": r.rating,
        "title": getattr(r, "title", None),
        "review_text": r.review_text,
        "tags": r.tags.split(",") if r.tags else [],
        "user_name": r.user_name,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reviews]
    breakdown = {1:0, 2:0, 3:0, 4:0, 5:0}
    for r in reviews:
        if r.rating in breakdown:
            breakdown[r.rating] += 1
    total = len(review_list)
    overall = round(sum(r["rating"] for r in review_list) / total, 1) if total > 0 else 0
    return {"reviews": review_list, "total": total, "overall_rating": overall, "breakdown": breakdown}
