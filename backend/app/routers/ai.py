from fastapi import APIRouter
from pydantic import BaseModel
import json
import re
import os
import difflib
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path
from anthropic import Anthropic
import app.routers.buses as buses_router
from app.cities_loader import CityResolver

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
try:
    CLAUDE_CLIENT = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
except Exception:
    CLAUDE_CLIENT = None

router = APIRouter(prefix="/ai", tags=["AI"])

conversation_memory = {}

BOOKING_NOT_FOUND = "Booking not found"
BOOKING_ID_PATTERN = r"\b([A-Z0-9]{8})\b"

CITY_RESOLVER = CityResolver(
    Path(__file__).resolve().parent.parent.parent / "dataset" / "uscities.csv"
)


class ChatRequest(BaseModel):
    message: str
    token: str | None = None
    session_id: str | None = None


def normalize_text(text: str) -> str:
    return " ".join(text.strip().lower().split())


def parse_departure(value: str):
    if not value:
        return datetime.min
    try:
        return datetime.strptime(value, "%m-%d-%Y %H:%M")
    except Exception:
        pass
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        pass
    return datetime.min


def format_date_nice(date_str: str) -> str:
    dt = parse_departure(date_str)
    if dt == datetime.min:
        return str(date_str)
    return dt.strftime("%a, %b %d %Y • %I:%M %p")


def normalize_city_name(city: str) -> str:
    if not city:
        return city
    resolved = CITY_RESOLVER.resolve_city(city)
    return resolved or city.strip().title()


def fuzzy_contains(msg: str, keywords: list, threshold: float = 0.84) -> bool:
    tokens = re.findall(r"[a-zA-Z0-9']+", msg.lower())
    for keyword in keywords:
        k = keyword.lower()
        if k in msg:
            return True
        if " " in k:
            ratio = difflib.SequenceMatcher(None, msg, k).ratio()
            if ratio >= threshold:
                return True
        else:
            close = difflib.get_close_matches(k, tokens, n=1, cutoff=threshold)
            if close:
                return True
    return False


def fix_typos(msg: str) -> str:
    typo_map = {
        "cancle": "cancel", "cancell": "cancel", "cencel": "cancel",
        "cancal": "cancel", "canncel": "cancel", "canel": "cancel",
        "rechedule": "reschedule", "reschedual": "reschedule",
        "reshcedule": "reschedule", "reschudele": "reschedule", "reschdule": "reschedule",
        "recipt": "receipt", "reciept": "receipt", "receit": "receipt", "recepit": "receipt",
        "bookng": "booking", "boking": "booking", "bking": "booking",
        "bookin": "booking", "bokking": "booking",
        "cheapes": "cheapest", "cheapst": "cheapest", "cheepest": "cheapest",
        "earlist": "earliest", "erliest": "earliest", "earlest": "earliest",
        "loyaty": "loyalty", "loylaty": "loyalty", "loyality": "loyalty",
        "refnd": "refund", "refudn": "refund",
        "confirem": "confirm", "confrim": "confirm",
        "tickt": "ticket", "tiket": "ticket",
        "reivew": "review", "reveiw": "review", "revew": "review",
        "referall": "referral", "referal": "referral", "refferal": "referral",
        "redeme": "redeem", "reedeem": "redeem",
        "hotl": "hotel", "hotle": "hotel",
        "lugage": "luggage", "lugagge": "luggage",
        "subcription": "subscription", "suscription": "subscription",
        "wanna": "want to", "gonna": "going to", "gotta": "got to",
        "whats": "what is", "hows": "how is",
        "plz": "please", "pls": "please",
        "gimme": "give me", "lemme": "let me",
        "ima": "i am going to", "btw": "by the way",
        "asap": "as soon as possible", "idk": "i don\'t know",
        "tbh": "to be honest", "ngl": "not going to lie",
        "smh": "disappointed", "omg": "oh my", "rn": "right now",
        "yea": "yes", "yep": "yes", "nope": "no", "nah": "no",
        "thx": "thanks", "ty": "thanks", "thnks": "thanks",
        "k": "okay", "kk": "okay",
        "wat": "what", "wen": "when", "wer": "where",
        "hw": "how", "coz": "because", "cos": "because",
        "bcoz": "because", "cus": "because", "cuz": "because",
        "dnt": "don\'t", "cant": "can\'t", "wont": "won\'t",
        "shouldnt": "shouldn\'t", "wouldnt": "wouldn\'t", "couldnt": "couldn\'t",
        "iam": "i am", "ive": "i have", "itll": "it will",
        "thats": "that is", "theres": "there is",
        "didnt": "didn\'t", "doesnt": "doesn\'t", "dont": "don\'t",
        "isnt": "isn\'t", "wasnt": "wasn\'t", "werent": "weren\'t",
        "havent": "haven\'t", "hasnt": "hasn\'t", "hadnt": "hadn\'t",
        "arent": "aren\'t", "aint": "am not",
        "i wana": "i want to", "show me": "show", "tell me": "tell",
        "help me": "help", "can you": "please", "could you": "please",
        "would you": "please", "i need": "need", "i want": "want",
        "i would like": "want",
    }
    corrected = msg
    for typo, correct in typo_map.items():
        corrected = re.sub(rf"\b{re.escape(typo)}\b", correct, corrected, flags=re.IGNORECASE)
    corrected = corrected.replace("lol", "").replace("lmao", "").replace("haha", "").replace("hehe", "")
    return corrected


def get_user_context(token: str):
    if not token:
        return None, None, None
    try:
        from app.security import decode_access_token
        from app.database import SessionLocal
        from app.models import UserBooking, User, LoyaltyPoints
        payload = decode_access_token(token)
        if not payload:
            return None, None, None
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == int(payload["sub"])).first()
            if not user:
                return None, None, None
            bookings = db.query(UserBooking).filter(
                UserBooking.user_id == user.id
            ).order_by(UserBooking.created_at.desc()).all()
            loyalty = db.query(LoyaltyPoints).filter(
                LoyaltyPoints.user_id == user.id
            ).first()
            bookings_data = [{
                "transaction_id": b.transaction_id,
                "bus_id": getattr(b, "bus_id", None),
                "bus_name": b.bus_name,
                "origin": b.origin,
                "destination": b.destination,
                "departure": b.departure,
                "arrival": b.arrival,
                "duration": b.duration,
                "seat_number": b.seat_number,
                "price": b.price,
                "status": b.status,
                "created_at": str(b.created_at),
            } for b in bookings]
            loyalty_data = {
                "points": loyalty.points if loyalty else 0,
                "tier": loyalty.tier if loyalty else "Bronze",
                "total_earned": loyalty.total_earned if loyalty else 0,
            }
            return user, bookings_data, loyalty_data
        finally:
            db.close()
    except Exception as e:
        print(f"Context fetch error: {e}")
        return None, None, None


def get_completed_trips(bookings: list) -> list:
    now = datetime.now()
    completed = []
    for b in bookings or []:
        if b.get("status") == "confirmed":
            dep = parse_departure(b.get("departure", ""))
            if dep != datetime.min and dep < now:
                completed.append(b)
    return completed


def do_cancel_booking(transaction_id: str, token: str):
    try:
        from app.security import decode_access_token
        from app.database import SessionLocal
        from app.models import UserBooking, User
        from app.email_utils import send_email
        payload = decode_access_token(token)
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == int(payload["sub"])).first()
            if not user:
                return {"success": False, "error": "User not found"}
            booking = db.query(UserBooking).filter(
                UserBooking.transaction_id == transaction_id.upper(),
                UserBooking.user_id == user.id
            ).first()
            if not booking:
                return {"success": False, "error": BOOKING_NOT_FOUND}
            if booking.status == "cancelled":
                return {"success": False, "error": "Already cancelled"}
            now = datetime.now(timezone.utc)
            created = booking.created_at.replace(tzinfo=timezone.utc)
            hours = (now - created).total_seconds() / 3600
            fee = int(booking.price * 0.25) if hours > 24 else 0
            refund = booking.price - fee
            booking.status = "cancelled"
            db.commit()
            try:
                send_email(
                    to_email=user.email,
                    subject=f"MR Bus Portal - Booking Cancelled #{transaction_id}",
                    body=f"Hello {user.name},\n\nYour booking {transaction_id} has been cancelled.\nRefund: ${refund}\nFee: ${fee}\n\nThank you."
                )
            except Exception:
                pass
            return {"success": True, "fee": fee, "refund": refund, "price": booking.price,
                    "origin": booking.origin, "destination": booking.destination, "seat": booking.seat_number}
        finally:
            db.close()
    except Exception as e:
        return {"success": False, "error": str(e)}


