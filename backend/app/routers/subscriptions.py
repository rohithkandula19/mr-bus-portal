# backend/app/routers/subscriptions.py
# Full production subscription router

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import string

from app.database import SessionLocal
from app.security import decode_access_token
from app.models import User, UserSubscription, LoyaltyPoints
from app.email_utils import send_email

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

# ─── Plan Definitions ─────────────────────────────────────────────────────────

PLANS = {
    "starter": {
        "name": "Starter",
        "emoji": "🥉",
        "monthly_price": 49,
        "annual_price": 39,       # 49 * 0.8
        "rides": 4,               # None = unlimited
        "points_multiplier": 2.0,
        "bonus_points_on_signup": 200,
        "features": ["4 rides/month", "10% off extra rides", "2x loyalty points", "Email support"],
        "perks": ["standard_booking"],
    },
    "commuter": {
        "name": "Commuter",
        "emoji": "🥈",
        "monthly_price": 99,
        "annual_price": 79,
        "rides": 10,
        "points_multiplier": 3.0,
        "bonus_points_on_signup": 500,
        "features": ["10 rides/month", "20% off extra rides", "3x loyalty points", "Priority boarding", "Free seat selection"],
        "perks": ["priority_boarding", "free_seat_selection", "standard_booking"],
    },
    "unlimited": {
        "name": "Unlimited",
        "emoji": "🥇",
        "monthly_price": 199,
        "annual_price": 159,
        "rides": None,
        "points_multiplier": 5.0,
        "bonus_points_on_signup": 1000,
        "features": ["Unlimited rides", "5x loyalty points", "Priority boarding", "Reserved seat", "Free luggage", "24/7 support"],
        "perks": ["priority_boarding", "free_seat_selection", "free_luggage", "reserved_seat", "no_cancellation_fee", "standard_booking"],
    },
    "corporate": {
        "name": "Corporate",
        "emoji": "💎",
        "monthly_price": None,
        "annual_price": None,
        "rides": None,
        "points_multiplier": 5.0,
        "bonus_points_on_signup": 2000,
        "features": ["Custom rides", "5x loyalty points", "All Unlimited perks", "Dedicated manager", "API access"],
        "perks": ["all"],
    },
}

PROMO_CODES = {
    "MRPASS20": 0.20,   # 20% off
    "WELCOME10": 0.10,  # 10% off
    "ANNUAL15": 0.15,   # 15% off (stacks with annual)
}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(token: str, db: Session):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def generate_invoice_number() -> str:
    year = datetime.utcnow().year
    rand = ''.join(secrets.choice(string.digits) for _ in range(6))
    return f"MR-INV-{year}-{rand}"


def calculate_price(plan_id: str, billing: str, promo_code: str | None) -> dict:
    plan = PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if plan["monthly_price"] is None:
        return {"original": 0, "final": 0, "discount": 0, "promo_applied": False}

    base = plan["annual_price"] if billing == "annual" else plan["monthly_price"]
    discount = 0.0

    promo_applied = False
    if promo_code and promo_code.upper() in PROMO_CODES:
        discount = PROMO_CODES[promo_code.upper()]
        promo_applied = True

    final = round(base * (1 - discount), 2)
    return {
        "original": base,
        "final": final,
        "discount_pct": int(discount * 100),
        "discount_amount": round(base - final, 2),
        "promo_applied": promo_applied,
    }


