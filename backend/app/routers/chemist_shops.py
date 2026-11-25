from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.database import get_db
from app.models import ChemistShop
from app import schemas

router = APIRouter()
WRITE_ROLES = require_role("admin", "manager")


def generate_chemist_code(db: Session) -> str:
    existing = db.query(ChemistShop).filter(ChemistShop.code.like("CHEM-%")).all()
    numbers = []
    for row in existing:
        try:
            numbers.append(int(row.code.split("-", 1)[1]))
        except (ValueError, IndexError, AttributeError):
            continue
    next_num = max(numbers) + 1 if numbers else 1
    code = f"CHEM-{next_num:04d}"
    while db.query(ChemistShop).filter(ChemistShop.code == code).first():
        next_num += 1
        code = f"CHEM-{next_num:04d}"
    return code


def _code_taken(db: Session, code: str, exclude_id: Optional[int] = None) -> bool:
    query = db.query(ChemistShop).filter(ChemistShop.code == code)
    if exclude_id is not None:
        query = query.filter(ChemistShop.id != exclude_id)
    return query.first() is not None


@router.get("", response_model=List[schemas.ChemistShop])
def list_chemist_shops(
    skip: int = 0,
    limit: int = 200,
    q: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(ChemistShop)
    if is_active is not None:
        query = query.filter(ChemistShop.is_active == is_active)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (ChemistShop.name.ilike(like))
            | (ChemistShop.code.ilike(like))
            | (ChemistShop.owner_name.ilike(like))
            | (ChemistShop.license_number.ilike(like))
            | (ChemistShop.email.ilike(like))
            | (ChemistShop.city.ilike(like))
        )
    return query.order_by(ChemistShop.id).offset(skip).limit(limit).all()


@router.get("/{shop_id}", response_model=schemas.ChemistShop)
def get_chemist_shop(shop_id: int, db: Session = Depends(get_db)):
    shop = db.query(ChemistShop).filter(ChemistShop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Chemist shop not found")
    return shop


@router.post("", response_model=schemas.ChemistShop, status_code=status.HTTP_201_CREATED)
def create_chemist_shop(
    payload: schemas.ChemistShopCreate,
    db: Session = Depends(get_db),
    _user=Depends(WRITE_ROLES),
):
    code = (payload.code or "").strip() or generate_chemist_code(db)
    if _code_taken(db, code):
        raise HTTPException(status_code=400, detail="Chemist shop with this code already exists")
    now = datetime.utcnow()
    data = payload.model_dump()
    data["code"] = code
    if data.get("is_active") is None:
        data["is_active"] = True
    data["created_at"] = now
    data["updated_at"] = now
    shop = ChemistShop(**data)
    db.add(shop)
    db.commit()
    db.refresh(shop)
    return shop


@router.put("/{shop_id}", response_model=schemas.ChemistShop)
def update_chemist_shop(
    shop_id: int,
    payload: schemas.ChemistShopUpdate,
    db: Session = Depends(get_db),
    _user=Depends(WRITE_ROLES),
):
    shop = db.query(ChemistShop).filter(ChemistShop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Chemist shop not found")
    updates = payload.model_dump(exclude_unset=True)
    if "code" in updates and updates["code"]:
        if _code_taken(db, updates["code"], exclude_id=shop_id):
            raise HTTPException(status_code=400, detail="Chemist shop with this code already exists")
    for field, value in updates.items():
        setattr(shop, field, value)
    shop.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shop)
    return shop


@router.delete("/{shop_id}")
def delete_chemist_shop(
    shop_id: int,
    db: Session = Depends(get_db),
    _user=Depends(WRITE_ROLES),
):
    shop = db.query(ChemistShop).filter(ChemistShop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Chemist shop not found")
    db.delete(shop)
    db.commit()
    return {"message": "Chemist shop deleted successfully"}
