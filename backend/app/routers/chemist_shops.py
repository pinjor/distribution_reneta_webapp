from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import ChemistShop
from app.schemas import ChemistShopCreate, ChemistShopUpdate, ChemistShop as ChemistShopSchema

router = APIRouter()


def generate_chemist_shop_code(db: Session) -> str:
    existing = db.query(ChemistShop).filter(ChemistShop.code.like("CHEM-%")).all()
    numbers = []
    for shop in existing:
        try:
            numbers.append(int(shop.code.split("-")[1]))
        except (ValueError, IndexError, AttributeError):
            continue
    new_num = (max(numbers) + 1) if numbers else 1
    code = f"CHEM-{new_num:04d}"
    while db.query(ChemistShop).filter(ChemistShop.code == code).first():
        new_num += 1
        code = f"CHEM-{new_num:04d}"
    return code


@router.get("/", response_model=List[ChemistShopSchema])
def get_chemist_shops(skip: int = 0, limit: int = 100, include_inactive: bool = False, db: Session = Depends(get_db)):
    query = db.query(ChemistShop)
    if not include_inactive:
        query = query.filter(ChemistShop.is_active == True)
    return query.order_by(ChemistShop.name.asc(), ChemistShop.code.asc()).offset(skip).limit(limit).all()


@router.get("/{shop_id}", response_model=ChemistShopSchema)
def get_chemist_shop(shop_id: int, db: Session = Depends(get_db)):
    shop = db.query(ChemistShop).filter(ChemistShop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Chemist shop not found")
    return shop


@router.post("/", response_model=ChemistShopSchema)
def create_chemist_shop(shop: ChemistShopCreate, db: Session = Depends(get_db)):
    if not shop.code:
        shop.code = generate_chemist_shop_code(db)
    existing = db.query(ChemistShop).filter(ChemistShop.code == shop.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Chemist shop with this code already exists")
    db_shop = ChemistShop(**shop.model_dump())
    db.add(db_shop)
    db.commit()
    db.refresh(db_shop)
    return db_shop


@router.put("/{shop_id}", response_model=ChemistShopSchema)
def update_chemist_shop(shop_id: int, shop: ChemistShopUpdate, db: Session = Depends(get_db)):
    db_shop = db.query(ChemistShop).filter(ChemistShop.id == shop_id).first()
    if not db_shop:
        raise HTTPException(status_code=404, detail="Chemist shop not found")
    for field, value in shop.model_dump(exclude_unset=True).items():
        setattr(db_shop, field, value)
    db.commit()
    db.refresh(db_shop)
    return db_shop


@router.delete("/{shop_id}")
def delete_chemist_shop(shop_id: int, db: Session = Depends(get_db)):
    db_shop = db.query(ChemistShop).filter(ChemistShop.id == shop_id).first()
    if not db_shop:
        raise HTTPException(status_code=404, detail="Chemist shop not found")
    db.delete(db_shop)
    db.commit()
    return {"message": "Chemist shop deleted successfully"}