def send_subscription_email(user: User, sub: UserSubscription, plan_config: dict):
    """Send a beautiful HTML confirmation email."""
    plan = plan_config
    features_html = "".join(f"<li style='margin:6px 0;'>✅ {f}</li>" for f in plan["features"])
    next_bill = sub.next_billing_at.strftime("%B %d, %Y") if sub.next_billing_at else "N/A"
    billing_label = "Annual" if sub.billing_cycle == "annual" else "Monthly"

    html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:'Helvetica Neue',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0e0618,#1a0a2e);padding:40px 40px 32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">{plan['emoji']}</div>
      <h1 style="color:#fff;font-size:26px;margin:0 0 8px;font-weight:800;">You're subscribed!</h1>
      <p style="color:rgba(255,255,255,0.55);font-size:14px;margin:0;">Welcome to the {sub.plan_name} Plan — let's go! 🚌</p>
    </div>

    <!-- Invoice Block -->
    <div style="padding:28px 40px;background:#faf7f3;border-bottom:1px solid #e8e2d9;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:#9c8b78;font-weight:600;">Invoice</span>
        <span style="font-size:13px;color:#1a1207;font-weight:700;font-family:monospace;">{sub.invoice_number}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:#9c8b78;font-weight:600;">Plan</span>
        <span style="font-size:13px;color:#1a1207;font-weight:700;">{sub.plan_name} ({billing_label})</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:#9c8b78;font-weight:600;">Amount Charged</span>
        <span style="font-size:18px;color:#f97316;font-weight:800;">${sub.price_paid}/month</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:#9c8b78;font-weight:600;">Next Billing Date</span>
        <span style="font-size:13px;color:#1a1207;font-weight:700;">{next_bill}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:13px;color:#9c8b78;font-weight:600;">Status</span>
        <span style="font-size:12px;background:#f0fdf4;color:#16a34a;padding:3px 10px;border-radius:20px;font-weight:700;border:1px solid #bbf7d0;">✅ Active</span>
      </div>
    </div>

    <!-- What's included -->
    <div style="padding:28px 40px;">
      <h2 style="font-size:16px;color:#1a1207;font-weight:800;margin:0 0 16px;">What's included in your plan:</h2>
      <ul style="list-style:none;padding:0;margin:0;color:#4a3728;font-size:14px;">
        {features_html}
      </ul>
    </div>

    <!-- Loyalty Points Bonus -->
    <div style="margin:0 40px 28px;background:linear-gradient(135deg,#fff7ed,#fef3e2);border:1.5px solid rgba(249,115,22,0.25);border-radius:14px;padding:18px 20px;">
      <div style="font-size:14px;font-weight:800;color:#c2410c;margin-bottom:4px;">🏆 {plan['bonus_points_on_signup']:,} bonus loyalty points added!</div>
      <div style="font-size:12px;color:#9c8b78;">= ${plan['bonus_points_on_signup']/100:.2f} in travel discounts. Check your balance in the app.</div>
    </div>

    <!-- CTA -->
    <div style="padding:0 40px 32px;text-align:center;">
      <a href="https://mrbusportal.com/my-bookings"
         style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 4px 16px rgba(249,115,22,0.35);">
        Start Booking Now →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:20px 40px;background:#f7f3ee;border-top:1px solid #e8e2d9;text-align:center;">
      <p style="font-size:11px;color:#b0a090;margin:0 0 6px;">MR Bus Portal · support@mrbusportal.com</p>
      <p style="font-size:11px;color:#b0a090;margin:0;">
        To cancel your subscription, visit your <a href="https://mrbusportal.com/profile" style="color:#f97316;">profile page</a> or reply to this email.
      </p>
      <p style="font-size:10px;color:#c4b8a8;margin:8px 0 0;">© 2026 MR Bus Portal. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""
    send_email(
        to_email=user.email,
        subject=f"🎉 Your MR Bus {sub.plan_name} Plan is Active! Invoice {sub.invoice_number}",
        body=html_body,
    )


# ─── Request / Response Schemas ───────────────────────────────────────────────

class PurchaseRequest(BaseModel):
    token: str
    plan_id: str
    billing: str = "monthly"      # monthly | annual
    promo_code: str | None = None
    # In real Stripe integration, you'd pass payment_intent_id here
    payment_intent_id: str | None = None


class CancelRequest(BaseModel):
    token: str
    reason: str | None = None


class ValidatePromoRequest(BaseModel):
    plan_id: str
    billing: str
    promo_code: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/validate-promo")
