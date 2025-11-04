from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Route

router = APIRouter()

@router.get("/")
def get_routes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    routes = db.query(Route).offset(skip).limit(limit).all()
    return routes