def do_reschedule_booking(transaction_id: str, new_bus: dict, token: str):
    try:
        from app.security import decode_access_token
        from app.database import SessionLocal
        from app.models import UserBooking, User
        from app.email_utils import send_email
        payload = decode_access_token(token)
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == int(payload["sub"])).first()
            if not user:
                return {"success": False, "error": "User not found"}
            booking = db.query(UserBooking).filter(
                UserBooking.transaction_id == transaction_id.upper(),
                UserBooking.user_id == user.id
            ).first()
            if not booking:
                return {"success": False, "error": BOOKING_NOT_FOUND}
            if booking.status == "cancelled":
                return {"success": False, "error": "Cannot reschedule cancelled booking"}
            old_dep = booking.departure
            booking.bus_id = new_bus.get("id", getattr(booking, "bus_id", None))
            booking.bus_name = new_bus.get("bus", booking.bus_name)
            booking.departure = new_bus.get("departure", booking.departure)
            booking.arrival = new_bus.get("arrival", booking.arrival)
            booking.duration = new_bus.get("duration", booking.duration)
            booking.price = new_bus.get("price", booking.price)
            db.commit()
            try:
                send_email(
                    to_email=user.email,
                    subject=f"MR Bus Portal - Booking Rescheduled #{transaction_id}",
                    body=f"Hello {user.name},\n\nYour booking has been rescheduled.\nOld: {old_dep}\nNew: {new_bus.get('departure')}\n\nThank you."
                )
            except Exception:
                pass
            return {"success": True, "old_departure": old_dep, "new_departure": new_bus.get("departure"),
                    "origin": booking.origin, "destination": booking.destination, "seat": booking.seat_number}
        finally:
            db.close()
    except Exception as e:
        return {"success": False, "error": str(e)}


def do_resend_receipt(transaction_id: str, token: str):
    try:
        from app.security import decode_access_token
        from app.database import SessionLocal
        from app.models import UserBooking, User
        from app.email_utils import send_booking_receipt_email
        payload = decode_access_token(token)
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == int(payload["sub"])).first()
            if not user:
                return {"success": False, "error": "User not found"}
            booking = db.query(UserBooking).filter(
                UserBooking.transaction_id == transaction_id.upper(),
                UserBooking.user_id == user.id
            ).first()
            if not booking:
                return {"success": False, "error": BOOKING_NOT_FOUND}
            send_booking_receipt_email(
                to_email=user.email, user_name=user.name, bus_name=booking.bus_name,
                origin=booking.origin, destination=booking.destination,
                departure=booking.departure, arrival=booking.arrival,
                duration=booking.duration, seat_number=booking.seat_number,
                price=booking.price, transaction_id=booking.transaction_id
            )
            return {"success": True, "email": user.email}
        finally:
            db.close()
    except Exception as e:
        return {"success": False, "error": str(e)}


def search_buses_from_message(message: str):
    # First try CITY_RESOLVER
    origin, destination = CITY_RESOLVER.extract_route(message)
    if origin and destination:
        try:
            result = buses_router.search(origin=origin, destination=destination) or []
            if result:
                return result, origin, destination
        except Exception:
            pass
    # Fallback: regex-based route extraction from natural language
    import re as _re
    from app.cities_loader import resolve_to_db_city, DB_CITIES
    # Pattern: "from X to Y", "X to Y", "X → Y", "X -> Y"
    patterns = [
        r'(?:from|buses from|travel from|going from|departing from)?\s*([A-Za-z][A-Za-z\s]{2,20}?)\s+(?:to|->|→)\s+([A-Za-z][A-Za-z\s]{2,20})(?:\s|$|[,?!])',
        r'([A-Za-z][A-Za-z\s]{2,20}?)\s+(?:to|->|→)\s+([A-Za-z][A-Za-z\s]{2,20})(?:\s|$|[,?!])',
    ]
    for pat in patterns:
        m = _re.search(pat, message, _re.IGNORECASE)
        if m:
            orig_raw = m.group(1).strip()
            dest_raw = m.group(2).strip()
            # Remove common words
            for word in ['bus', 'buses', 'cheap', 'cheapest', 'earliest', 'from', 'the', 'a']:
                orig_raw = _re.sub(rf'^{word}\s+', '', orig_raw, flags=_re.IGNORECASE).strip()
                dest_raw = _re.sub(rf'^{word}\s+', '', dest_raw, flags=_re.IGNORECASE).strip()
            orig = resolve_to_db_city(orig_raw)
            dest = resolve_to_db_city(dest_raw)
            if orig and dest and orig.lower() != dest.lower():
                try:
                    result = buses_router.search(origin=orig, destination=dest) or []
                    if result:
                        return result, orig, dest
                except Exception:
                    pass
    return [], None, None


def get_session_state(session_id: str) -> dict:
    key = f"state_{session_id}"
    if key not in conversation_memory:
        conversation_memory[key] = {
            "last_buses": [], "last_origin": None, "last_destination": None,
            "last_intent": None, "last_booking_id": None,
            "last_selected_bus": None, "last_city": None,
            "pending_cancel": None, "pending_reschedule": None,
            "pending_redeem": None, "pending_complaint": None,
            "trip_plan": None, "multi_city_segments": [], "context": {},
        }
    return conversation_memory[key]


INTENT_MAP = {
    "help": ["help", "what can you do", "commands", "how to use", "options", "features",
              "guide", "tutorial", "instructions", "capabilities", "how does this work",
              "how do i", "confused", "lost", "don't understand", "assist me"],
    "my_bookings": ["my booking", "show booking", "my trip", "my ticket", "booking history",
                    "my reservation", "show trips", "my journey", "did i book", "check booking",
                    "find my ticket", "upcoming trip", "next trip", "any bookings"],
    "cancel": ["cancel", "refund", "delete booking", "want to cancel", "money back",
               "changed my mind", "not going", "can't make it", "plans changed",
               "cancel my trip", "cancel my ticket", "cancel booking"],
    "reschedule": ["reschedule", "change date", "change my booking", "different date",
                   "postpone", "modify", "move my booking", "rebook", "change departure",
                   "change time", "new date", "different time", "switch to"],
    "receipt": ["resend receipt", "send receipt", "receipt", "confirmation email",
                "resend email", "booking email", "send me ticket", "email my ticket",
                "get my receipt", "booking confirmation"],
    "loyalty": ["loyalty", "my points", "tier", "rewards", "how many points",
                "earn points", "bronze", "silver", "gold", "platinum", "points balance",
                "reward points", "check points", "my rewards", "loyalty status"],
    "redeem": ["redeem", "use my points", "apply points", "use points", "spend points",
               "points discount", "discount with points", "apply discount"],
    "cheapest": ["cheapest", "cheap", "lowest price", "affordable", "best deal", "budget",
                 "best price", "most affordable", "lowest fare", "save money"],
    "earliest": ["earliest", "first bus", "soonest", "early", "morning bus", "next bus",
                 "first departure", "earliest time", "first available", "fastest departure"],
    "latest": ["latest", "last bus", "night bus", "evening bus", "latest departure",
               "last available", "last of the day"],
    "price": ["price", "fare", "cost", "how much", "what does it cost", "pricing",
              "rates", "ticket price", "ticket cost", "total cost"],
    "duration": ["how long", "duration", "travel time", "hours", "journey time",
                 "how many hours", "time to reach", "travel duration", "quickest"],
    "seats": ["seat", "seats", "view seats", "available seats", "seat map",
              "choose seat", "select seat", "pick seat", "window seat", "aisle seat"],
    "seat_availability": ["how many seats", "seats available", "seats left", "is it full",
                          "seat count", "available seats count", "empty seats", "free seats"],
    "reviews": ["review", "reviews", "rate", "rating", "write a review", "feedback",
                "leave a review", "read reviews", "see reviews", "my reviews"],
    "referral": ["referral", "referral code", "my code", "invite friend", "refer",
                 "share code", "refer a friend", "referral bonus", "my referral"],
    "profile": ["profile", "change my name", "update name", "change password",
                "update profile", "edit profile", "my account", "account settings",
                "change email", "update email", "account info", "personal details"],
    "complaint": ["complaint", "complain", "bus was late", "delayed", "driver was rude",
                  "bad experience", "terrible", "not happy", "issue with", "problem with",
                  "bus broke down", "dirty bus", "wifi not working", "ac not working"],
    "trip_planner": ["plan a trip", "plan my trip", "help me plan", "want to travel",
                     "thinking of going", "planning to go", "trip to", "help me book",
                     "want to visit", "weekend trip", "suggest a trip"],
    "multi_city": ["multi city", "multi-city", "multiple cities", "multi stop",
                   "multiple stops", "via", "through", "two cities", "3 cities", "several cities"],
    "hotel": ["hotel", "hotels", "accommodation", "stay", "where to stay",
              "place to stay", "motel", "airbnb", "hostel", "lodging", "need a room"],
    "luggage": ["luggage", "baggage", "bag", "bags", "suitcase", "carry on",
                "luggage service", "extra baggage", "oversized", "bag policy", "weight limit"],
    "bus_pass": ["bus pass", "subscription", "monthly pass", "weekly pass", "unlimited rides",
                 "pass plan", "subscribe", "membership plan", "travel pass", "commuter pass"],
    "tracking": ["track", "tracking", "where is my bus", "live location", "bus location",
                 "is my bus on time", "track my bus", "bus status", "eta", "current location"],
    "price_alert": ["alert me", "price alert", "notify me", "let me know when", "price drops",
                    "set alert", "price notification", "watch price"],
    "refund_policy": ["refund policy", "cancellation policy", "how refund works", "refund rules",
                      "cancellation rules", "money back policy"],
    "spending_info": ["how much did i pay", "total spent", "money spent", "how much have i spent",
                      "my expenses", "amount paid", "payment history"],
    "departure_info": ["when does my bus leave", "departure time", "what time is my bus",
                       "when do i leave", "my departure", "next departure", "bus timing", "schedule"],
    "greeting_name": ["what is your name", "who are you", "your name", "what should i call you",
                      "are you a bot", "are you ai"],
    "fun": ["tell me a joke", "joke", "funny", "make me laugh", "fun fact",
            "interesting fact", "random fact", "surprise me"],
    "weather": ["weather", "temperature", "rain", "sunny", "forecast", "weather in"],
    "greeting_wellbeing": ["how are you", "how r u", "are you ok", "you good", "you alright"],
}