def validate_promo(req: ValidatePromoRequest):
    """Check if a promo code is valid and return discount info."""
    code = req.promo_code.strip().upper()
    if code not in PROMO_CODES:
        return {"valid": False, "message": "Invalid promo code"}
    pricing = calculate_price(req.plan_id, req.billing, code)
    return {
        "valid": True,
        "discount_pct": pricing["discount_pct"],
        "discount_amount": pricing["discount_amount"],
        "final_price": pricing["final"],
        "message": f"✅ {pricing['discount_pct']}% discount applied!",
    }


@router.post("/purchase")
def purchase_subscription(req: PurchaseRequest):
    """
    Complete a subscription purchase.
    Creates subscription record, awards bonus points, sends confirmation email.
    """
    db = SessionLocal()
    try:
        user = get_current_user(req.token, db)
        plan_config = PLANS.get(req.plan_id)
        if not plan_config:
            raise HTTPException(status_code=400, detail="Invalid plan ID")

        # Calculate pricing
        pricing = calculate_price(req.plan_id, req.billing, req.promo_code)

        # Cancel any existing active subscription first
        existing = db.query(UserSubscription).filter(
            UserSubscription.user_id == user.id,
            UserSubscription.status == "active"
        ).first()
        if existing:
            existing.status = "cancelled"
            existing.cancelled_at = datetime.utcnow()

        # Calculate billing dates
        now = datetime.utcnow()
        next_billing = now + timedelta(days=365 if req.billing == "annual" else 30)

        # Create subscription record
        sub = UserSubscription(
            user_id=user.id,
            plan_id=req.plan_id,
            plan_name=plan_config["name"],
            billing_cycle=req.billing,
            price_paid=pricing["final"],
            original_price=pricing["original"],
            promo_code=req.promo_code.upper() if req.promo_code else None,
            status="active",
            rides_remaining=plan_config["rides"],  # None for unlimited
            rides_used=0,
            points_multiplier=plan_config["points_multiplier"],
            invoice_number=generate_invoice_number(),
            started_at=now,
            next_billing_at=next_billing,
        )
        db.add(sub)
        db.flush()  # get sub.id before commit

        # Award bonus loyalty points immediately
        loyalty = db.query(LoyaltyPoints).filter(LoyaltyPoints.user_id == user.id).first()
        bonus = plan_config["bonus_points_on_signup"]
        if loyalty:
            loyalty.points += bonus
            loyalty.total_earned += bonus
        else:
            loyalty = LoyaltyPoints(
                user_id=user.id,
                points=bonus,
                total_earned=bonus,
                tier="Bronze",
            )
            db.add(loyalty)

        db.commit()
        db.refresh(sub)

        # Send confirmation email
        try:
            send_subscription_email(user, sub, plan_config)
        except Exception as e:
            print(f"Email send failed (non-fatal): {e}")

        return {
            "status": "success",
            "message": f"🎉 Welcome to the {plan_config['name']} Plan!",
            "subscription": {
                "id": sub.id,
                "plan_id": sub.plan_id,
                "plan_name": sub.plan_name,
                "plan_emoji": plan_config["emoji"],
                "billing_cycle": sub.billing_cycle,
                "price_paid": sub.price_paid,
                "invoice_number": sub.invoice_number,
                "started_at": sub.started_at.isoformat(),
                "next_billing_at": sub.next_billing_at.isoformat(),
                "rides_remaining": sub.rides_remaining,
                "points_multiplier": sub.points_multiplier,
                "perks": plan_config["perks"],
                "bonus_points_awarded": bonus,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Subscription purchase error: {e}")
        raise HTTPException(status_code=500, detail="Purchase failed. Please try again.")
    finally:
        db.close()


@router.get("/my-subscription")
def get_my_subscription(token: str):
    """Get the current user's active subscription."""
    db = SessionLocal()
    try:
        user = get_current_user(token, db)
        sub = db.query(UserSubscription).filter(
            UserSubscription.user_id == user.id,
            UserSubscription.status == "active"
        ).order_by(UserSubscription.started_at.desc()).first()

        if not sub:
            return {"has_subscription": False, "subscription": None}

        plan_config = PLANS.get(sub.plan_id, {})
        return {
            "has_subscription": True,
            "subscription": {
                "id": sub.id,
                "plan_id": sub.plan_id,
                "plan_name": sub.plan_name,
                "plan_emoji": plan_config.get("emoji", "🎫"),
                "billing_cycle": sub.billing_cycle,
                "price_paid": sub.price_paid,
                "invoice_number": sub.invoice_number,
                "started_at": sub.started_at.isoformat(),
                "next_billing_at": sub.next_billing_at.isoformat() if sub.next_billing_at else None,
                "rides_remaining": sub.rides_remaining,
                "rides_used": sub.rides_used,
                "points_multiplier": sub.points_multiplier,
                "perks": plan_config.get("perks", []),
                "status": sub.status,
                "features": plan_config.get("features", []),
            }
        }
    finally:
        db.close()


@router.post("/cancel")
def cancel_subscription(req: CancelRequest):
    """Cancel the user's active subscription."""
    db = SessionLocal()
    try:
        user = get_current_user(req.token, db)
        sub = db.query(UserSubscription).filter(
            UserSubscription.user_id == user.id,
            UserSubscription.status == "active"
        ).first()

        if not sub:
            raise HTTPException(status_code=404, detail="No active subscription found")

        sub.status = "cancelled"
        sub.cancelled_at = datetime.utcnow()
        db.commit()

        # Send cancellation email
        try:
            active_until = sub.next_billing_at.strftime("%B %d, %Y") if sub.next_billing_at else "end of period"
            send_email(
                to_email=user.email,
                subject=f"MR Bus Portal — Subscription Cancelled",
                body=f"""Hi {user.name},

Your {sub.plan_name} Plan has been cancelled as requested.

Your plan remains active until: {active_until}
Invoice reference: {sub.invoice_number}

We're sorry to see you go! If you'd like to resubscribe, visit mrbusportal.com/subscription.

— MR Bus Portal Team
support@mrbusportal.com
""",
            )
        except Exception:
            pass

        return {
            "status": "cancelled",
            "message": f"Your {sub.plan_name} Plan has been cancelled. Active until {sub.next_billing_at.strftime('%B %d, %Y') if sub.next_billing_at else 'end of billing period'}.",
            "active_until": sub.next_billing_at.isoformat() if sub.next_billing_at else None,
        }
    finally:
        db.close()


@router.get("/history")
def subscription_history(token: str):
    """Full subscription history for a user."""
    db = SessionLocal()
    try:
        user = get_current_user(token, db)
        subs = db.query(UserSubscription).filter(
            UserSubscription.user_id == user.id
        ).order_by(UserSubscription.created_at.desc()).all()

        return [{
            "id": s.id,
            "plan_name": s.plan_name,
            "billing_cycle": s.billing_cycle,
            "price_paid": s.price_paid,
            "invoice_number": s.invoice_number,
            "status": s.status,
            "started_at": s.started_at.isoformat(),
            "cancelled_at": s.cancelled_at.isoformat() if s.cancelled_at else None,
        } for s in subs]
    finally:
        db.close()


@router.get("/admin/all")
def admin_all_subscriptions(token: str):
    """Admin: view all subscriptions across all users."""
    db = SessionLocal()
    try:
        user = get_current_user(token, db)
        if not user.is_admin:
            raise HTTPException(status_code=403, detail="Admin only")

        subs = db.query(UserSubscription).order_by(UserSubscription.created_at.desc()).all()
        total_revenue = sum(s.price_paid for s in subs if s.status == "active")
        active_count = sum(1 for s in subs if s.status == "active")

        return {
            "total_subscriptions": len(subs),
            "active_subscriptions": active_count,
            "monthly_revenue": round(total_revenue, 2),
            "subscriptions": [{
                "id": s.id,
                "user_id": s.user_id,
                "plan_name": s.plan_name,
                "billing_cycle": s.billing_cycle,
                "price_paid": s.price_paid,
                "invoice_number": s.invoice_number,
                "status": s.status,
                "started_at": s.started_at.isoformat(),
                "rides_remaining": s.rides_remaining,
            } for s in subs]
        }
    finally:
        db.close()
