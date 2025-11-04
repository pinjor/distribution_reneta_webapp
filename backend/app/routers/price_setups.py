from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import PriceSetup, Product
from app.schemas import PriceSetupCreate, PriceSetupUpdate, PriceSetup as PriceSetupSchema

router = APIRouter()

def generate_price_setup_code(db: Session) -> str:
    """Generate a unique PriceSetup code in format PRICE-XXXX"""
    existing_setups = db.query(PriceSetup).filter(
        PriceSetup.code.like("PRICE-%")
    ).all()
    
    if existing_setups:
        code_numbers = []
        for setup in existing_setups:
            if setup.code:
                try:
                    num = int(setup.code.split("-")[1])
                    code_numbers.append(num)
                except (ValueError, IndexError):
                    continue
        
        if code_numbers:
            new_num = max(code_numbers) + 1
        else:
            new_num = 1
    else:
        new_num = 1
    
    code = f"PRICE-{new_num:04d}"
    
    while db.query(PriceSetup).filter(PriceSetup.code == code).first():
        new_num += 1
        code = f"PRICE-{new_num:04d}"
    
    return code

@router.get("/", response_model=List[PriceSetupSchema])
def get_price_setups(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Join with products to ensure relationship is properly loaded
    setups = db.query(PriceSetup).join(Product).filter(PriceSetup.is_active == True).offset(skip).limit(limit).all()
    return setups

@router.get("/{setup_id}", response_model=PriceSetupSchema)
def get_price_setup(setup_id: int, db: Session = Depends(get_db)):
    setup = db.query(PriceSetup).filter(PriceSetup.id == setup_id).first()
    if not setup:
        raise HTTPException(status_code=404, detail="Price Setup not found")
    return setup

@router.post("/", response_model=PriceSetupSchema)
def create_price_setup(setup: PriceSetupCreate, db: Session = Depends(get_db)):
    # Auto-generate code if not provided
    if not setup.code:
        setup.code = generate_price_setup_code(db)
    
    # Check if code already exists
    existing_setup = db.query(PriceSetup).filter(PriceSetup.code == setup.code).first()
    if existing_setup:
        raise HTTPException(status_code=400, detail="Price Setup with this code already exists")
    
    # Verify product exists
    product = db.query(Product).filter(Product.id == setup.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db_setup = PriceSetup(**setup.model_dump())
    db.add(db_setup)
    db.commit()
    db.refresh(db_setup)
    return db_setup

@router.put("/{setup_id}", response_model=PriceSetupSchema)
def update_price_setup(setup_id: int, setup: PriceSetupUpdate, db: Session = Depends(get_db)):
    db_setup = db.query(PriceSetup).filter(PriceSetup.id == setup_id).first()
    if not db_setup:
        raise HTTPException(status_code=404, detail="Price Setup not found")
    
    # Check if code conflicts with another Price Setup
    if setup.code and setup.code != db_setup.code:
        existing_setup = db.query(PriceSetup).filter(PriceSetup.code == setup.code).first()
        if existing_setup:
            raise HTTPException(status_code=400, detail="Price Setup with this code already exists")
    
    # Verify product exists if product_id is being updated
    if setup.product_id and setup.product_id != db_setup.product_id:
        product = db.query(Product).filter(Product.id == setup.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = setup.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_setup, field, value)
    
    db.commit()
    db.refresh(db_setup)
    return db_setup

@router.delete("/{setup_id}")
def delete_price_setup(setup_id: int, db: Session = Depends(get_db)):
    db_setup = db.query(PriceSetup).filter(PriceSetup.id == setup_id).first()
    if not db_setup:
        raise HTTPException(status_code=404, detail="Price Setup not found")
    
    db.delete(db_setup)
    db.commit()
    return {"message": "Price Setup deleted successfully"}

