from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Depot, Employee
from app.schemas import DepotCreate, DepotUpdate, Depot as DepotSchema
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

@router.put("/{depot_id}", response_model=DepotSchema)
def update_depot(depot_id: int, depot: DepotUpdate, db: Session = Depends(get_db)):
    db_depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not db_depot:
        raise HTTPException(status_code=404, detail="Depot not found")

    for key, value in depot.model_dump(exclude_unset=True).items():
        setattr(db_depot, key, value)

    db.commit()
    db.refresh(db_depot)
    return db_depot

@router.delete("/{depot_id}")
def delete_depot(depot_id: int, db: Session = Depends(get_db)):
    db_depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not db_depot:
        raise HTTPException(status_code=404, detail="Depot not found")

    db.delete(db_depot)
    db.commit()
    return {"message": "Depot deleted successfully"}

