from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/seats", tags=["Seat Recommendation"])

# Bus layout knowledge
WINDOW_SEATS = ["A1", "A4", "B1", "B4", "C1", "C4", "D1", "D4", "E1", "E4", "F1", "F4", "G1", "G4", "H1", "H4"]
AISLE_SEATS = ["A2", "A3", "B2", "B3", "C2", "C3", "D2", "D3", "E2", "E3", "F2", "F3", "G2", "G3", "H2", "H3"]
FRONT_SEATS = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4"]
BACK_SEATS = ["G1", "G2", "G3", "G4", "H1", "H2", "H3", "H4"]
EXIT_SEATS = ["D1", "D2", "D3", "D4"]  # middle = near exit
QUIET_SEATS = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4"]  # away from engine (rear)
LEGROOM_SEATS = ["A1", "A2", "A3", "A4", "D1", "D2", "D3", "D4"]  # first row and emergency exit row
AWAY_FROM_TOILET = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4",
                    "D1", "D2", "D3", "D4", "E1", "E2", "E3", "E4"]  # toilet usually at back


class SeatRecommendationRequest(BaseModel):
    booked_seats: list[str]
    preferences: list[str]


# Each rule: (keywords to match in preferences, seat set, score, reason label)
PREFERENCE_RULES = [
    ({"window"}, WINDOW_SEATS, 3, "window seat"),
    ({"engine", "quiet"}, QUIET_SEATS, 3, "away from engine"),
    ({"exit", "boarding"}, EXIT_SEATS, 2, "near exit"),
    ({"legroom"}, LEGROOM_SEATS, 2, "extra legroom"),
    ({"toilet"}, AWAY_FROM_TOILET, 2, "away from toilet"),
]


def _matching_rules(preferences_lower: str) -> list[tuple[set[str], list[str], int, str]]:
    """Return only the rules that match the user's preferences."""
    return [rule for rule in PREFERENCE_RULES if any(kw in preferences_lower for kw in rule[0])]


def _score_seat(seat: str, active_rules: list[tuple[set[str], list[str], int, str]]) -> dict:
    score = 0
    reasons: list[str] = []
    for _keywords, seat_set, points, label in active_rules:
        if seat in seat_set:
            score += points
            reasons.append(label)
    return {"score": score, "reasons": reasons}


@router.post("/recommend")
def recommend_seat(req: SeatRecommendationRequest):
    all_seats = [
        f"{row}{num}"
        for row in ["A", "B", "C", "D", "E", "F", "G", "H"]
        for num in range(1, 5)
    ]

    available = [s for s in all_seats if s not in req.booked_seats]
    if not available:
        return {"recommended": None, "reason": "No seats available", "scored_seats": []}

    preferences_lower = " ".join(req.preferences).lower()
    active_rules = _matching_rules(preferences_lower)

    scores = {seat: _score_seat(seat, active_rules) for seat in available}

    sorted_seats = sorted(scores.items(), key=lambda x: x[1]["score"], reverse=True)
    top_seats = [s[0] for s in sorted_seats[:5]]
    best_seat = sorted_seats[0][0]
    best_reasons = sorted_seats[0][1]["reasons"]

    reason_text = f"Best pick for you: {', '.join(best_reasons)}" if best_reasons else "Good available seat"

    return {
        "recommended": best_seat,
        "reason": reason_text,
        "top_seats": top_seats,
        "all_scores": {k: v["score"] for k, v in scores.items()}
    }