from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_auth, require_role
from app.core.depot_scope import apply_depot_self_filter, hide_foreign_depot
from app.database import get_db
from app.models import (
    Depot,
    DepotTransfer,
    Employee,
    Invoice,
    Order,
    Route,
    ShippingPoint,
    StockAdjustment,
    StockIssuance,
    StockLedger,
    StockReceipt,
    Vehicle,
)
from app.schemas import DepotCreate, DepotUpdate, Depot as DepotSchema

router = APIRouter()
WRITE_ROLES = require_role("admin", "manager")


def _code_taken(db: Session, code: str, exclude_id: Optional[int] = None) -> bool:
    query = db.query(Depot).filter(Depot.code == code)
    if exclude_id is not None:
        query = query.filter(Depot.id != exclude_id)
    return query.first() is not None


def _depot_delete_blockers(db: Session, depot: Depot) -> Optional[str]:
    checks = [
        (db.query(Employee).filter(Employee.depot_id == depot.id).first(), "employees"),
        (db.query(Route).filter(Route.depot_id == depot.id).first(), "routes"),
        (db.query(ShippingPoint).filter(ShippingPoint.depot_id == depot.id).first(), "shipping points"),
        (db.query(Vehicle).filter(Vehicle.depot_id == depot.id).first(), "vehicles"),
        (db.query(StockLedger).filter(StockLedger.depot_id == depot.id).first(), "stock ledger"),
        (db.query(StockReceipt).filter(StockReceipt.depot_id == depot.id).first(), "stock receipts"),
        (db.query(StockIssuance).filter(StockIssuance.depot_id == depot.id).first(), "stock issuances"),
        (db.query(StockAdjustment).filter(StockAdjustment.depot_id == depot.id).first(), "stock adjustments"),
        (db.query(Invoice).filter(Invoice.depot_id == depot.id).first(), "invoices"),
        (
            db.query(DepotTransfer)
            .filter((DepotTransfer.from_depot_id == depot.id) | (DepotTransfer.to_depot_id == depot.id))
            .first(),
            "depot transfers",
        ),
        (db.query(Order).filter(Order.depot_code == depot.code).first(), "orders"),
    ]
    for row, label in checks:
        if row is not None:
            return label
    return None


@router.get("/", response_model=List[DepotSchema])
def get_depots(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    query = apply_depot_self_filter(db.query(Depot), user)
    return query.offset(skip).limit(limit).all()


@router.get("/{depot_id}", response_model=DepotSchema)
def get_depot(
    depot_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=404, detail="Depot not found")
    hide_foreign_depot(user, depot.id)
    return depot


@router.post("/", response_model=DepotSchema, status_code=status.HTTP_201_CREATED)
def create_depot(
    depot: DepotCreate,
    db: Session = Depends(get_db),
    _user: Employee = Depends(WRITE_ROLES),
):
    if _code_taken(db, depot.code):
        raise HTTPException(status_code=400, detail="Depot with this code already exists")
    db_depot = Depot(**depot.model_dump())
    db.add(db_depot)
    db.commit()
    db.refresh(db_depot)
    return db_depot


@router.put("/{depot_id}", response_model=DepotSchema)
def update_depot(
    depot_id: int,
    payload: DepotUpdate,
    db: Session = Depends(get_db),
    user: Employee = Depends(WRITE_ROLES),
):
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=404, detail="Depot not found")
    hide_foreign_depot(user, depot.id)
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("code") and _code_taken(db, updates["code"], exclude_id=depot_id):
        raise HTTPException(status_code=400, detail="Depot with this code already exists")
    for field, value in updates.items():
        setattr(depot, field, value)
    depot.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(depot)
    return depot


@router.delete("/{depot_id}")
def delete_depot(
    depot_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(WRITE_ROLES),
):
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=404, detail="Depot not found")
    hide_foreign_depot(user, depot.id)
    blocker = _depot_delete_blockers(db, depot)
    if blocker:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete depot: it is referenced by {blocker}",
        )
    db.delete(depot)
    db.commit()
    return {"message": "Depot deleted successfully"}