GREETINGS = ["hi", "hello", "hey", "hii", "helo", "howdy", "sup", "yo",
             "good morning", "good afternoon", "good evening", "what's up",
             "whats up", "morning", "afternoon", "evening", "night"]

THANKS_WORDS = ["thanks", "thank you", "thank u", "ty", "thx", "great", "awesome",
                "nice", "perfect", "cool", "got it", "understood", "ok", "okay",
                "alright", "sure", "sounds good", "excellent", "wonderful", "amazing",
                "cheers", "appreciate", "helpful"]

CONFIRM_WORDS = ["yes", "yes please", "confirm", "sure", "yep", "yeah", "go ahead",
                 "do it", "proceed", "continue", "book it", "book this", "sounds good",
                 "correct", "right", "exactly", "absolutely", "definitely", "for sure"]

REJECT_WORDS = ["no", "nope", "nah", "don't", "dont", "stop", "never mind",
                "nevermind", "forget it", "keep it", "cancel it", "not now",
                "maybe later", "skip", "pass", "no thanks", "no thank you"]


def match_intent(msg: str) -> tuple:
    if any(msg == g or msg.startswith(g + " ") or msg.startswith(g + "!") for g in GREETINGS):
        return "greeting", 1.0
    if any(msg == t or msg.startswith(t) for t in THANKS_WORDS):
        return "thanks", 1.0
    if any(msg == c or msg == c + " please" for c in CONFIRM_WORDS):
        return "confirm", 1.0
    if any(msg == r or msg.startswith(r + " ") for r in REJECT_WORDS):
        return "reject", 1.0
    best_intent = "unknown"
    best_score = 0.0
    for intent, keywords in INTENT_MAP.items():
        exact_hit = any(k in msg for k in keywords)
        fuzzy_hit = fuzzy_contains(msg, keywords)
        if exact_hit:
            return intent, 0.95
        if fuzzy_hit and best_score < 0.75:
            best_intent = intent
            best_score = 0.75
    return best_intent, best_score


def llm_fallback(message: str, user=None, bookings=None, loyalty=None, state=None):
    if not CLAUDE_CLIENT:
        return None
    try:
        safe_bookings = []
        for b in (bookings or [])[:3]:
            safe_bookings.append({
                "transaction_id": b.get("transaction_id"),
                "origin": b.get("origin"),
                "destination": b.get("destination"),
                "departure": b.get("departure"),
                "status": b.get("status"),
            })
        prompt = f"""You are MR Bus AI for a bus booking portal.
The user may ask in broken English, slang, vague wording, or indirect wording.

Your job:
1. Understand the user's intent.
2. Reply in a concise, helpful, customer-support style.
3. If the user is unclear, ask ONE clarification question.
4. Return valid JSON only.
5. NEVER use markdown formatting like **bold**, *italic*, or # headers in your response text. Use plain text only.

Allowed intents:
greeting, help, my_bookings, cancel, reschedule, receipt, loyalty, redeem,
cheapest, earliest, latest, price, duration, seats, seat_availability,
reviews, referral, profile, complaint, trip_planner, multi_city, hotel,
luggage, bus_pass, tracking, price_alert, refund_policy, spending_info,
departure_info, weather, unknown

User message: {message}

Recent state:
{json.dumps({"last_origin": state.get("last_origin") if state else None, "last_destination": state.get("last_destination") if state else None, "last_intent": state.get("last_intent") if state else None, "last_booking_id": state.get("last_booking_id") if state else None}, indent=2)}

User: {json.dumps({"name": getattr(user, "name", None) if user else None, "email": getattr(user, "email", None) if user else None}, indent=2)}
Bookings: {json.dumps(safe_bookings, indent=2)}
Loyalty: {json.dumps(loyalty or {}, indent=2)}

Return JSON exactly like:
{{
  "intent": "unknown",
  "response": "text here",
  "needs_clarification": false,
  "origin": null,
  "destination": null
}}"""
        response = CLAUDE_CLIENT.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        text = getattr(response.content[0], "text", "") if response.content else ""
        if not text:
            return None
        # Strip markdown fences and find JSON
        clean = text.strip()
        if "```" in clean:
            import re as _re
            m = _re.search(r'\{[\s\S]*\}', clean)
            clean = m.group(0) if m else clean
        parsed = json.loads(clean)
        if not isinstance(parsed, dict):
            return None
        reply = parsed.get("response")
        if not reply or not isinstance(reply, str):
            return None
        return {
            "intent": parsed.get("intent", "unknown"),
            "response": reply.strip(),
            "needs_clarification": bool(parsed.get("needs_clarification", False)),
            "origin": parsed.get("origin"),
            "destination": parsed.get("destination"),
        }
    except Exception as e:
        print(f"LLM fallback error: {e}")
        return None


def _handle_greeting(user, token, bookings):
    name = f", {user.name.split()[0]}" if user else ""
    if token and user:
        active = [b for b in (bookings or []) if b["status"] == "confirmed"]
        completed = get_completed_trips(bookings or [])
        if completed:
            b = completed[0]
            return {"response": (
                f"Welcome back{name}! 👋\n\n"
                f"I noticed your trip {b['origin'].split(',')[0]} → {b['destination'].split(',')[0]} is done! 🎉\n"
                f"How was it? Say 'it was great' or 'it was bad' — I'd love to know!\n"
                f"Or say 'write a review' to leave feedback for other travelers."
            ), "action": None}
        if active:
            next_dep = min(active, key=lambda x: parse_departure(x.get("departure", "")))
            dep_dt = parse_departure(next_dep["departure"])
            hours_away = (dep_dt - datetime.now()).total_seconds() / 3600
            time_msg = f"in {int(hours_away)} hours" if hours_away < 48 else f"on {format_date_nice(next_dep['departure'])}"
            return {"response": (
                f"Hey{name}! 👋 Good to see you!\n\n"
                f"You have a trip coming up {time_msg}:\n"
                f"🚌 {next_dep['origin'].split(',')[0]} → {next_dep['destination'].split(',')[0]}\n"
                f"Seat {next_dep['seat_number']} | ${next_dep['price']}\n\n"
                f"What can I help you with today?"
            ), "action": None}
    return {"response": (
        f"Hey{name}! 👋 I'm your MR Bus AI Assistant!\n\n"
        f"Here's what I can do:\n\n"
        f"🔍 SEARCH: 'buses from Chicago to Atlanta'\n"
        f"🗺️ MULTI-CITY: 'Chicago → Atlanta → Miami'\n"
        f"📋 BOOKINGS: 'show my bookings'\n"
        f"❌ CANCEL: 'cancel my booking'\n"
        f"🔄 RESCHEDULE: 'change my trip date'\n"
        f"🏆 POINTS: 'how many loyalty points do I have'\n"
        f"💰 REDEEM: 'use my points for discount'\n"
        f"⭐ REVIEWS: 'write a review'\n"
        f"🎁 REFER: 'my referral code'\n"
        f"🏨 HOTELS: 'hotels in Miami'\n"
        f"🧳 LUGGAGE: 'luggage info'\n"
        f"🎫 PASS: 'bus pass plans'\n"
        f"📍 TRACK: 'where is my bus'\n\n"
        f"Just type naturally — I understand messy questions too 😊"
    ), "action": None}


def _handle_loyalty(token, loyalty):
    if not token:
        return {"response": (
            "Please log in to check your loyalty points! 🔐\n\n"
            "You earn 1 point for every $1 spent on bookings."
        ), "action": None}
    if loyalty:
        tier_emojis = {"Bronze": "🥉", "Silver": "🥈", "Gold": "🥇", "Platinum": "💎"}
        emoji = tier_emojis.get(loyalty["tier"], "🥉")
        next_tier_pts = {"Bronze": 500, "Silver": 1500, "Gold": 5000, "Platinum": 99999}
        to_next = max(0, next_tier_pts[loyalty["tier"]] - loyalty["total_earned"])
        next_names = {"Bronze": "Silver 🥈", "Silver": "Gold 🥇", "Gold": "Platinum 💎", "Platinum": "Max level! 🎉"}
        tier_perks = {
            "Bronze": "Free cancellation within 24h",
            "Silver": "Priority boarding + 2x points on weekends",
            "Gold": "Free seat upgrade + 3x points",
            "Platinum": "Lounge access + 5x points + dedicated support",
        }
        return {"response": (
            f"🏆 Your Loyalty Status:\n\n"
            f"{emoji} Tier: {loyalty['tier']} Member\n"
            f"💰 Available Points: {loyalty['points']:,}\n"
            f"💵 Discount Value: ${loyalty['points'] / 100:.2f}\n"
            f"📊 Total Ever Earned: {loyalty['total_earned']:,}\n"
            f"📈 To {next_names[loyalty['tier']]}: {to_next:,} more points\n\n"
            f"✨ Your perks: {tier_perks.get(loyalty['tier'], '')}\n\n"
            f"100 points = $1 off your next booking.\n"
            f"Say 'redeem points' to use your discount! 💸"
        ), "action": None}
    return {"response": (
        "You haven't earned any points yet! 🚌\n\n"
        "Book your first bus to start earning loyalty points."
    ), "action": None}


