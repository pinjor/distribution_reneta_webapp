from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Driver
from app.schemas import DriverCreate, DriverUpdate, Driver as DriverSchema

router = APIRouter()

@router.get("/", response_model=List[DriverSchema])
def get_drivers(skip: int = 0, limit: int = 100, include_inactive: bool = False, db: Session = Depends(get_db)):
    query = db.query(Driver)
    if not include_inactive:
        query = query.filter(Driver.is_active == True)
    return query.order_by(Driver.driver_id.asc()).offset(skip).limit(limit).all()

@router.post("/", response_model=DriverSchema)
def create_driver(driver: DriverCreate, db: Session = Depends(get_db)):
    existing = db.query(Driver).filter(Driver.driver_id == driver.driver_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Driver ID already exists")
    existing_license = db.query(Driver).filter(Driver.license_number == driver.license_number).first()
    if existing_license:
        raise HTTPException(status_code=400, detail="License number already exists")
    db_driver = Driver(**driver.model_dump())
    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    return db_driver

@router.put("/{driver_id}", response_model=DriverSchema)
def update_driver(driver_id: int, driver: DriverUpdate, db: Session = Depends(get_db)):
    db_driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not db_driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    for field, value in driver.model_dump(exclude_unset=True).items():
        setattr(db_driver, field, value)
    db.commit()
    db.refresh(db_driver)
    return db_driver

@router.delete("/{driver_id}")
def delete_driver(driver_id: int, db: Session = Depends(get_db)):
    db_driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not db_driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    db.delete(db_driver)
    db.commit()
    return {"message": "Driver deleted successfully"}

