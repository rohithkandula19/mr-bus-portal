# backend/app/email_utils.py
# REPLACE your existing email_utils.py with this
# Adds HTML email support needed for subscription confirmations

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
FROM_NAME = "MR Bus Portal"
FROM_EMAIL = SMTP_USER


def send_email(to_email: str, subject: str, body: str):
    """
    Send an email. If body contains HTML tags it sends as HTML,
    otherwise sends as plain text with an HTML fallback wrapper.
    """
    if not SMTP_USER or not SMTP_PASS:
        print(f"[EMAIL SKIPPED — no SMTP config] To: {to_email} | Subject: {subject}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"]      = to_email

    is_html = body.strip().startswith("<!DOCTYPE") or body.strip().startswith("<html") or "<div" in body

    if is_html:
        # Attach both plain text fallback + HTML
        plain_text = f"MR Bus Portal\n\n{subject}\n\nPlease view this email in a client that supports HTML.\n\nsupport@mrbusportal.com"
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(body, "html"))
    else:
        # Plain text — wrap in minimal HTML too
        html_body = f"""<!DOCTYPE html>
<html><body style="font-family:Helvetica Neue,sans-serif;max-width:600px;margin:40px auto;color:#1a1207;line-height:1.7;">
  <div style="background:linear-gradient(135deg,#0e0618,#1a0a2e);padding:24px 32px;border-radius:12px 12px 0 0;">
    <span style="color:#fff;font-size:18px;font-weight:800;">MR <em style="color:#f97316;">Bus</em> Portal</span>
  </div>
  <div style="background:#fff;padding:28px 32px;border:1px solid #e8e2d9;border-top:none;">
    <pre style="font-family:Helvetica Neue,sans-serif;white-space:pre-wrap;margin:0;">{body}</pre>
  </div>
  <div style="background:#f7f3ee;padding:14px 32px;border-radius:0 0 12px 12px;border:1px solid #e8e2d9;border-top:none;text-align:center;">
    <span style="font-size:11px;color:#9c8b78;">© 2026 MR Bus Portal · support@mrbusportal.com</span>
  </div>
</body></html>"""
        msg.attach(MIMEText(body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        print(f"[EMAIL SENT] To: {to_email} | Subject: {subject}")
    except Exception as e:
        print(f"[EMAIL FAILED] {e}")
        raise


def send_booking_receipt_email(
    to_email: str, user_name: str, bus_name: str,
    origin: str, destination: str, departure: str, arrival: str,
    duration: str, seat_number: str, price: float, transaction_id: str
):
    html = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:'Helvetica Neue',sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0e0618,#1a0a2e);padding:32px 40px;text-align:center;">
      <div style="font-size:40px;margin-bottom:8px;">🚌</div>
      <h1 style="color:#fff;font-size:22px;margin:0 0 4px;font-weight:800;">Booking Confirmed!</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">Hi {user_name} — your seat is secured.</p>
    </div>
    <div style="padding:24px 40px;">
      <div style="background:#f7f3ee;border-radius:12px;padding:20px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <div>
            <div style="font-size:11px;color:#9c8b78;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">From</div>
            <div style="font-size:20px;font-weight:800;color:#1a1207;">{origin.split(',')[0]}</div>
          </div>
          <div style="font-size:24px;color:#f97316;align-self:center;">→</div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:#9c8b78;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">To</div>
            <div style="font-size:20px;font-weight:800;color:#1a1207;">{destination.split(',')[0]}</div>
          </div>
        </div>
        <div style="border-top:1px dashed #e8e2d9;padding-top:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div>
            <div style="font-size:10px;color:#9c8b78;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Departure</div>
            <div style="font-size:13px;font-weight:700;color:#f97316;">{departure}</div>
          </div>
          <div>
            <div style="font-size:10px;color:#9c8b78;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Seat</div>
            <div style="font-size:20px;font-weight:900;color:#1a1207;">{seat_number}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;color:#9c8b78;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Fare</div>
            <div style="font-size:20px;font-weight:900;color:#1a1207;">${price}</div>
          </div>
        </div>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div>
          <div style="font-size:10px;color:#16a34a;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Transaction ID</div>
          <div style="font-size:16px;font-weight:800;font-family:monospace;color:#1a1207;">{transaction_id}</div>
        </div>
        <div style="font-size:28px;">✅</div>
      </div>
      <p style="font-size:12px;color:#9c8b78;text-align:center;margin:0;">Bus: {bus_name} · Duration: {duration} · Arrives: {arrival}</p>
    </div>
    <div style="padding:16px 40px 24px;background:#faf7f3;border-top:1px solid #e8e2d9;">
      <p style="font-size:12px;color:#9c8b78;margin:0;text-align:center;">⚠️ Please arrive 15 minutes before departure · Non-transferable · Keep this email as your receipt</p>
    </div>
    <div style="padding:16px 40px;background:#f7f3ee;text-align:center;">
      <p style="font-size:10px;color:#b0a090;margin:0;">© 2026 MR Bus Portal · support@mrbusportal.com</p>
    </div>
  </div>
</body>
</html>"""
    send_email(to_email=to_email, subject=f"✅ Booking Confirmed #{transaction_id} — MR Bus Portal", body=html)


def send_otp_email(to_email: str, otp: str, name: str = "there"):
    html = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:Helvetica Neue,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0e0618,#1a0a2e);padding:32px 40px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">🔐</div>
      <h1 style="color:#fff;font-size:20px;margin:0;font-weight:800;">Verify Your Email</h1>
    </div>
    <div style="padding:32px 40px;text-align:center;">
      <p style="font-size:14px;color:#9c8b78;margin:0 0 24px;">Hi {name}, use this code to verify your MR Bus Portal account:</p>
      <div style="font-family:monospace;font-size:42px;font-weight:900;color:#f97316;letter-spacing:12px;background:#fff7ed;border:2px dashed #fed7aa;border-radius:12px;padding:20px;">{otp}</div>
      <p style="font-size:12px;color:#b0a090;margin:20px 0 0;">This code expires in 10 minutes. Do not share it with anyone.</p>
    </div>
    <div style="padding:16px 40px;background:#f7f3ee;text-align:center;">
      <p style="font-size:10px;color:#b0a090;margin:0;">© 2026 MR Bus Portal · support@mrbusportal.com</p>
    </div>
  </div>
</body>
</html>"""
    send_email(to_email=to_email, subject="Your MR Bus Portal verification code", body=html)


def send_reset_email(to_email: str, reset_token: str, name: str = "there"):
    reset_url = f"http://localhost:3000/reset-password?token={reset_token}"
    html = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:Helvetica Neue,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0e0618,#1a0a2e);padding:32px 40px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">🔑</div>
      <h1 style="color:#fff;font-size:20px;margin:0;font-weight:800;">Reset Your Password</h1>
    </div>
    <div style="padding:32px 40px;text-align:center;">
      <p style="font-size:14px;color:#9c8b78;margin:0 0 24px;">Hi {name}, click below to reset your password. This link expires in 1 hour.</p>
      <a href="{reset_url}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;">Reset Password →</a>
      <p style="font-size:11px;color:#b0a090;margin:20px 0 0;">If you did not request this, ignore this email. Your password will not change.</p>
    </div>
    <div style="padding:16px 40px;background:#f7f3ee;text-align:center;">
      <p style="font-size:10px;color:#b0a090;margin:0;">© 2026 MR Bus Portal · support@mrbusportal.com</p>
    </div>
  </div>
</body>
</html>"""
    send_email(to_email=to_email, subject="Reset your MR Bus Portal password", body=html)
