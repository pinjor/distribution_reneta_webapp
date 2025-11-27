from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Route
from pydantic import BaseModel

router = APIRouter()

class RouteResponse(BaseModel):
    id: int
    code: str  # route_id mapped to code for frontend compatibility
    name: str
    depot_id: int
    stops: int
    distance: str
    avg_time: str
    status: str
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[RouteResponse])
def get_routes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    routes = db.query(Route).offset(skip).limit(limit).all()
    # Map route_id to code for frontend compatibility
    result = []
    for route in routes:
        route_dict = {
            "id": route.id,
            "code": route.route_id,  # Map route_id to code
            "name": route.name,
            "depot_id": route.depot_id,
            "stops": route.stops or 0,
            "distance": route.distance or "",
            "avg_time": route.avg_time or "",
            "status": route.status or "Active",
        }
        result.append(RouteResponse(**route_dict))
    return result

