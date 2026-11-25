from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_auth, require_role
from app.core.depot_scope import apply_depot_id_filter, assign_depot_for_write, hide_foreign_depot
from app.database import get_db
from app.models import Depot, Employee, RouteShippingPoint, ShippingPoint
from app.schemas import ShippingPoint as ShippingPointSchema
from app.schemas import ShippingPointCreate, ShippingPointUpdate

router = APIRouter()
WRITE_ROLES = require_role("admin", "manager")


def _code_taken(db: Session, code: str, exclude_id: Optional[int] = None) -> bool:
    query = db.query(ShippingPoint).filter(ShippingPoint.code == code)
    if exclude_id is not None:
        query = query.filter(ShippingPoint.id != exclude_id)
    return query.first() is not None


def _require_depot(db: Session, depot_id: int) -> Depot:
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=400, detail="Depot not found")
    return depot


@router.get("/", response_model=List[ShippingPointSchema])
def get_shipping_points(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = Query(True),
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    query = db.query(ShippingPoint)
    if is_active is not None:
        query = query.filter(ShippingPoint.is_active == is_active)
    query = apply_depot_id_filter(query, user, ShippingPoint.depot_id)
    return query.offset(skip).limit(limit).all()


@router.get("/{shipping_point_id}", response_model=ShippingPointSchema)
def get_shipping_point(
    shipping_point_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    point = db.query(ShippingPoint).filter(ShippingPoint.id == shipping_point_id).first()
    if not point:
        raise HTTPException(status_code=404, detail="Shipping point not found")
    hide_foreign_depot(user, point.depot_id)
    return point


@router.post("/", response_model=ShippingPointSchema, status_code=status.HTTP_201_CREATED)
def create_shipping_point(
    payload: ShippingPointCreate,
    db: Session = Depends(get_db),
    user: Employee = Depends(WRITE_ROLES),
):
    depot_id = assign_depot_for_write(user, payload.depot_id)
    _require_depot(db, depot_id)
    if _code_taken(db, payload.code):
        raise HTTPException(status_code=400, detail="Shipping point with this code already exists")
    data = payload.model_dump()
    data["depot_id"] = depot_id
    if data.get("is_active") is None:
        data["is_active"] = True
    point = ShippingPoint(**data)
    db.add(point)
    db.commit()
    db.refresh(point)
    return point


@router.put("/{shipping_point_id}", response_model=ShippingPointSchema)
def update_shipping_point(
    shipping_point_id: int,
    payload: ShippingPointUpdate,
    db: Session = Depends(get_db),
    user: Employee = Depends(WRITE_ROLES),
):
    point = db.query(ShippingPoint).filter(ShippingPoint.id == shipping_point_id).first()
    if not point:
        raise HTTPException(status_code=404, detail="Shipping point not found")
    hide_foreign_depot(user, point.depot_id)
    updates = payload.model_dump(exclude_unset=True)
    if "depot_id" in updates:
        updates["depot_id"] = assign_depot_for_write(user, updates["depot_id"])
        _require_depot(db, updates["depot_id"])
    if updates.get("code") and _code_taken(db, updates["code"], exclude_id=shipping_point_id):
        raise HTTPException(status_code=400, detail="Shipping point with this code already exists")
    for field, value in updates.items():
        setattr(point, field, value)
    point.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(point)
    return point


@router.delete("/{shipping_point_id}")
def delete_shipping_point(
    shipping_point_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(WRITE_ROLES),
):
    point = db.query(ShippingPoint).filter(ShippingPoint.id == shipping_point_id).first()
    if not point:
        raise HTTPException(status_code=404, detail="Shipping point not found")
    hide_foreign_depot(user, point.depot_id)
    if db.query(RouteShippingPoint).filter(RouteShippingPoint.shipping_point_id == shipping_point_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete shipping point: it is referenced by routes",
        )
    db.delete(point)
    db.commit()
    return {"message": "Shipping point deleted successfully"}
