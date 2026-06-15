from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import ShippingPoint, Employee
from pydantic import BaseModel
from app.core.deps import require_auth
from app.core.depot_scope import apply_depot_id_filter

router = APIRouter()

class ShippingPointResponse(BaseModel):
    id: int
    name: str
    code: str
    depot_id: int
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[ShippingPointResponse])
def get_shipping_points(
    skip: int = 0, 
    limit: int = 100, 
    is_active: bool = True,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    """Get shipping points (routes) - filtered by active status by default"""
    query = db.query(ShippingPoint)
    if is_active:
        query = query.filter(ShippingPoint.is_active == True)
    query = apply_depot_id_filter(query, user, ShippingPoint.depot_id)
    shipping_points = query.offset(skip).limit(limit).all()
    return shipping_points
