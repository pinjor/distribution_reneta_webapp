from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import PrimaryPackaging
from app.schemas import PrimaryPackagingCreate, PrimaryPackagingUpdate, PrimaryPackaging as PrimaryPackagingSchema

router = APIRouter()

def generate_primary_packaging_code(db: Session) -> str:
    """Generate a unique PrimaryPackaging code in format PP-XXXX"""
    existing_packagings = db.query(PrimaryPackaging).filter(
        PrimaryPackaging.code.like("PP-%")
    ).all()
    
    if existing_packagings:
        code_numbers = []
        for packaging in existing_packagings:
            if packaging.code:
                try:
                    num = int(packaging.code.split("-")[1])
                    code_numbers.append(num)
                except (ValueError, IndexError):
                    continue
        
        if code_numbers:
            new_num = max(code_numbers) + 1
        else:
            new_num = 1
    else:
        new_num = 1
    
    code = f"PP-{new_num:04d}"
    
    while db.query(PrimaryPackaging).filter(PrimaryPackaging.code == code).first():
        new_num += 1
        code = f"PP-{new_num:04d}"
    
    return code

@router.get("/", response_model=List[PrimaryPackagingSchema])
def get_primary_packagings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    packagings = db.query(PrimaryPackaging).filter(PrimaryPackaging.is_active == True).offset(skip).limit(limit).all()
    return packagings

@router.get("/{packaging_id}", response_model=PrimaryPackagingSchema)
def get_primary_packaging(packaging_id: int, db: Session = Depends(get_db)):
    packaging = db.query(PrimaryPackaging).filter(PrimaryPackaging.id == packaging_id).first()
    if not packaging:
        raise HTTPException(status_code=404, detail="PrimaryPackaging not found")
    return packaging

@router.post("/", response_model=PrimaryPackagingSchema)
def create_primary_packaging(packaging: PrimaryPackagingCreate, db: Session = Depends(get_db)):
    # Auto-generate code if not provided
    if not packaging.code:
        packaging.code = generate_primary_packaging_code(db)
    
    # Check if code already exists
    existing_packaging = db.query(PrimaryPackaging).filter(PrimaryPackaging.code == packaging.code).first()
    if existing_packaging:
        raise HTTPException(status_code=400, detail="PrimaryPackaging with this code already exists")
    
    db_packaging = PrimaryPackaging(**packaging.model_dump())
    db.add(db_packaging)
    db.commit()
    db.refresh(db_packaging)
    return db_packaging

@router.put("/{packaging_id}", response_model=PrimaryPackagingSchema)
def update_primary_packaging(packaging_id: int, packaging: PrimaryPackagingUpdate, db: Session = Depends(get_db)):
    db_packaging = db.query(PrimaryPackaging).filter(PrimaryPackaging.id == packaging_id).first()
    if not db_packaging:
        raise HTTPException(status_code=404, detail="PrimaryPackaging not found")
    
    # Check if code conflicts with another PrimaryPackaging
    if packaging.code and packaging.code != db_packaging.code:
        existing_packaging = db.query(PrimaryPackaging).filter(PrimaryPackaging.code == packaging.code).first()
        if existing_packaging:
            raise HTTPException(status_code=400, detail="PrimaryPackaging with this code already exists")
    
    update_data = packaging.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_packaging, field, value)
    
    db.commit()
    db.refresh(db_packaging)
    return db_packaging

@router.delete("/{packaging_id}")
def delete_primary_packaging(packaging_id: int, db: Session = Depends(get_db)):
    db_packaging = db.query(PrimaryPackaging).filter(PrimaryPackaging.id == packaging_id).first()
    if not db_packaging:
        raise HTTPException(status_code=404, detail="PrimaryPackaging not found")
    
    db.delete(db_packaging)
    db.commit()
    return {"message": "PrimaryPackaging deleted successfully"}

