from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import ShippingPoint
from pydantic import BaseModel

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
    db: Session = Depends(get_db)
):
    """Get shipping points (routes) - filtered by active status by default"""
    query = db.query(ShippingPoint)
    if is_active:
        query = query.filter(ShippingPoint.is_active == True)
    shipping_points = query.offset(skip).limit(limit).all()
    return shipping_points
