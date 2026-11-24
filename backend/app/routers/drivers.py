from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Driver, Employee
from app.schemas import DriverCreate, Driver as DriverSchema
from app.core.deps import require_auth, require_role

router = APIRouter()

@router.get("/", response_model=List[DriverSchema])
def get_drivers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    drivers = db.query(Driver).offset(skip).limit(limit).all()
    return drivers

@router.post("/", response_model=DriverSchema)
def create_driver(
    driver: DriverCreate,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_role("manager", "transport")),
):
    db_driver = Driver(**driver.model_dump())
    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    return db_driver

