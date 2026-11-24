from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Vehicle, Employee
from app.schemas import VehicleCreate, VehicleUpdate, Vehicle as VehicleSchema
from app.core.deps import require_auth, require_role
from app.core.depot_scope import apply_depot_id_filter, assign_depot_for_write, hide_foreign_depot

router = APIRouter()

@router.get("/", response_model=List[VehicleSchema])
def get_vehicles(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    query = apply_depot_id_filter(db.query(Vehicle), user, Vehicle.depot_id)
    vehicles = query.offset(skip).limit(limit).all()
    return vehicles

@router.post("/", response_model=VehicleSchema)
def create_vehicle(
    vehicle: VehicleCreate,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_role("manager", "transport")),
):
    payload = vehicle.model_dump()
    if "depot_id" in payload:
        payload["depot_id"] = assign_depot_for_write(user, payload.get("depot_id"))
    db_vehicle = Vehicle(**payload)
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@router.put("/{vehicle_id}", response_model=VehicleSchema)
def update_vehicle(
    vehicle_id: int,
    vehicle: VehicleUpdate,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_role("manager", "transport")),
):
    db_vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    hide_foreign_depot(user, db_vehicle.depot_id)

    update_data = vehicle.model_dump(exclude_unset=True)
    if "depot_id" in update_data:
        update_data["depot_id"] = assign_depot_for_write(user, update_data.get("depot_id"))
    for field, value in update_data.items():
        setattr(db_vehicle, field, value)

    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

