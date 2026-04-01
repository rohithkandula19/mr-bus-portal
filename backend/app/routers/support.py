# backend/app/routers/support.py
# Full support ticket system

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime
import secrets

from app.database import SessionLocal
from app.security import decode_access_token
from app.models import User, SupportTicket
from app.email_utils import send_email

router = APIRouter(prefix="/support", tags=["Support"])

CATEGORIES = ["billing", "booking", "complaint", "technical", "general", "refund", "other"]

# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_ticket_id() -> str:
    year = datetime.utcnow().year
    rand = secrets.randbelow(99999)
    return f"MR-{year}-{rand:05d}"


def send_ticket_confirmation(name: str, email: str, ticket_id: str, category: str, subject: str, message: str):
    html = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:'Helvetica Neue',sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0e0618,#1a0a2e);padding:36px 40px;text-align:center;">
      <div style="font-size:42px;margin-bottom:10px;">🎫</div>
      <h1 style="color:#fff;font-size:22px;margin:0 0 6px;font-weight:800;">Support Ticket Created</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">We've received your message and will respond shortly.</p>
    </div>
    <div style="padding:28px 40px;background:#faf7f3;border-bottom:1px solid #e8e2d9;">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:13px;color:#9c8b78;font-weight:600;">Ticket ID</span>
        <span style="font-size:14px;color:#1a1207;font-weight:800;font-family:monospace;">{ticket_id}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:13px;color:#9c8b78;font-weight:600;">Category</span>
        <span style="font-size:13px;color:#1a1207;font-weight:700;text-transform:capitalize;">{category}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:13px;color:#9c8b78;font-weight:600;">Subject</span>
        <span style="font-size:13px;color:#1a1207;font-weight:700;">{subject[:60]}</span>
      </div>
    </div>
    <div style="padding:24px 40px;">
      <h3 style="font-size:14px;color:#9c8b78;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">Your Message</h3>
      <p style="font-size:14px;color:#4a3728;line-height:1.7;background:#f7f3ee;border-radius:10px;padding:16px;border-left:3px solid #f97316;">{message[:500]}{'...' if len(message) > 500 else ''}</p>
    </div>
    <div style="padding:0 40px 28px;">
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;">
        <div style="font-size:14px;font-weight:800;color:#c2410c;margin-bottom:6px;">⏱️ Expected Response Time</div>
        <div style="font-size:13px;color:#9c8b78;">
          • <strong>Billing / Urgent:</strong> Within 4 hours<br/>
          • <strong>Booking issues:</strong> Within 12 hours<br/>
          • <strong>General enquiries:</strong> Within 24 hours
        </div>
      </div>
    </div>
    <div style="padding:20px 40px;background:#f7f3ee;border-top:1px solid #e8e2d9;text-align:center;">
      <p style="font-size:11px;color:#b0a090;margin:0;">MR Bus Portal by Rohith Kandula · noreplymrbuses@gmail.com</p>
      <p style="font-size:10px;color:#c4b8a8;margin:6px 0 0;">Reference this ticket ID in all future correspondence: <strong>{ticket_id}</strong></p>
    </div>
  </div>
</body>
</html>
"""
    send_email(
        to_email=email,
        subject=f"[{ticket_id}] Support Request Received — MR Bus Portal",
        body=html,
    )


def send_admin_notification(ticket_id: str, name: str, email: str, category: str, subject: str, message: str):
    """Notify admin email when a new ticket arrives."""
    send_email(
        to_email="noreplymrbuses@gmail.com",
        subject=f"🆕 New Support Ticket [{ticket_id}] — {category.upper()}",
        body=f"""New support ticket received.

Ticket: {ticket_id}
From: {name} <{email}>
Category: {category}
Subject: {subject}

Message:
{message}

