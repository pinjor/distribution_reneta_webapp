from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import UOM
from app.schemas import UOMCreate, UOMUpdate, UOM as UOMSchema

router = APIRouter()

def generate_uom_code(db: Session) -> str:
    """Generate a unique UOM code in format UOM-XXXX"""
    existing_uoms = db.query(UOM).filter(
        UOM.code.like("UOM-%")
    ).all()
    
    if existing_uoms:
        code_numbers = []
        for uom in existing_uoms:
            if uom.code:
                try:
                    num = int(uom.code.split("-")[1])
                    code_numbers.append(num)
                except (ValueError, IndexError):
                    continue
        
        if code_numbers:
            new_num = max(code_numbers) + 1
        else:
            new_num = 1
    else:
        new_num = 1
    
    code = f"UOM-{new_num:04d}"
    
    while db.query(UOM).filter(UOM.code == code).first():
        new_num += 1
        code = f"UOM-{new_num:04d}"
    
    return code

@router.get("/", response_model=List[UOMSchema])
def get_uoms(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    uoms = db.query(UOM).filter(UOM.is_active == True).offset(skip).limit(limit).all()
    return uoms

@router.get("/{uom_id}", response_model=UOMSchema)
def get_uom(uom_id: int, db: Session = Depends(get_db)):
    uom = db.query(UOM).filter(UOM.id == uom_id).first()
    if not uom:
        raise HTTPException(status_code=404, detail="UOM not found")
    return uom

@router.post("/", response_model=UOMSchema)
def create_uom(uom: UOMCreate, db: Session = Depends(get_db)):
    # Auto-generate code if not provided
    if not uom.code:
        uom.code = generate_uom_code(db)
    
    # Check if code already exists
    existing_uom = db.query(UOM).filter(UOM.code == uom.code).first()
    if existing_uom:
        raise HTTPException(status_code=400, detail="UOM with this code already exists")
    
    db_uom = UOM(**uom.model_dump())
    db.add(db_uom)
    db.commit()
    db.refresh(db_uom)
    return db_uom

@router.put("/{uom_id}", response_model=UOMSchema)
def update_uom(uom_id: int, uom: UOMUpdate, db: Session = Depends(get_db)):
    db_uom = db.query(UOM).filter(UOM.id == uom_id).first()
    if not db_uom:
        raise HTTPException(status_code=404, detail="UOM not found")
    
    # Check if code conflicts with another UOM
    if uom.code and uom.code != db_uom.code:
        existing_uom = db.query(UOM).filter(UOM.code == uom.code).first()
        if existing_uom:
            raise HTTPException(status_code=400, detail="UOM with this code already exists")
    
    update_data = uom.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_uom, field, value)
    
    db.commit()
    db.refresh(db_uom)
    return db_uom

@router.delete("/{uom_id}")
def delete_uom(uom_id: int, db: Session = Depends(get_db)):
    db_uom = db.query(UOM).filter(UOM.id == uom_id).first()
    if not db_uom:
        raise HTTPException(status_code=404, detail="UOM not found")
    
    db.delete(db_uom)
    db.commit()
    return {"message": "UOM deleted successfully"}

