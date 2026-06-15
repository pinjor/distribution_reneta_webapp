from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Depot, Employee
from app.schemas import DepotCreate, Depot as DepotSchema
from app.core.deps import require_auth
from app.core.depot_scope import apply_depot_self_filter

router = APIRouter()

@router.get("/", response_model=List[DepotSchema])
def get_depots(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    query = apply_depot_self_filter(db.query(Depot), user)
    depots = query.offset(skip).limit(limit).all()
    return depots

@router.get("/{depot_id}", response_model=DepotSchema)
def get_depot(depot_id: int, db: Session = Depends(get_db)):
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=404, detail="Depot not found")
    return depot

@router.post("/", response_model=DepotSchema)
def create_depot(depot: DepotCreate, db: Session = Depends(get_db)):
    db_depot = Depot(**depot.model_dump())
    db.add(db_depot)
    db.commit()
    db.refresh(db_depot)
    return db_depot