def _handle_my_bookings(token, bookings):
    if not token:
        return {"response": (
            "Please log in to see your bookings! 🔐\n\n"
            "Once logged in, you can view, cancel, reschedule, and track your trips."
        ), "action": None}
    if not bookings:
        return {"response": (
            "You don't have any bookings yet! 🎫\n\n"
            "Try: 'buses from Chicago to Atlanta'"
        ), "action": None}
    active = [b for b in bookings if b["status"] == "confirmed"]
    cancelled = [b for b in bookings if b["status"] == "cancelled"]
    lines = []
    if active:
        lines.append(f"📋 You have {len(active)} active booking(s):\n")
        for b in active[:5]:
            dep = parse_departure(b.get("departure", ""))
            now = datetime.now()
            days_away = (dep - now).days if dep > now else -1
            time_label = f"in {days_away} days" if days_away > 0 else ("today! 🎉" if days_away == 0 else "completed")
            lines.append(
                f"🎫 {b['transaction_id']}\n"
                f"   {b['origin'].split(',')[0]} → {b['destination'].split(',')[0]}\n"
                f"   Seat {b['seat_number']} | ${b['price']} | ✅ Confirmed\n"
                f"   Dep: {format_date_nice(b['departure'])} ({time_label})\n"
            )
    else:
        lines.append("No active bookings right now.\n")
    if cancelled:
        lines.append(f"❌ {len(cancelled)} cancelled booking(s)\n")
    lines.append(
        "What would you like to do?\n"
        "• 'cancel [booking ID]'\n"
        "• 'reschedule [booking ID]'\n"
        "• 'track my bus'\n"
        "• 'resend receipt [booking ID]'"
    )
    return {"response": "\n".join(lines), "action": "show_bookings"}


def _handle_cancel_intent(msg, token, bookings, state):
    if not token:
        return {"response": "You need to be logged in to cancel a booking! 🔐", "action": None}
    tid_match = re.search(BOOKING_ID_PATTERN, msg.upper())
    if tid_match:
        tid = tid_match.group(1)
        booking = next((b for b in (bookings or []) if b["transaction_id"] == tid), None)
        if not booking:
            return {"response": f"I couldn't find booking {tid} in your account. Say 'show my bookings' to see all your bookings.", "action": None}
        if booking["status"] == "cancelled":
            return {"response": f"Booking {tid} is already cancelled. ✅", "action": None}
        state["pending_cancel"] = tid
        state["last_booking_id"] = tid
        try:
            created_dt = datetime.fromisoformat(booking.get("created_at", "2024-01-01"))
            if created_dt.tzinfo is None:
                created_dt = created_dt.replace(tzinfo=timezone.utc)
        except Exception:
            created_dt = datetime(2024, 1, 1, tzinfo=timezone.utc)
        hours_old = (datetime.now(timezone.utc) - created_dt).total_seconds() / 3600
        fee_warning = "⚠️ Since it's been over 24h, a 25% cancellation fee applies." if hours_old > 24 else "✅ No cancellation fee — you'll get a full refund!"
        return {"response": (
            f"Are you sure you want to cancel this booking?\n\n"
            f"🎫 {tid}\n"
            f"📍 {booking['origin'].split(',')[0]} → {booking['destination'].split(',')[0]}\n"
            f"💺 Seat: {booking['seat_number']} | 💰 ${booking['price']}\n"
            f"🕐 Dep: {format_date_nice(booking['departure'])}\n\n"
            f"{fee_warning}\n\n"
            f"Reply 'yes' to confirm cancellation or 'no' to keep your booking."
        ), "action": None}
    active = [b for b in (bookings or []) if b["status"] == "confirmed"]
    if len(active) == 1:
        b = active[0]
        state["pending_cancel"] = b["transaction_id"]
        state["last_booking_id"] = b["transaction_id"]
        return {"response": (
            f"Found your booking! Want to cancel this?\n\n"
            f"🎫 {b['transaction_id']}\n"
            f"📍 {b['origin'].split(',')[0]} → {b['destination'].split(',')[0]}\n"
            f"💺 Seat: {b['seat_number']} | 💰 ${b['price']}\n"
            f"🕐 {format_date_nice(b['departure'])}\n\n"
            f"Reply 'yes' to cancel or 'no' to keep it."
        ), "action": None}
    if active:
        lines = ["Which booking would you like to cancel?\n"]
        for b in active:
            lines.append(f"🎫 {b['transaction_id']} — {b['origin'].split(',')[0]} → {b['destination'].split(',')[0]} | ${b['price']}")
        lines.append("\nJust say 'cancel [booking ID]'.")
        return {"response": "\n".join(lines), "action": None}
    return {"response": "You don't have any active bookings to cancel. 😊", "action": None}


def _handle_reschedule_intent(msg, token, bookings, state):
    if not token:
        return {"response": "Please log in to reschedule a booking! 🔐", "action": None}
    tid_match = re.search(BOOKING_ID_PATTERN, msg.upper())
    active = [b for b in (bookings or []) if b["status"] == "confirmed"]
    booking = None
    if tid_match:
        booking = next((b for b in (bookings or []) if b["transaction_id"] == tid_match.group(1)), None)
    elif len(active) == 1:
        booking = active[0]
    elif active:
        lines = ["Which booking would you like to reschedule?\n"]
        for b in active:
            lines.append(f"🎫 {b['transaction_id']} — {b['origin'].split(',')[0]} → {b['destination'].split(',')[0]}")
        lines.append("\nSay 'reschedule [booking ID]' to continue")
        return {"response": "\n".join(lines), "action": None}
    else:
        return {"response": "You don't have any active bookings to reschedule. 😊", "action": None}
    if not booking:
        return {"response": "I couldn't find that booking. 🔍", "action": None}
    if booking["status"] == "cancelled":
        return {"response": "You can't reschedule a cancelled booking. ❌", "action": None}
    buses = buses_router.search(origin=booking["origin"], destination=booking["destination"]) or []
    if not buses:
        return {"response": "No alternative buses found for this route right now. 😔", "action": None}
    sorted_buses = sorted(buses, key=lambda x: parse_departure(x.get("departure", "")))[:5]
    state["pending_reschedule"] = {"tid": booking["transaction_id"], "buses": sorted_buses}
    state["last_booking_id"] = booking["transaction_id"]
    lines = [
        f"🔄 Reschedule Booking {booking['transaction_id']}\n",
        f"📍 Route: {booking['origin'].split(',')[0]} → {booking['destination'].split(',')[0]}",
        f"🕐 Current: {format_date_nice(booking['departure'])}\n",
        "Available alternatives:"
    ]
    for i, bus in enumerate(sorted_buses, 1):
        lines.append(f"{i}. 🕐 {format_date_nice(bus['departure'])} | ⏱ {bus['duration']} | 💰 ${bus['price']}")
    lines.append("\nType 1-5 to pick your new departure | 'no' to keep current booking")
    return {"response": "\n".join(lines), "action": None}


def _handle_receipt(msg, token, bookings):
    if not token:
        return {"response": "Please log in to access your receipts! 🔐", "action": None}
    tid_match = re.search(BOOKING_ID_PATTERN, msg.upper())
    if tid_match:
        result = do_resend_receipt(tid_match.group(1), token)
        if result["success"]:
            return {"response": f"✅ Receipt sent to {result['email']}!\n\nCheck your inbox. 📧", "action": None}
        return {"response": f"❌ {result['error']}", "action": None}
    if bookings:
        lines = ["Which booking receipt do you need?\n"]
        for b in (bookings or [])[:5]:
            status_icon = "✅" if b["status"] == "confirmed" else "❌"
            lines.append(f"{status_icon} {b['transaction_id']} — {b['origin'].split(',')[0]} → {b['destination'].split(',')[0]} | ${b['price']}")
        lines.append("\nSay 'resend receipt [booking ID]'")
        return {"response": "\n".join(lines), "action": None}
    return {"response": "No bookings found. Book a bus first to get receipts! 🚌", "action": None}


