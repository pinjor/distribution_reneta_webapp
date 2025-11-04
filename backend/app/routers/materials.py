from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Material

router = APIRouter()

@router.get("/")
def get_materials(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    materials = db.query(Material).offset(skip).limit(limit).all()
    return materials