---
Reply to this ticket at: https://mrbusportal.com/admin
""",
    )


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CreateTicketRequest(BaseModel):
    name: str
    email: str
    category: str
    subject: str
    message: str
    token: str | None = None   # optional — links to user if logged in


class UpdateTicketRequest(BaseModel):
    token: str
    status: str | None = None
    priority: str | None = None
    admin_notes: str | None = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/ticket")
def create_ticket(req: CreateTicketRequest):
    """Create a new support ticket. Works for both logged-in and guest users."""
    if req.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Use: {CATEGORIES}")
    if len(req.message.strip()) < 20:
        raise HTTPException(status_code=400, detail="Message must be at least 20 characters")

    db = SessionLocal()
    try:
        # Optionally link to user account
        user_id = None
        if req.token:
            try:
                payload = decode_access_token(req.token)
                if payload:
                    user = db.query(User).filter(User.id == int(payload["sub"])).first()
                    if user:
                        user_id = user.id
            except Exception:
                pass

        # Assign priority based on category
        priority_map = {"billing": "high", "booking": "high", "complaint": "high", "technical": "normal", "refund": "high", "general": "low", "other": "low"}
        priority = priority_map.get(req.category, "normal")

        ticket = SupportTicket(
            ticket_id=generate_ticket_id(),
            user_id=user_id,
            name=req.name.strip(),
            email=req.email.strip().lower(),
            category=req.category,
            subject=req.subject.strip(),
            message=req.message.strip(),
            status="open",
            priority=priority,
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)

        # Send emails
        try:
            send_ticket_confirmation(ticket.name, ticket.email, ticket.ticket_id, ticket.category, ticket.subject, ticket.message)
            send_admin_notification(ticket.ticket_id, ticket.name, ticket.email, ticket.category, ticket.subject, ticket.message)
        except Exception as e:
            print(f"Ticket email failed (non-fatal): {e}")

        return {
            "status": "created",
            "ticket_id": ticket.ticket_id,
            "message": f"✅ Ticket {ticket.ticket_id} created! Check {req.email} for confirmation.",
            "priority": priority,
            "expected_response": "4 hours" if priority == "high" else "24 hours",
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create ticket: {str(e)}")
    finally:
        db.close()


@router.get("/ticket/{ticket_id}")
def get_ticket(ticket_id: str):
    """Look up a ticket by ID — no auth required (ticket ID is the access key)."""
    db = SessionLocal()
    try:
        ticket = db.query(SupportTicket).filter(SupportTicket.ticket_id == ticket_id.upper()).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return {
            "ticket_id": ticket.ticket_id,
            "name": ticket.name,
            "category": ticket.category,
            "subject": ticket.subject,
            "status": ticket.status,
            "priority": ticket.priority,
            "created_at": ticket.created_at.isoformat(),
            "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
        }
    finally:
        db.close()


@router.get("/my-tickets")
def my_tickets(token: str):
    """Get all tickets for the logged-in user."""
    db = SessionLocal()
    try:
        payload = decode_access_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        tickets = db.query(SupportTicket).filter(
            SupportTicket.user_id == int(payload["sub"])
        ).order_by(SupportTicket.created_at.desc()).all()
        return [{
            "ticket_id": t.ticket_id,
            "category": t.category,
            "subject": t.subject,
            "message": t.message,
            "admin_notes": t.admin_notes,
            "status": t.status,
            "priority": t.priority,
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        } for t in tickets]
    finally:
        db.close()


@router.get("/admin/tickets")
def admin_tickets(token: str, status: str | None = None):
    """Admin: list all tickets with optional status filter."""
    db = SessionLocal()
    try:
        payload = decode_access_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user or not user.is_admin:
            raise HTTPException(status_code=403, detail="Admin only")

        query = db.query(SupportTicket)
        if status:
            query = query.filter(SupportTicket.status == status)
        tickets = query.order_by(SupportTicket.created_at.desc()).all()

        stats = {
            "open": sum(1 for t in tickets if t.status == "open"),
            "in_progress": sum(1 for t in tickets if t.status == "in_progress"),
            "resolved": sum(1 for t in tickets if t.status == "resolved"),
            "total": len(tickets),
        }
        return {
            "stats": stats,
            "tickets": [{
                "ticket_id": t.ticket_id,
                "name": t.name,
                "email": t.email,
                "category": t.category,
                "subject": t.subject,
                "message": t.message,
                "status": t.status,
                "priority": t.priority,
                "admin_notes": t.admin_notes,
                "created_at": t.created_at.isoformat(),
                "user_id": t.user_id,
            } for t in tickets]
        }
    finally:
        db.close()


@router.patch("/admin/ticket/{ticket_id}")
def admin_update_ticket(ticket_id: str, req: UpdateTicketRequest):
    """Admin: update ticket status, priority, or add notes."""
    db = SessionLocal()
    try:
        payload = decode_access_token(req.token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user or not user.is_admin:
            raise HTTPException(status_code=403, detail="Admin only")

        ticket = db.query(SupportTicket).filter(SupportTicket.ticket_id == ticket_id.upper()).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        if req.status:
            ticket.status = req.status
            if req.status == "resolved":
                ticket.resolved_at = datetime.utcnow()
        if req.priority:
            ticket.priority = req.priority
        if req.admin_notes:
            ticket.admin_notes = req.admin_notes
        ticket.updated_at = datetime.utcnow()

        db.commit()

        # Send email to user if admin added notes
        if req.admin_notes and ticket.email:
            try:
                status_label = req.status or ticket.status
                send_email(
                    to_email=ticket.email,
                    subject=f"[{ticket.ticket_id}] Update on your MR Bus Portal Support Request",
                    body=f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:'Helvetica Neue',sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0e0618,#1a0a2e);padding:32px 40px;text-align:center;">
      <div style="font-size:36px;margin-bottom:10px;">💬</div>
      <h1 style="color:#fff;font-size:20px;margin:0 0 6px;font-weight:800;">Support Ticket Update</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">Ticket {ticket.ticket_id}</p>
    </div>
    <div style="padding:28px 40px;">
      <p style="font-size:14px;color:#4a3728;margin:0 0 16px;">Hi {ticket.name},</p>
      <p style="font-size:14px;color:#4a3728;margin:0 0 20px;">Our support team has responded to your ticket:</p>
      <div style="background:#eff6ff;border-left:3px solid #3b82f6;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:12px;color:#3b82f6;font-weight:700;margin-bottom:8px;">SUPPORT TEAM RESPONSE</div>
        <p style="font-size:14px;color:#1e3a5f;margin:0;line-height:1.7;">{req.admin_notes}</p>
      </div>
      <div style="background:#faf7f3;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:12px;color:#9c8b78;font-weight:600;">Ticket ID</span>
          <span style="font-size:13px;color:#1a1207;font-weight:700;font-family:monospace;">{ticket.ticket_id}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:12px;color:#9c8b78;font-weight:600;">Status</span>
          <span style="font-size:12px;font-weight:700;color:#f97316;text-transform:capitalize;">{status_label}</span>
        </div>
      </div>
      <p style="font-size:13px;color:#9c8b78;margin:0;">If you have further questions, reply to this email or submit a new ticket at <a href="https://mrbusportal.com/contact" style="color:#f97316;">mrbusportal.com/contact</a></p>
    </div>
    <div style="padding:16px 40px;background:#f7f3ee;border-top:1px solid #e8e2d9;text-align:center;">
      <p style="font-size:11px;color:#b0a090;margin:0;">MR Bus Portal by Rohith Kandula · noreplymrbuses@gmail.com</p>
    </div>
  </div>
</body>
</html>"""
                )
                print(f"[EMAIL SENT] Admin reply to {ticket.email} for {ticket.ticket_id}")
            except Exception as e:
                print(f"Admin reply email failed: {e}")

        return {"status": "updated", "ticket_id": ticket_id}
    finally:
        db.close()


