from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_auth, require_role
from app.core.depot_scope import apply_depot_id_filter, assign_depot_for_write, hide_foreign_depot
from app.database import get_db
from app.models import Depot, Employee, Order, Route, RouteShippingPoint, RouteStop, Trip, VehicleLoading
from app.models import TransportExpense
from app.schemas import RouteMasterCreate, RouteMasterUpdate

router = APIRouter()
WRITE_ROLES = require_role("admin", "manager")


class RouteResponse(BaseModel):
    id: int
    code: str
    name: str
    depot_id: Optional[int] = None
    stops: int
    distance: str
    avg_time: str
    status: str

    class Config:
        from_attributes = True


def _to_response(route: Route) -> RouteResponse:
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


def _code_taken(db: Session, route_id: str, exclude_id: Optional[int] = None) -> bool:
    query = db.query(Route).filter(Route.route_id == route_id)
    if exclude_id is not None:
        query = query.filter(Route.id != exclude_id)
    return query.first() is not None


def _require_depot(db: Session, depot_id: int) -> Depot:
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=400, detail="Depot not found")
    return depot


@router.get("/", response_model=List[RouteResponse])
def get_routes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    query = apply_depot_id_filter(db.query(Route), user, Route.depot_id)
    routes = query.offset(skip).limit(limit).all()
    return [_to_response(route) for route in routes]


@router.get("/{route_pk}", response_model=RouteResponse)
def get_route(
    route_pk: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    route = db.query(Route).filter(Route.id == route_pk).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    hide_foreign_depot(user, route.depot_id)
    return _to_response(route)


@router.post("/", response_model=RouteResponse, status_code=status.HTTP_201_CREATED)
def create_route(
    payload: RouteMasterCreate,
    db: Session = Depends(get_db),
    user: Employee = Depends(WRITE_ROLES),
):
    depot_id = assign_depot_for_write(user, payload.depot_id)
    _require_depot(db, depot_id)
    route_id = (payload.route_id or "").strip()
    if not route_id:
        raise HTTPException(status_code=400, detail="Route code is required")
    if _code_taken(db, route_id):
        raise HTTPException(status_code=400, detail="Route with this code already exists")
    route = Route(
        route_id=route_id,
        name=payload.name,
        depot_id=depot_id,
        stops=payload.stops or 0,
        distance=payload.distance,
        avg_time=payload.avg_time,
        status=payload.status or "Active",
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    return _to_response(route)


@router.put("/{route_pk}", response_model=RouteResponse)
def update_route(
    route_pk: int,
    payload: RouteMasterUpdate,
    db: Session = Depends(get_db),
    user: Employee = Depends(WRITE_ROLES),
):
    route = db.query(Route).filter(Route.id == route_pk).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    hide_foreign_depot(user, route.depot_id)
    updates = payload.model_dump(exclude_unset=True)
    if "depot_id" in updates:
        updates["depot_id"] = assign_depot_for_write(user, updates["depot_id"])
        _require_depot(db, updates["depot_id"])
    if updates.get("route_id") and _code_taken(db, updates["route_id"], exclude_id=route_pk):
        raise HTTPException(status_code=400, detail="Route with this code already exists")
    for field, value in updates.items():
        setattr(route, field, value)
    route.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(route)
    return _to_response(route)


@router.delete("/{route_pk}")
def delete_route(
    route_pk: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(WRITE_ROLES),
):
    route = db.query(Route).filter(Route.id == route_pk).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    hide_foreign_depot(user, route.depot_id)
    if db.query(Trip).filter(Trip.route_id == route_pk).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot delete route: it is referenced by trips")
    if db.query(RouteShippingPoint).filter(RouteShippingPoint.route_id == route_pk).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete route: it is referenced by shipping-point assignments",
        )
    if db.query(TransportExpense).filter(TransportExpense.route_id == route_pk).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete route: it is referenced by transport expenses",
        )
    if db.query(VehicleLoading).filter(VehicleLoading.route_id == route_pk).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete route: it is referenced by vehicle loadings",
        )
    if db.query(Order).filter(Order.route_code == route.route_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot delete route: it is referenced by orders")
    if db.query(RouteStop).filter(RouteStop.route_id == route_pk).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete route: it is referenced by route stops",
        )
    db.delete(route)
    db.commit()
    return {"message": "Route deleted successfully"}
