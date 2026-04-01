from fastapi import APIRouter

router = APIRouter(prefix="/booking")

bookings = []

@router.post("/book")
def book(data: dict):

    ticket = {
        "bus_id": data["bus_id"],
        "seat": data["seat"],
        "user": data.get("user"),
        "status": "confirmed"
    }

    bookings.append(ticket)

    return {
        "message": "Ticket booked",
        "ticket": ticket
    }