class AdminReplyRequest(BaseModel):
    token: str
    reply: str
    status: str | None = None
    priority: str | None = None


@router.post("/admin/ticket/{ticket_id}/reply")
def admin_reply_to_user(ticket_id: str, req: AdminReplyRequest):
    """Admin replies to a ticket — updates admin_notes + emails the user."""
    db = SessionLocal()
    try:
        payload = decode_access_token(req.token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        admin = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not admin or not admin.is_admin:
            raise HTTPException(status_code=403, detail="Admin only")

        ticket = db.query(SupportTicket).filter(
            SupportTicket.ticket_id == ticket_id.upper()
        ).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        # Update ticket
        ticket.admin_notes = req.reply.strip()
        if req.status:
            ticket.status = req.status
            if req.status == "resolved":
                ticket.resolved_at = datetime.utcnow()
        if req.priority:
            ticket.priority = req.priority
        ticket.updated_at = datetime.utcnow()
        db.commit()

        # Email the user
        try:
            send_email(
                to_email=ticket.email,
                subject=f"[{ticket.ticket_id}] Support Team Response — MR Bus Portal",
                body=f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:'Helvetica Neue',sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0e0618,#1a0a2e);padding:32px 40px;text-align:center;">
      <div style="font-size:40px;margin-bottom:10px;">💬</div>
      <h1 style="color:#fff;font-size:20px;margin:0;font-weight:800;">Support Team Response</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:6px 0 0;">Regarding ticket {ticket.ticket_id}</p>
    </div>
    <div style="padding:28px 40px;">
      <p style="font-size:14px;color:#4a3728;margin:0 0 20px;">Hi {ticket.name},</p>
      <p style="font-size:14px;color:#4a3728;margin:0 0 16px;">Our support team has responded to your ticket:</p>
      <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
        <div style="font-size:11px;color:#3b82f6;font-weight:700;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;">🛟 Support Team Response</div>
        <p style="font-size:14px;color:#1e3a5f;margin:0;line-height:1.8;">{req.reply}</p>
      </div>
      <div style="background:#faf7f3;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:12px;color:#9c8b78;font-weight:600;">Ticket ID</span>
          <span style="font-size:13px;color:#f97316;font-weight:700;font-family:monospace;">{ticket.ticket_id}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:12px;color:#9c8b78;font-weight:600;">Subject</span>
          <span style="font-size:13px;color:#1a1207;font-weight:600;">{ticket.subject}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:12px;color:#9c8b78;font-weight:600;">Status</span>
          <span style="font-size:12px;font-weight:700;color:#16a34a;background:#f0fdf4;padding:3px 10px;border-radius:20px;border:1px solid #bbf7d0;">{ticket.status.replace("_"," ").title()}</span>
        </div>
      </div>
      <p style="font-size:13px;color:#9c8b78;">Need to add more details? Visit <a href="http://localhost:3000/contact" style="color:#f97316;text-decoration:none;">your support tickets</a> to reply.</p>
    </div>
    <div style="padding:16px 40px;background:#f7f3ee;border-top:1px solid #e8e2d9;text-align:center;">
      <p style="font-size:11px;color:#b0a090;margin:0;">MR Bus Portal Support · noreplymrbuses@gmail.com</p>
    </div>
  </div>
</body>
</html>""",
            )
            print(f"[EMAIL SENT] Admin reply → {ticket.email} for {ticket.ticket_id}")
        except Exception as e:
            print(f"Email failed (non-fatal): {e}")

        return {
            "status": "replied",
            "ticket_id": ticket_id,
            "message": f"Reply sent to {ticket.email}"
        }
    finally:
        db.close()


@router.post("/ticket/{ticket_id}/reply")
def user_reply_ticket(ticket_id: str, req: CreateTicketRequest):
    """User adds a follow-up reply to their ticket."""
    db = SessionLocal()
    try:
        ticket = db.query(SupportTicket).filter(
            SupportTicket.ticket_id == ticket_id.upper()
        ).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        ticket.message = (ticket.message or "") + f"\n\n---USER REPLY [{timestamp}]---\n{req.message.strip()}"
        if ticket.status in ["resolved", "closed"]:
            ticket.status = "open"
        ticket.updated_at = datetime.utcnow()
        db.commit()

        # Notify admin
        try:
            send_email(
                to_email="noreplymrbuses@gmail.com",
                subject=f"[{ticket.ticket_id}] User Follow-Up — {ticket.category.upper()}",
                body=f"""<html><body style="font-family:sans-serif;background:#f7f3ee;padding:20px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#1a0a2e;padding:24px;text-align:center;">
    <h2 style="color:#fff;margin:0;font-size:18px;">💬 User Replied to Ticket</h2>
  </div>
  <div style="padding:24px;">
    <p style="color:#9c8b78;font-size:13px;">Ticket: <strong style="color:#f97316;font-family:monospace;">{ticket.ticket_id}</strong></p>
    <p style="color:#9c8b78;font-size:13px;">From: <strong style="color:#1a1207;">{ticket.name}</strong> &lt;{ticket.email}&gt;</p>
    <div style="background:#fff7ed;border-left:3px solid #f97316;border-radius:8px;padding:14px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#4a3728;line-height:1.7;">{req.message}</p>
    </div>
    <a href="http://localhost:3000/admin" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">Open Admin Dashboard →</a>
  </div>
</div>
</body></html>""",
            )
        except Exception as e:
            print(f"Admin notify failed: {e}")

        return {"status": "replied", "message": "Reply sent!"}
    finally:
        db.close()

# ─── Admin: Issue Refund ───────────────────────────────────────────────────────

class RefundRequest(BaseModel):
    ticket_id: str
    email: str
    name: str = "Customer"

@router.post("/admin/refund")
def admin_issue_refund(req: RefundRequest, token: str = Query(...)):
    """Admin issues a refund — marks ticket resolved + emails user."""
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == payload.get("sub")).first()
        if not user or not getattr(user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Admin only")

        ticket = db.query(SupportTicket).filter(SupportTicket.ticket_id == req.ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        ticket.status = "resolved"
        ticket.admin_notes = (ticket.admin_notes or "") + "\n\n✅ Refund issued by support team."
        ticket.updated_at = datetime.utcnow()
        db.commit()

        try:
            send_email(
                to_email=req.email,
                subject=f"[{req.ticket_id}] Your Refund Has Been Processed",
                body=f"""Hi {req.name},

Your refund request (Ticket {req.ticket_id}) has been approved.

Your refund will appear on your original payment method within 5-10 business days.

Questions? Contact us at noreplymrbuses@gmail.com or visit mrbusportal.com/contact.

— MR Bus Portal Support Team
"""
            )
            print(f"[REFUND EMAIL SENT] → {req.email} for {req.ticket_id}")
        except Exception as e:
            print(f"Refund email failed: {e}")

        return {"status": "refund_issued", "ticket_id": req.ticket_id}
    finally:
        db.close()
