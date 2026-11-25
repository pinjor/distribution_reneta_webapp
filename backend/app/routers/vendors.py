from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.database import get_db
from app.models import StockReceipt, Vendor
from app.schemas import VendorCreate, VendorUpdate, Vendor as VendorSchema

router = APIRouter()
WRITE_ROLES = require_role("admin", "manager")


def generate_vendor_code(db: Session) -> str:
    existing = db.query(Vendor).filter(Vendor.code.like("VEND-%")).all()
    numbers = []
    for row in existing:
        try:
            numbers.append(int(row.code.split("-", 1)[1]))
        except (ValueError, IndexError, AttributeError):
            continue
    next_num = max(numbers) + 1 if numbers else 1
    code = f"VEND-{next_num:04d}"
    while db.query(Vendor).filter(Vendor.code == code).first():
        next_num += 1
        code = f"VEND-{next_num:04d}"
    return code


def _code_taken(db: Session, code: str, exclude_id: Optional[int] = None) -> bool:
    query = db.query(Vendor).filter(Vendor.code == code)
    if exclude_id is not None:
        query = query.filter(Vendor.id != exclude_id)
    return query.first() is not None


@router.get("/", response_model=List[VendorSchema])
def get_vendors(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Vendor).offset(skip).limit(limit).all()


@router.get("/{vendor_id}", response_model=VendorSchema)
def get_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.post("/", response_model=VendorSchema, status_code=status.HTTP_201_CREATED)
def create_vendor(
    vendor: VendorCreate,
    db: Session = Depends(get_db),
    _user=Depends(WRITE_ROLES),
):
    code = (vendor.code or "").strip() or generate_vendor_code(db)
    if _code_taken(db, code):
        raise HTTPException(status_code=400, detail="Vendor with this code already exists")
    data = vendor.model_dump()
    data["code"] = code
    db_vendor = Vendor(**data)
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor


@router.put("/{vendor_id}", response_model=VendorSchema)
def update_vendor(
    vendor_id: int,
    payload: VendorUpdate,
    db: Session = Depends(get_db),
    _user=Depends(WRITE_ROLES),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("code") and _code_taken(db, updates["code"], exclude_id=vendor_id):
        raise HTTPException(status_code=400, detail="Vendor with this code already exists")
    for field, value in updates.items():
        setattr(vendor, field, value)
    vendor.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    _user=Depends(WRITE_ROLES),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if db.query(StockReceipt).filter(StockReceipt.vendor_id == vendor_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete vendor: it is referenced by stock receipts",
        )
    db.delete(vendor)
    db.commit()
    return {"message": "Vendor deleted successfully"}
