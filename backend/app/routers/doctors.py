from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.database import get_db
from app.models import Doctor
from app import schemas

router = APIRouter()
WRITE_ROLES = require_role("admin", "manager")


def generate_doctor_code(db: Session) -> str:
    existing = db.query(Doctor).filter(Doctor.code.like("DOC-%")).all()
    numbers = []
    for row in existing:
        try:
            numbers.append(int(row.code.split("-", 1)[1]))
        except (ValueError, IndexError, AttributeError):
            continue
    next_num = max(numbers) + 1 if numbers else 1
    code = f"DOC-{next_num:04d}"
    while db.query(Doctor).filter(Doctor.code == code).first():
        next_num += 1
        code = f"DOC-{next_num:04d}"
    return code


def _code_taken(db: Session, code: str, exclude_id: Optional[int] = None) -> bool:
    query = db.query(Doctor).filter(Doctor.code == code)
    if exclude_id is not None:
        query = query.filter(Doctor.id != exclude_id)
    return query.first() is not None


@router.get("", response_model=List[schemas.Doctor])
def list_doctors(
    skip: int = 0,
    limit: int = 200,
    q: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Doctor)
    if is_active is not None:
        query = query.filter(Doctor.is_active == is_active)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Doctor.name.ilike(like))
            | (Doctor.code.ilike(like))
            | (Doctor.specialization.ilike(like))
            | (Doctor.registration_number.ilike(like))
            | (Doctor.email.ilike(like))
            | (Doctor.city.ilike(like))
        )
    return query.order_by(Doctor.id).offset(skip).limit(limit).all()


@router.get("/{doctor_id}", response_model=schemas.Doctor)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router.post("", response_model=schemas.Doctor, status_code=status.HTTP_201_CREATED)
def create_doctor(
    payload: schemas.DoctorCreate,
    db: Session = Depends(get_db),
    _user=Depends(WRITE_ROLES),
):
    code = (payload.code or "").strip() or generate_doctor_code(db)
    if _code_taken(db, code):
        raise HTTPException(status_code=400, detail="Doctor with this code already exists")
    now = datetime.utcnow()
    data = payload.model_dump()
    data["code"] = code
    if data.get("is_active") is None:
        data["is_active"] = True
    data["created_at"] = now
    data["updated_at"] = now
    doctor = Doctor(**data)
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


@router.put("/{doctor_id}", response_model=schemas.Doctor)
def update_doctor(
    doctor_id: int,
    payload: schemas.DoctorUpdate,
    db: Session = Depends(get_db),
    _user=Depends(WRITE_ROLES),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    updates = payload.model_dump(exclude_unset=True)
    if "code" in updates and updates["code"]:
        if _code_taken(db, updates["code"], exclude_id=doctor_id):
            raise HTTPException(status_code=400, detail="Doctor with this code already exists")
    for field, value in updates.items():
        setattr(doctor, field, value)
    doctor.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(doctor)
    return doctor


@router.delete("/{doctor_id}")
def delete_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    _user=Depends(WRITE_ROLES),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    db.delete(doctor)
    db.commit()
    return {"message": "Doctor deleted successfully"}
