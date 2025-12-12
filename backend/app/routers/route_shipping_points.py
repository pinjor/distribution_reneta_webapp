from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import RouteShippingPoint, Route, ShippingPoint
from app.schemas import (
    RouteShippingPointCreate, RouteShippingPointUpdate, RouteShippingPoint as RouteShippingPointSchema
)

router = APIRouter()

@router.get("", response_model=List[RouteShippingPointSchema])
def get_route_shipping_points(route_id: int = None, db: Session = Depends(get_db)):
    """Get all route shipping points, optionally filtered by route"""
    from fastapi import Query
    from datetime import datetime
    query = db.query(RouteShippingPoint)
    if route_id:
        query = query.filter(RouteShippingPoint.route_id == route_id)
    result = query.order_by(RouteShippingPoint.route_id, RouteShippingPoint.sequence).all()
    
    # Ensure created_at and updated_at are set if None
    for rsp in result:
        if rsp.created_at is None:
            rsp.created_at = datetime.now()
        if rsp.updated_at is None:
            rsp.updated_at = datetime.now()
    
    return result

@router.get("/{route_shipping_point_id}", response_model=RouteShippingPointSchema)
def get_route_shipping_point(route_shipping_point_id: int, db: Session = Depends(get_db)):
    """Get a specific route shipping point"""
    route_sp = db.query(RouteShippingPoint).filter(RouteShippingPoint.id == route_shipping_point_id).first()
    if not route_sp:
        raise HTTPException(status_code=404, detail="Route shipping point not found")
    return route_sp

@router.post("", response_model=RouteShippingPointSchema)
def create_route_shipping_point(data: RouteShippingPointCreate, db: Session = Depends(get_db)):
    """Create a new route shipping point"""
    # Verify route exists
    route = db.query(Route).filter(Route.id == data.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Verify shipping point exists
    shipping_point = db.query(ShippingPoint).filter(ShippingPoint.id == data.shipping_point_id).first()
    if not shipping_point:
        raise HTTPException(status_code=404, detail="Shipping point not found")
    
    # Check if this shipping point is already in this route
    existing = db.query(RouteShippingPoint).filter(
        RouteShippingPoint.route_id == data.route_id,
        RouteShippingPoint.shipping_point_id == data.shipping_point_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This shipping point is already added to this route")
    
    route_sp = RouteShippingPoint(**data.model_dump())
    db.add(route_sp)
    db.commit()
    db.refresh(route_sp)
    return route_sp

@router.put("/{route_shipping_point_id}", response_model=RouteShippingPointSchema)
def update_route_shipping_point(
    route_shipping_point_id: int,
    data: RouteShippingPointUpdate,
    db: Session = Depends(get_db)
):
    """Update a route shipping point"""
    route_sp = db.query(RouteShippingPoint).filter(RouteShippingPoint.id == route_shipping_point_id).first()
    if not route_sp:
        raise HTTPException(status_code=404, detail="Route shipping point not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(route_sp, field, value)
    
    db.commit()
    db.refresh(route_sp)
    return route_sp

@router.delete("/{route_shipping_point_id}")
def delete_route_shipping_point(route_shipping_point_id: int, db: Session = Depends(get_db)):
    """Delete a route shipping point"""
    route_sp = db.query(RouteShippingPoint).filter(RouteShippingPoint.id == route_shipping_point_id).first()
    if not route_sp:
        raise HTTPException(status_code=404, detail="Route shipping point not found")
    
    db.delete(route_sp)
    db.commit()
    return {"message": "Route shipping point deleted successfully"}