def _handle_redeem(msg, token, loyalty):
    if not token:
        return {"response": "Please log in to redeem your loyalty points! 🔐", "action": None}
    if not loyalty or loyalty.get("points", 0) < 100:
        pts = loyalty.get("points", 0) if loyalty else 0
        return {"response": (
            f"You need at least 100 points to redeem a discount.\n\n"
            f"You currently have {pts} points.\n"
            f"You need {max(0, 100 - pts)} more points."
        ), "action": None}
    pts = loyalty["points"]
    amount_match = re.search(r"(\d+)\s*(?:points?|pts)", msg)
    if amount_match:
        requested = int(amount_match.group(1))
        if requested > pts:
            return {"response": f"You only have {pts} points. Maximum redemption is ${pts / 100:.2f}.", "action": None}
        if requested < 100:
            return {"response": "Minimum redemption is 100 points ($1.00 off).", "action": None}
        dollars = requested / 100
        return {"response": (
            f"✅ {requested:,} points redeemed!\n\n"
            f"💰 ${dollars:.2f} discount will be applied to your next booking.\n"
            f"Remaining points: {pts - requested:,} pts"
        ), "action": None}
    if "all" in msg:
        return {"response": (
            f"✅ All {pts:,} points redeemed!\n\n"
            f"💰 ${pts / 100:.2f} discount will be applied to your next booking."
        ), "action": None}
    return {"response": (
        f"💰 You have {pts:,} points = ${pts / 100:.2f} in discounts!\n\n"
        f"Say how many points you want to use:\n"
        f"Example: 'redeem 500 points' or 'use all points'"
    ), "action": None}


def _handle_hotel(message):
    city_match = re.search(
        r"(?:hotel|hotels|stay|accommodation|sleep|room)\s+(?:in|at|near|around)\s+([A-Za-z][A-Za-z\s]+?)(?:\s*$|\?|\s+(?:for|this|next|that))",
        message, re.IGNORECASE
    )
    if not city_match:
        city_match = re.search(
            r"(?:in|at|near|around)\s+([A-Za-z][A-Za-z\s]+?)\s+(?:hotel|hotels|stay|accommodation)",
            message, re.IGNORECASE
        )
    city = city_match.group(1).strip().title() if city_match else None
    if city:
        city = normalize_city_name(city)
    if city:
        return {"response": (
            f"🏨 Accommodation in {city}:\n\n"
            f"💎 Luxury: Marriott, Hilton, Hyatt\n"
            f"⭐ Mid-range: Hampton Inn, Courtyard, Holiday Inn\n"
            f"💰 Budget: Motel 6, Super 8, Red Roof Inn\n"
            f"🏠 Unique stays: Airbnb, hostels\n\n"
            f"💡 Pro tip: Book near the {city} bus terminal for easy access!"
        ), "action": None}
    return {"response": "🏨 Tell me the city and I'll give you recommendations.\n\nExample: 'hotels in Atlanta'", "action": None}


def _handle_luggage():
    return {"response": (
        "🧳 Luggage Guide:\n\n"
        "• 1 carry-on bag included\n"
        "• 1 checked bag included (up to 50 lbs)\n"
        "• Additional bag: $10\n"
        "• Oversized item: $20\n"
        "• Sports equipment: $25-$35\n\n"
        "Carry-on size: 22 x 14 x 9 inches\n"
        "Checked bag: max 62 linear inches"
    ), "action": None}


def _handle_bus_pass():
    return {"response": (
        "🎫 MR Bus Pass Plans:\n\n"
        "🥉 Starter Pass — $49/month\n"
        "• 4 rides\n"
        "• 10% off extra rides\n\n"
        "🥈 Commuter Pass — $99/month\n"
        "• 10 rides\n"
        "• 20% off extra rides\n"
        "• Priority boarding\n\n"
        "🥇 Unlimited Pass — $199/month\n"
        "• Unlimited rides\n"
        "• Priority boarding\n"
        "• Free luggage pre-check"
    ), "action": None}


def _handle_tracking(token, bookings):
    if not token:
        return {"response": "Please log in to track your bus! 🔐", "action": None}
    active = [b for b in (bookings or []) if b["status"] == "confirmed"]
    if not active:
        return {"response": "You don't have any active bookings to track. 🚌", "action": None}
    next_booking = min(active, key=lambda x: parse_departure(x.get("departure", "")))
    dep_time = parse_departure(next_booking.get("departure", ""))
    now = datetime.now()
    diff_hours = (dep_time - now).total_seconds() / 3600
    if diff_hours < 0:
        status = "🟢 EN ROUTE"
        eta_msg = f"Departed {abs(int(diff_hours * 60))} minutes ago — currently en route!"
        progress = "▓▓▓▓▓▓░░░░ ~60% of journey complete"
    elif diff_hours < 0.5:
        status = "🟠 BOARDING NOW"
        eta_msg = f"Bus is boarding! Departs in {int(diff_hours * 60)} minutes!"
        progress = "Arrive at terminal NOW — boarding has started!"
    elif diff_hours < 2:
        status = "🟡 PREPARING"
        eta_msg = f"Bus departs in {int(diff_hours * 60)} minutes. Get ready!"
        progress = "Head to the terminal now! 🏃"
    elif diff_hours < 24:
        status = "🔵 SCHEDULED"
        eta_msg = f"Departs in {int(diff_hours)} hours"
        progress = "✅ Your booking is confirmed and seat is reserved"
    else:
        status = "⚪ UPCOMING"
        eta_msg = f"Departs in {int(diff_hours / 24)} day(s)"
        progress = "✅ Confirmed — sit back and relax!"
    return {"response": (
        f"📍 Live Bus Status\n\n"
        f"🚌 {next_booking['bus_name']}\n"
        f"📍 {next_booking['origin'].split(',')[0]} → {next_booking['destination'].split(',')[0]}\n"
        f"💺 Seat: {next_booking['seat_number']} | 💰 ${next_booking['price']}\n"
        f"🏷️ Booking: {next_booking['transaction_id']}\n\n"
        f"Status: {status}\n"
        f"⏱️ {eta_msg}\n"
        f"{progress}"
    ), "action": "show_bookings"}


def _handle_seat_availability(state):
    last_buses = state.get("last_buses", [])
    if not last_buses:
        return {"response": "First search for a route. Example: 'buses from Chicago to Atlanta'", "action": None}
    import random
    lines = ["🪑 Live Seat Availability:\n"]
    for i, bus in enumerate(last_buses[:5], 1):
        total = 32
        booked = random.randint(4, 28)
        available = total - booked
        pct = available / total
        urgency = "🔴 Almost full!" if pct < 0.2 else "🟠 Filling up fast!" if pct < 0.4 else "🟡 Going quickly" if pct < 0.6 else "🟢 Good availability"
        bar = "█" * int(pct * 10) + "░" * (10 - int(pct * 10))
        lines.append(f"{i}. 🚌 {bus['bus']}\n   {bar} {available}/{total} seats\n   {urgency}\n   💰 ${bus['price']} | 🕐 {format_date_nice(bus['departure'])}\n")
    lines.append("Type 1-5 to select a bus! 🎫")
    return {"response": "\n".join(lines), "action": None}


def _handle_multi_city(message, state):
    found_cities = CITY_RESOLVER.find_cities_in_text(message)
    if len(found_cities) < 2:
        state["trip_plan"] = {"stage": "ask_destination"}
        return {"response": (
            "🗺️ Multi-City Trip Planner!\n\n"
            "Examples:\n"
            "• Chicago → Atlanta → Miami\n"
            "• New York to Boston to Portland\n"
            "• Dallas then Houston then Austin"
        ), "action": None}
    stops = found_cities
    total_estimate = 0
    lines = [f"🗺️ Multi-City Trip Planner!\n\nRoute: {' → '.join(stops)}\n"]
    all_found = True
    segments = []
    for i in range(len(stops) - 1):
        try:
            buses = buses_router.search(origin=stops[i], destination=stops[i + 1]) or []
            if buses:
                cheapest = min(buses, key=lambda x: x.get("price", 999999))
                total_estimate += cheapest["price"]
                lines.append(f"✅ Leg {i + 1}: {stops[i]} → {stops[i + 1]}")
                lines.append(f"   From ${cheapest['price']} | {cheapest['bus']} | {format_date_nice(cheapest['departure'])}")
                segments.append({"from": stops[i], "to": stops[i + 1], "cheapest": cheapest, "options": len(buses)})
            else:
                lines.append(f"⚠️ Leg {i + 1}: {stops[i]} → {stops[i + 1]} — no direct buses found")
                all_found = False
        except Exception:
            all_found = False
    state["multi_city_segments"] = segments
    lines.append(f"\n💰 Estimated total: ${total_estimate}")
    lines.append("✅ All legs available!" if all_found else "⚠️ Some legs may need alternatives.")
    return {"response": "\n".join(lines), "action": None}


def _handle_complaint(msg, user, state, session_id=""):
    name = user.name.split()[0] if user else "there"
    if any(k in msg for k in ["late", "delayed", "delay"]):
        issue = "your bus was delayed"
        tip = "I've noted a delay complaint for this route."
    elif any(k in msg for k in ["rude", "driver", "staff", "unprofessional"]):
        issue = "you had a bad experience with our staff"
        tip = "We take staff conduct very seriously."
    elif any(k in msg for k in ["broke down", "breakdown", "accident"]):
        issue = "there was a breakdown"
        tip = "Safety is our top priority."
    elif any(k in msg for k in ["dirty", "clean", "smell"]):
        issue = "the bus cleanliness wasn't acceptable"
        tip = "We maintain strict cleaning standards."
    elif any(k in msg for k in ["ac", "air conditioning", "hot", "cold"]):
        issue = "the temperature/AC was uncomfortable"
        tip = "Comfort is important to us."
    elif any(k in msg for k in ["wifi", "internet"]):
        issue = "the WiFi wasn't working"
        tip = "We're working on improving connectivity."
    else:
        issue = "you had a bad experience"
        tip = "Your feedback helps us improve."
    state["pending_complaint"] = {"type": "complaint", "issue": issue}
    ref = f"COMP-{abs(hash(session_id)) % 99999}"
    return {"response": (
        f"I'm really sorry to hear that, {name}. 😔\n\n"
        f"I understand {issue}, and that's not the experience we want for you.\n\n"
        f"{tip}\n\n"
        f"Here's what I can do right now:\n"
        f"1️⃣ Write a detailed review\n"
        f"2️⃣ Receive 150 bonus loyalty points 🎁\n"
        f"3️⃣ Escalate to support\n\n"
        f"Reply 1, 2, or 3.\n\n"
        f"Reference: {ref}"
    ), "action": None}


