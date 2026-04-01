from fastapi import APIRouter
from app.cities_loader import search_cities

router = APIRouter(prefix="/cities", tags=["Cities"])


@router.get("/search")
def city_search(q: str):
    return search_cities(q)