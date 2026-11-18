from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Doctor
from app.schemas import DoctorCreate, DoctorUpdate, Doctor as DoctorSchema

router = APIRouter()


def generate_doctor_code(db: Session) -> str:
    existing = db.query(Doctor).filter(Doctor.code.like("DOC-%")).all()
    numbers = []
    for doctor in existing:
        try:
            numbers.append(int(doctor.code.split("-")[1]))
        except (ValueError, IndexError, AttributeError):
            continue
    new_num = (max(numbers) + 1) if numbers else 1
    code = f"DOC-{new_num:04d}"
    while db.query(Doctor).filter(Doctor.code == code).first():
        new_num += 1
        code = f"DOC-{new_num:04d}"
    return code


@router.get("/", response_model=List[DoctorSchema])
def get_doctors(skip: int = 0, limit: int = 100, include_inactive: bool = False, db: Session = Depends(get_db)):
    query = db.query(Doctor)
    if not include_inactive:
        query = query.filter(Doctor.is_active == True)
    return query.order_by(Doctor.name.asc(), Doctor.code.asc()).offset(skip).limit(limit).all()


@router.get("/{doctor_id}", response_model=DoctorSchema)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router.post("/", response_model=DoctorSchema)
def create_doctor(doctor: DoctorCreate, db: Session = Depends(get_db)):
    if not doctor.code:
        doctor.code = generate_doctor_code(db)
    existing = db.query(Doctor).filter(Doctor.code == doctor.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Doctor with this code already exists")
    db_doctor = Doctor(**doctor.model_dump())
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor


@router.put("/{doctor_id}", response_model=DoctorSchema)
def update_doctor(doctor_id: int, doctor: DoctorUpdate, db: Session = Depends(get_db)):
    db_doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    for field, value in doctor.model_dump(exclude_unset=True).items():
        setattr(db_doctor, field, value)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor


@router.delete("/{doctor_id}")
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)):
    db_doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    db.delete(db_doctor)
    db.commit()
    return {"message": "Doctor deleted successfully"}