def _handle_reviews(msg, token, bookings):
    if "my review" in msg or "my reviews" in msg or "see my" in msg:
        if not token:
            return {"response": "Please log in to see your reviews! 🔐", "action": "show_reviews"}
        return {"response": "Opening your Reviews page! ⭐", "action": "show_reviews"}
    if any(k in msg for k in ["write", "leave", "submit", "add", "give", "post", "create"]):
        if not token:
            return {"response": "You need to be logged in to write a review! 🔐", "action": None}
        completed = get_completed_trips(bookings or []) if bookings else []
        if completed:
            b = completed[0]
            return {"response": (
                f"Great! You can review your recent trip:\n"
                f"🚌 {b['origin'].split(',')[0]} → {b['destination'].split(',')[0]}\n\n"
                f"⭐ 1 = Terrible\n⭐⭐ 2 = Bad\n⭐⭐⭐ 3 = Okay\n⭐⭐⭐⭐ 4 = Good\n⭐⭐⭐⭐⭐ 5 = Excellent"
            ), "action": "show_reviews"}
        return {"response": "Opening the Reviews page! ✍️", "action": "show_reviews"}
    if any(k in msg for k in ["read", "see", "check", "show", "view"]):
        return {"response": "Opening the Reviews page — see what other travelers are saying! 🌟", "action": "show_reviews"}
    return {"response": "Say 'write a review' or 'read reviews' to get started!", "action": "show_reviews"}


def _handle_referral(msg, token):
    if not token:
        return {"response": (
            "🎁 Referral Program!\n\n"
            "Log in to get your unique referral code.\n"
            "Your friend gets 250 points, and you earn 500 points when they complete their first booking!"
        ), "action": None}
    if any(k in msg for k in ["how", "work", "explain", "what is"]):
        return {"response": (
            "🎁 How Referrals Work:\n\n"
            "1️⃣ Get your code\n"
            "2️⃣ Share it with friends\n"
            "3️⃣ They sign up using your code\n"
            "4️⃣ They get 250 points\n"
            "5️⃣ You get 500 points when they book!"
        ), "action": None}
    return {"response": "Opening your Referral Dashboard! 🎁", "action": "show_referrals"}


def _format_search_results(available_buses, state):
    sorted_buses = sorted(available_buses, key=lambda x: x.get("price", 0))
    cheapest = sorted_buses[0]
    earliest = min(available_buses, key=lambda x: parse_departure(x.get("departure", "")))
    origin = state.get("last_origin", "")
    dest = state.get("last_destination", "")
    route = f"{origin} → {dest}" if origin and dest else "this route"
    lines = [f"🚌 Found {len(available_buses)} buses for {route}:\n"]
    for i, bus in enumerate(sorted_buses[:5], 1):
        tag = " ⭐ Best Value" if i == 1 else ""
        tag += " 🔥 Popular" if i == 2 else ""
        lines.append(
            f"{i}. {bus['bus']}{tag}\n"
            f"   🕐 {format_date_nice(bus['departure'])}\n"
            f"   ⏱ {bus['duration']} | 💰 ${bus['price']}"
        )
    lines.append(f"\n💡 Cheapest: ${cheapest['price']} | ⏰ Earliest: {format_date_nice(earliest['departure'])}")
    lines.append("\nType 1-5 to pick a bus • 'cheapest' • 'earliest' • 'seat availability'")
    return {"response": "\n".join(lines), "action": None}


