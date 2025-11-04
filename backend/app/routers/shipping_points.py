from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import ShippingPoint

router = APIRouter()

@router.get("/")
def get_shipping_points(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    shipping_points = db.query(ShippingPoint).offset(skip).limit(limit).all()
    return shipping_points

