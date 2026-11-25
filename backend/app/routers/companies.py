from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.database import get_db
from app.models import Company, Depot
from app.schemas import CompanyCreate, CompanyUpdate, Company as CompanySchema

router = APIRouter()
WRITE_ROLES = require_role("admin", "manager")


def _code_taken(db: Session, code: str, exclude_id: Optional[int] = None) -> bool:
    query = db.query(Company).filter(Company.code == code)
    if exclude_id is not None:
        query = query.filter(Company.id != exclude_id)
    return query.first() is not None


@router.get("/", response_model=List[CompanySchema])
def get_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Company).offset(skip).limit(limit).all()


@router.get("/{company_id}", response_model=CompanySchema)
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.post("/", response_model=CompanySchema, status_code=status.HTTP_201_CREATED)
def create_company(
    company: CompanyCreate,
    db: Session = Depends(get_db),
    _user=Depends(WRITE_ROLES),
):
    if _code_taken(db, company.code):
        raise HTTPException(status_code=400, detail="Company with this code already exists")
    db_company = Company(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


@router.put("/{company_id}", response_model=CompanySchema)
def update_company(
    company_id: int,
    company: CompanyUpdate,
    db: Session = Depends(get_db),
    _user=Depends(WRITE_ROLES),
):
    db_company = db.query(Company).filter(Company.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    updates = company.model_dump(exclude_unset=True)
    if updates.get("code") and _code_taken(db, updates["code"], exclude_id=company_id):
        raise HTTPException(status_code=400, detail="Company with this code already exists")
    for key, value in updates.items():
        setattr(db_company, key, value)
    db_company.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_company)
    return db_company


@router.delete("/{company_id}")
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    _user=Depends(WRITE_ROLES),
):
    db_company = db.query(Company).filter(Company.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    if db.query(Depot).filter(Depot.company_id == company_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete company: it is referenced by depots",
        )
    db.delete(db_company)
    db.commit()
    return {"message": "Company deleted successfully"}