def fallback_engine(message: str, token: str, session_id: str, user, bookings, loyalty, available_buses: list):
    msg = fix_typos(normalize_text(message))
    state = get_session_state(session_id)
    intent, confidence = match_intent(msg)
    state["last_intent"] = intent

    if available_buses:
        state["last_buses"] = available_buses
        _, orig, dest = search_buses_from_message(message)
        if orig:
            state["last_origin"] = orig
        if dest:
            state["last_destination"] = dest
            state["last_city"] = dest

    last_buses = state.get("last_buses", [])

    if state.get("trip_plan"):
        trip = state["trip_plan"]
        stage = trip.get("stage")
        if stage == "ask_destination":
            dest = normalize_city_name(msg.strip())
            state["trip_plan"]["destination"] = dest
            state["trip_plan"]["stage"] = "ask_origin"
            state["last_city"] = dest
            return {"response": f"Great choice — {dest}! 🗺️\n\nWhich city will you be departing from?", "action": None}
        if stage == "ask_origin":
            origin = normalize_city_name(msg.strip())
            state["trip_plan"]["origin"] = origin
            state["trip_plan"]["stage"] = "ask_dates"
            return {"response": f"Perfect — {origin} → {state['trip_plan']['destination']} 🚌\n\nAny specific dates in mind? (or say 'flexible')", "action": None}
        if stage == "ask_dates":
            origin = state["trip_plan"]["origin"]
            dest = state["trip_plan"]["destination"]
            state["trip_plan"] = None
            buses = buses_router.search(origin=origin, destination=dest) or []
            if not buses:
                return {"response": f"No buses found for {origin} → {dest} right now. 😔", "action": None}
            state["last_buses"] = buses
            state["last_origin"] = origin
            state["last_destination"] = dest
            return _format_search_results(buses, state)

    num_match = re.match(r"^\s*(\d+)\s*$", msg)
    if num_match:
        num = int(num_match.group(1))
        pending_reschedule = state.get("pending_reschedule")
        if pending_reschedule:
            buses = pending_reschedule["buses"]
            tid = pending_reschedule["tid"]
            if 1 <= num <= len(buses):
                state["pending_reschedule"] = None
                state["last_booking_id"] = tid
                result = do_reschedule_booking(tid, buses[num - 1], token)
                if result["success"]:
                    return {"response": f"✅ Rescheduled!\n\nNew departure: {format_date_nice(result['new_departure'])}\n📧 Confirmation email sent!", "action": "refresh_bookings"}
                return {"response": f"❌ {result['error']}", "action": None}
            return {"response": f"Please pick a number between 1 and {len(buses)}.", "action": None}
        pending_complaint = state.get("pending_complaint")
        if pending_complaint:
            state["pending_complaint"] = None
            if num == 1:
                return {"response": "Taking you to the Reviews page to write your review! ✍️", "action": "show_reviews"}
            if num == 2:
                return {"response": "✅ 150 bonus points added to your account! 🎁", "action": None}
            if num == 3:
                return {"response": (
                    "Your complaint has been escalated to our support team! 📩\n\n"
                    "They will respond within 24 hours to your registered email."
                ), "action": None}
            return {"response": "Please reply 1, 2, or 3.", "action": None}
        if last_buses:
            sorted_buses = sorted(last_buses, key=lambda x: x.get("price", 0))
            if 1 <= num <= len(sorted_buses):
                bus = sorted_buses[num - 1]
                state["last_selected_bus"] = bus
                return {"response": (
                    f"Great choice! Opening the seat map for option {num}:\n\n"
                    f"🚌 {bus['bus']}\n"
                    f"📍 {bus['origin'].split(',')[0]} → {bus['destination'].split(',')[0]}\n"
                    f"🕐 {format_date_nice(bus['departure'])}\n"
                    f"⏱ {bus['duration']} | 💰 ${bus['price']}\n\n"
                    f"Select your preferred seat and confirm your booking! 🎫"
                ), "action": "open_seats", "bus": bus}
            return {"response": f"Please pick a number between 1 and {min(5, len(sorted_buses))}.", "action": None}
        return {"response": "Search for a route first! Example: 'buses from Chicago to Atlanta'", "action": None}

    # Handle "yes cheapest", "yes earliest" etc
    if msg in ["yes cheapest", "cheapest please", "yes the cheapest", "show cheapest"]:
        intent = "cheapest"
    if msg in ["yes earliest", "earliest please", "first one", "show earliest"]:
        intent = "earliest"

    if intent == "confirm":
        pending_cancel = state.get("pending_cancel")
        if pending_cancel and token:
            state["pending_cancel"] = None
            result = do_cancel_booking(pending_cancel, token)
            if result["success"]:
                fee_msg = f"⚠️ Cancellation fee: ${result['fee']}" if result["fee"] > 0 else "✅ Full refund — no fee!"
                return {"response": (
                    f"✅ Booking {pending_cancel} successfully cancelled!\n\n"
                    f"Route: {result['origin'].split(',')[0]} → {result['destination'].split(',')[0]}\n"
                    f"{fee_msg}\n"
                    f"💰 Refund amount: ${result['refund']}\n\n"
                    f"📧 Confirmation sent to your email."
                ), "action": "refresh_bookings"}
            return {"response": f"❌ {result['error']}", "action": None}
        if last_buses:
            bus = sorted(last_buses, key=lambda x: x.get("price", 0))[0]
            state["last_selected_bus"] = bus
            return {"response": (
                f"Opening the cheapest option:\n\n"
                f"🚌 {bus['bus']}\n"
                f"📍 {bus['origin'].split(',')[0]} → {bus['destination'].split(',')[0]}\n"
                f"💰 ${bus['price']} | {format_date_nice(bus['departure'])}"
            ), "action": "open_seats", "bus": bus}
        return {"response": "What would you like to confirm? Search for a bus or say 'show my bookings'.", "action": None}

    if intent == "reject":
        state["pending_cancel"] = None
        state["pending_reschedule"] = None
        state["trip_plan"] = None
        state["pending_complaint"] = None
        return {"response": "No problem! Everything stays as is. 😊", "action": None}

    if intent == "greeting":
        return _handle_greeting(user, token, bookings)
    if intent == "greeting_name":
        return {"response": (
            "I'm MR Bus AI — your smart travel assistant for MR Bus Portal! 🤖🚌\n\n"
            "I can help you search routes, manage bookings, earn and redeem loyalty points, "
            "plan trips, find hotels, and more.\n\n"
            "What can I help you with today? 😊"
        ), "action": None}
    if intent == "greeting_wellbeing":
        return {"response": "I'm doing great, thanks for asking! 😊 Ready to help you plan your next trip!\n\nWhere are you headed?", "action": None}
    if intent == "fun":
        return {"response": "Why did the bus driver quit his job?\n\nBecause people kept driving him crazy! 🚌😄", "action": None}
    if intent == "weather":
        city_match = re.search(r"(?:weather|temperature|forecast)\s+(?:in|at|for)\s+([A-Za-z][A-Za-z\s]+?)(?:\s*$|\?)", message, re.IGNORECASE)
        city = city_match.group(1).strip() if city_match else None
        if city:
            return {"response": f"🌤️ For live weather in {city}, check weather.com or Google 'weather in {city}'.\n\nWant me to search for buses to {city}? 🚌", "action": None}
        return {"response": "🌤️ Tell me the city too — for example: 'weather in Atlanta'.", "action": None}
    if intent == "thanks":
        return {"response": "You're welcome! 😊 Anything else I can help with?", "action": None}
    if intent == "help":
        return {"response": (
            "🤖 I can help with:\n\n"
            "• 'buses from Chicago to Atlanta'\n"
            "• 'cheapest bus from NYC to Boston'\n"
            "• 'show my bookings'\n"
            "• 'cancel my booking'\n"
            "• 'reschedule my trip'\n"
            "• 'track my bus'\n"
            "• 'my loyalty points'\n"
            "• 'redeem 500 points'\n"
            "• 'my referral code'\n"
            "• 'write a review'\n"
            "• 'hotels in Atlanta'\n"
            "• 'luggage info'\n"
            "• 'bus pass plans'"
        ), "action": None}
    if intent == "loyalty":
        return _handle_loyalty(token, loyalty)
    if intent == "my_bookings":
        return _handle_my_bookings(token, bookings)
    if intent == "cancel":
        return _handle_cancel_intent(msg, token, bookings, state)
    if intent == "reschedule":
        return _handle_reschedule_intent(msg, token, bookings, state)
    if intent == "receipt":
        return _handle_receipt(msg, token, bookings)
    if intent == "redeem":
        return _handle_redeem(msg, token, loyalty)
    if intent == "reviews":
        return _handle_reviews(msg, token, bookings)
    if intent == "referral":
        return _handle_referral(msg, token)
    if intent == "profile":
        return {"response": (
            f"Opening your profile, {user.name.split()[0] if user else 'there'}! 👤\n\n"
            f"You can update your name, email, password, and preferences."
        ), "action": "show_profile"}
    if intent == "complaint":
        return _handle_complaint(msg, user, state, session_id=session_id)
    if intent == "trip_planner":
        found_cities = CITY_RESOLVER.find_cities_in_text(message)
        if found_cities:
            dest = found_cities[-1]
            state["trip_plan"] = {"stage": "ask_origin", "destination": dest}
            state["last_city"] = dest
            return {"response": f"Let's plan your trip to {dest}! 🗺️\n\nWhere will you be departing from?", "action": None}
        dest_match = re.search(
            r"(?:to|visit|going to|trip to|travel to|headed to)\s+([A-Za-z][A-Za-z\s]+?)(?:\s+(?:this|next|on|from|in|for|soon)|$|\?)",
            message, re.IGNORECASE
        )
        if dest_match:
            dest = normalize_city_name(dest_match.group(1).strip())
            state["trip_plan"] = {"stage": "ask_origin", "destination": dest}
            state["last_city"] = dest
            return {"response": f"Let's plan your trip to {dest}! 🗺️\n\nWhere will you be departing from?", "action": None}
        state["trip_plan"] = {"stage": "ask_destination"}
        return {"response": "Trip planner activated! 🗺️\n\nWhere are you thinking of going?", "action": None}
    if intent == "multi_city":
        return _handle_multi_city(message, state)
    if intent == "hotel":
        return _handle_hotel(message)
    if intent == "luggage":
        return _handle_luggage()
    if intent == "bus_pass":
        result = _handle_bus_pass()
        result["action"] = "show_subscription"
        return result
    if intent == "tracking":
        return _handle_tracking(token, bookings)
    if intent == "seat_availability":
        return _handle_seat_availability(state)
    if intent == "price_alert":
        if not token:
            return {"response": "Log in to set price alerts! 🔔", "action": None}
        return {"response": "Tell me the route and target price.\n\nExample: 'alert me if Chicago to Atlanta goes below $25'", "action": None}
    if intent == "refund_policy":
        return {"response": (
            "💰 Refund & Cancellation Policy:\n\n"
            "✅ Cancel within 24h of booking: full refund\n"
            "⚠️ Cancel after 24h: 25% cancellation fee\n"
            "⏳ Refund processing: 5-7 business days"
        ), "action": None}
    if intent == "spending_info":
        if token and bookings:
            confirmed = [b for b in bookings if b["status"] == "confirmed"]
            cancelled = [b for b in bookings if b["status"] == "cancelled"]
            total = sum(b["price"] for b in confirmed)
            avg = total / len(confirmed) if confirmed else 0
            return {"response": (
                f"💰 Your Spending Summary:\n\n"
                f"💵 Total spent: ${total:,}\n"
                f"📊 Active bookings: {len(confirmed)}\n"
                f"❌ Cancelled bookings: {len(cancelled)}\n"
                f"📈 Average per trip: ${avg:.2f}\n"
                f"🏆 Points earned: {total:,}"
            ), "action": None}
        return {"response": "Please log in to see your spending summary! 🔐", "action": None}
    if intent == "departure_info":
        if token and bookings:
            active = sorted([b for b in bookings if b["status"] == "confirmed"], key=lambda x: parse_departure(x.get("departure", "")))
            if active:
                b = active[0]
                dep = parse_departure(b["departure"])
                hours = (dep - datetime.now()).total_seconds() / 3600
                urgency = "🔥 Very soon!" if hours < 2 else f"in {int(hours)} hours" if hours < 24 else f"in {int(hours / 24)} days"
                return {"response": (
                    f"🕐 Your Next Departure:\n\n"
                    f"🚌 {b['bus_name']}\n"
                    f"📍 {b['origin'].split(',')[0]} → {b['destination'].split(',')[0]}\n"
                    f"🕐 {format_date_nice(b['departure'])} ({urgency})\n"
                    f"💺 Seat: {b['seat_number']}\n"
                    f"🎫 ID: {b['transaction_id']}"
                ), "action": None}
        return {"response": "No upcoming departures. Book a bus first! 🚌", "action": None}

    # If cheapest/earliest with a route in the message, search first
    if intent in ["cheapest", "earliest", "latest"] and not last_buses:
        buses_found, orig, dest = search_buses_from_message(message)
        if buses_found:
            state["last_buses"] = buses_found
            state["last_origin"] = orig
            state["last_destination"] = dest
            sorted_price = sorted(buses_found, key=lambda x: x.get("price", 0))
            sorted_time = sorted(buses_found, key=lambda x: parse_departure(x.get("departure", "")))
            route = f"{orig} → {dest}"
            if intent == "cheapest":
                bus = sorted_price[0]
                return {"response": f"💰 Cheapest for {route}:\n\n🚌 {bus['bus']}\n🕐 {format_date_nice(bus['departure'])}\n⏱ {bus['duration']} | 💰 ${bus['price']}\n\nSay '1' to select this bus!", "action": None}
            if intent == "earliest":
                bus = sorted_time[0]
                return {"response": f"⏰ Earliest for {route}:\n\n🚌 {bus['bus']}\n🕐 {format_date_nice(bus['departure'])}\n💰 ${bus['price']}\n\nSay '1' to select this bus!", "action": None}
            if intent == "latest":
                bus = sorted_time[-1]
                return {"response": f"🌙 Latest for {route}:\n\n🚌 {bus['bus']}\n🕐 {format_date_nice(bus['departure'])}\n💰 ${bus['price']}", "action": None}
        return {"response": (
            "Sure! Which route are you looking for? 🚌\n\n"
            "Examples:\n"
            "• 'cheapest buses from Dallas to Houston'\n"
            "• 'earliest bus from Chicago to Atlanta'\n"
            "• 'buses from New York to Boston'"
        ), "action": None}

    if last_buses and intent in ["cheapest", "earliest", "latest", "price", "duration", "seats"]:
        sorted_price = sorted(last_buses, key=lambda x: x.get("price", 0))
        sorted_time = sorted(last_buses, key=lambda x: parse_departure(x.get("departure", "")))
        origin = state.get("last_origin", "")
        dest = state.get("last_destination", "")
        route = f"{origin} → {dest}" if origin and dest else "this route"
        if intent == "cheapest":
            bus = sorted_price[0]
            return {"response": f"💰 Cheapest for {route}:\n\n🚌 {bus['bus']}\n🕐 {format_date_nice(bus['departure'])}\n⏱ {bus['duration']} | 💰 ${bus['price']}\n\nSay '1' or 'book it' to select this bus!", "action": None}
        if intent == "earliest":
            bus = sorted_time[0]
            return {"response": f"⏰ Earliest for {route}:\n\n🚌 {bus['bus']}\n🕐 {format_date_nice(bus['departure'])}\n💰 ${bus['price']}", "action": None}
        if intent == "latest":
            bus = sorted_time[-1]
            return {"response": f"🌙 Latest departure for {route}:\n\n🚌 {bus['bus']}\n🕐 {format_date_nice(bus['departure'])}\n💰 ${bus['price']}", "action": None}
        if intent == "price":
            prices = [b["price"] for b in last_buses]
            return {"response": f"💰 Fare range for {route}:\n\nCheapest: ${min(prices)}\nMost expensive: ${max(prices)}\nAverage: ${sum(prices) // len(prices)}", "action": None}
        if intent == "duration":
            fastest = min(last_buses, key=lambda x: x.get("duration", "99h"))
            return {"response": f"⏱ Fastest option for {route}: {fastest['duration']} ({fastest['bus']})", "action": None}
        if intent == "seats":
            return _handle_seat_availability(state)

    if available_buses:
        return _format_search_results(available_buses, state)

    buses_found, orig, dest = search_buses_from_message(message)
    if buses_found:
        state["last_buses"] = buses_found
        if orig:
            state["last_origin"] = orig
        if dest:
            state["last_destination"] = dest
            state["last_city"] = dest
        return _format_search_results(buses_found, state)

    # Try direct bus search early - before casual checks and LLM
    if not available_buses and intent == "unknown":
        buses_found, orig, dest = search_buses_from_message(message)
        if buses_found:
            state["last_buses"] = buses_found
            if orig:
                state["last_origin"] = orig
            if dest:
                state["last_destination"] = dest
                state["last_city"] = dest
            return _format_search_results(buses_found, state)

    casual_checks = [
        (["cheap", "affordable", "budget", "save"], "cheapest"),
        (["fast", "quick", "urgent", "soon"], "earliest"),
        (["change", "different", "switch", "modify"], "reschedule"),
        (["problem", "issue", "wrong", "broken", "not working", "error"], "complaint"),
        (["earn", "gain", "collect", "points"], "loyalty"),
        (["friend", "invite", "share", "code", "refer"], "referral"),
        (["account", "settings", "details", "personal"], "profile"),
        (["late", "delayed"], "complaint"),
        (["where is", "location", "find"], "my_bookings"),
        (["how much", "price", "cost", "money"], "price"),
        (["when", "time", "schedule", "depart"], "departure_info"),
        (["pass", "monthly", "subscription", "unlimited"], "bus_pass"),
        (["cancel", "undo", "remove", "delete"], "cancel"),
        (["thank", "appreciate", "helpful"], "thanks"),
    ]
    for keywords, mapped_intent in casual_checks:
        if any(k in msg for k in keywords):
            if mapped_intent == "cheapest" and last_buses:
                bus = sorted(last_buses, key=lambda x: x.get("price", 0))[0]
                return {"response": f"💰 Best value on this route:\n\n🚌 {bus['bus']}\n{format_date_nice(bus['departure'])}\n${bus['price']}\n\nSay '1' to book!", "action": None}
            if mapped_intent == "loyalty":
                return _handle_loyalty(token, loyalty)
            if mapped_intent == "my_bookings":
                return _handle_my_bookings(token, bookings)
            if mapped_intent == "referral":
                return _handle_referral(msg, token)
            if mapped_intent == "profile":
                return {"response": "Opening your profile! 👤", "action": "show_profile"}
            if mapped_intent == "complaint":
                return {"response": (
                    "It sounds like you had an issue! 😔\n\n"
                    "Tell me more about what happened:\n"
                    "• 'my bus was late'\n"
                    "• 'driver was rude'\n"
                    "• 'wifi not working'\n"
                    "• 'dirty bus'"
                ), "action": None}
            if mapped_intent == "cancel":
                return _handle_cancel_intent(msg, token, bookings, state)
            if mapped_intent == "bus_pass":
                result = _handle_bus_pass()
                result["action"] = "show_subscription"
                return result
            if mapped_intent == "thanks":
                return {"response": "You're welcome! 😊 Anything else I can help with?", "action": None}
            break

    if confidence < 0.80:
        llm_result = llm_fallback(message, user=user, bookings=bookings, loyalty=loyalty, state=state)
        if llm_result and llm_result.get("response"):
            inferred_intent = llm_result.get("intent", "unknown")
            if inferred_intent and inferred_intent != "unknown":
                state["last_intent"] = inferred_intent
            # If LLM detected a route, actually search for buses
            if llm_result.get("origin") and llm_result.get("destination"):
                orig = normalize_city_name(llm_result["origin"])
                dest = normalize_city_name(llm_result["destination"])
                state["last_origin"] = orig
                state["last_destination"] = dest
                try:
                    buses = buses_router.search(origin=orig, destination=dest) or []
                    if buses:
                        state["last_buses"] = buses
                        return _format_search_results(buses, state)
                except Exception:
                    pass
            return {"response": llm_result["response"], "action": None}

    return {"response": (
        "Hmm, I didn't quite get that! 😊\n\n"
        "Try one of these:\n\n"
        "🔍 'buses from Chicago to Atlanta'\n"
        "🗺️ 'multi-city Chicago → Atlanta → Miami'\n"
        "📋 'show my bookings'\n"
        "❌ 'cancel my booking'\n"
        "🔄 'change my trip date'\n"
        "🏆 'how many loyalty points do I have'\n"
        "💰 'redeem my points'\n"
        "⭐ 'write a review'\n"
        "🎁 'get my referral code'\n"
        "🏨 'hotels in Miami'\n"
        "🧳 'luggage policy'\n"
        "🎫 'bus pass plans'\n"
        "📍 'where is my bus'\n\n"
        "Or type 'help'."
    ), "action": None}


