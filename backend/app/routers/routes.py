from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Route, Employee
from pydantic import BaseModel
from app.core.deps import require_auth
from app.core.depot_scope import apply_depot_id_filter

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
def get_routes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    query = apply_depot_id_filter(db.query(Route), user, Route.depot_id)
    routes = query.offset(skip).limit(limit).all()
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

class RouteCreate(BaseModel):
    code: str
    name: str
    depot_id: int
    stops: int = 0
    distance: str = ""
    avg_time: str = ""
    status: str = "Active"

class RouteUpdate(BaseModel):
    name: Optional[str] = None
    depot_id: Optional[int] = None
    stops: Optional[int] = None
    distance: Optional[str] = None
    avg_time: Optional[str] = None
    status: Optional[str] = None

def to_route_response(route: Route) -> RouteResponse:
    return RouteResponse(
        id=route.id,
        code=route.route_id,
        name=route.name,
        depot_id=route.depot_id,
        stops=route.stops or 0,
        distance=route.distance or "",
        avg_time=route.avg_time or "",
        status=route.status or "Active",
    )

@router.post("/", response_model=RouteResponse)
def create_route(payload: RouteCreate, db: Session = Depends(get_db)):
    if db.query(Route).filter(Route.route_id == payload.code).first():
        raise HTTPException(status_code=400, detail=f"Route with code {payload.code} already exists")
    db_route = Route(
        route_id=payload.code,
        name=payload.name,
        depot_id=payload.depot_id,
        stops=payload.stops,
        distance=payload.distance or None,
        avg_time=payload.avg_time or None,
        status=payload.status or "Active",
    )
    db.add(db_route)
    db.commit()
    db.refresh(db_route)
    return to_route_response(db_route)

@router.put("/{route_id}", response_model=RouteResponse)
def update_route(route_id: int, payload: RouteUpdate, db: Session = Depends(get_db)):
    db_route = db.query(Route).filter(Route.id == route_id).first()
    if not db_route:
        raise HTTPException(status_code=404, detail="Route not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(db_route, key, value)
    db.commit()
    db.refresh(db_route)
    return to_route_response(db_route)

@router.delete("/{route_id}")
def delete_route(route_id: int, db: Session = Depends(get_db)):
    db_route = db.query(Route).filter(Route.id == route_id).first()
    if not db_route:
        raise HTTPException(status_code=404, detail="Route not found")
    db.delete(db_route)
    db.commit()
    return {"message": "Route deleted successfully"}

