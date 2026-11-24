from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Employee
from app.schemas import EmployeeCreate, Employee as EmployeeSchema, EmployeeUpdate
from app.core.deps import require_auth, require_permission
from app.core.depot_scope import apply_depot_id_filter, assign_depot_for_write, hide_foreign_depot

router = APIRouter()

@router.get("/", response_model=List[EmployeeSchema])
def get_employees(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    query = apply_depot_id_filter(db.query(Employee), user, Employee.depot_id)
    employees = query.offset(skip).limit(limit).all()
    return employees

@router.get("/{employee_id}", response_model=EmployeeSchema)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    hide_foreign_depot(user, employee.depot_id)
    return employee

@router.post("/", response_model=EmployeeSchema)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("admin.users")),
):
    payload = employee.model_dump()
    payload["depot_id"] = assign_depot_for_write(user, payload.get("depot_id"))
    db_employee = Employee(**payload)
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

@router.put("/{employee_id}", response_model=EmployeeSchema)
def update_employee(
    employee_id: int,
    employee: EmployeeUpdate,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("admin.users")),
):
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    hide_foreign_depot(user, db_employee.depot_id)

    update_data = employee.model_dump(exclude_unset=True)
    if "depot_id" in update_data:
        update_data["depot_id"] = assign_depot_for_write(user, update_data.get("depot_id"))
    for field, value in update_data.items():
        setattr(db_employee, field, value)
    
    db.commit()
    db.refresh(db_employee)
    return db_employee

@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("admin.users")),
):
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    hide_foreign_depot(user, db_employee.depot_id)
    
    db.delete(db_employee)
    db.commit()
    return {"message": "Employee deleted successfully"}