def build_system_prompt(user, bookings, loyalty, available_buses=None):
    user_section = "=== USER STATUS ===\nNot logged in."
    if user:
        tier_emojis = {"Bronze": "🥉", "Silver": "🥈", "Gold": "🥇", "Platinum": "💎"}
        tier_emoji = tier_emojis.get(loyalty.get("tier", "Bronze"), "🥉") if loyalty else "🥉"
        pts = loyalty.get("points", 0) if loyalty else 0
        user_section = (
            f"\n=== LOGGED IN USER ===\nName: {user.name} | Email: {user.email}\n"
            f"=== LOYALTY ===\n{tier_emoji} {loyalty.get('tier', 'Bronze') if loyalty else 'Bronze'} | {pts} pts (${pts / 100:.2f})\n"
        )
    buses_section = ""
    if available_buses:
        sorted_b = sorted(available_buses, key=lambda x: x.get("price", 0))
        buses_section = f"\n=== AVAILABLE BUSES ===\n{json.dumps(sorted_b[:5], indent=2)}\n"
    return f"You are MR Travel Assistant — smart AI chatbot for MR Bus Portal.\n{user_section}{buses_section}"


@router.post("/chat")
def chat(req: ChatRequest):
    message = req.message
    token = req.token
    session_id = req.session_id or "default"
    user, bookings, loyalty = get_user_context(token)
    # Always search for buses first - this handles "cheapest buses from X to Y" correctly
    available_buses, found_origin, found_dest = search_buses_from_message(message)
    state = get_session_state(session_id)
    if available_buses:
        state["last_buses"] = available_buses
        if found_origin:
            state["last_origin"] = found_origin
        if found_dest:
            state["last_destination"] = found_dest
    try:
        result = fallback_engine(
            message=message, token=token, session_id=session_id,
            user=user, bookings=bookings, loyalty=loyalty,
            available_buses=available_buses,
        )
        action = result.get("action")
        data = result.get("data") or {}
        response_text = result.get("response", "I'm here to help!")
        bus_data = result.get("bus") if action == "open_seats" else None
        return {"response": response_text, "action": action, "bus": bus_data, "data": data}
    except Exception as e:
        print(f"Chat error: {e}")
        return {"response": "Sorry, something went wrong! Please try again. 😊", "action": None, "bus": None, "data": None}
