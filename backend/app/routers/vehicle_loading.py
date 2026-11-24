from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Employee, Vehicle, VehicleLoading
from app.core.deps import require_permission
from app.core.depot_scope import apply_depot_id_filter

router = APIRouter()

@router.get("/")
def get_vehicle_loadings(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("inventory.read")),
):
    query = db.query(VehicleLoading).outerjoin(Vehicle, VehicleLoading.vehicle_id == Vehicle.id)
    query = apply_depot_id_filter(query, user, Vehicle.depot_id)
    return query.offset(skip).limit(limit).all()

