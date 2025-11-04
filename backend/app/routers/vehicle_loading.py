from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import VehicleLoading

router = APIRouter()

@router.get("/")
def get_vehicle_loadings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    loadings = db.query(VehicleLoading).offset(skip).limit(limit).all()
    return loadings

