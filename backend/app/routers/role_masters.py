from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import RoleMaster, Employee, RoleTypeEnum
from app.schemas import (
    RoleMasterCreate, RoleMasterUpdate, RoleMaster as RoleMasterSchema,
    RoleHierarchyResponse
)

router = APIRouter()

def generate_role_master_code(db: Session) -> str:
    """Generate a unique RoleMaster code in format RM-XXXX"""
    existing_roles = db.query(RoleMaster).filter(
        RoleMaster.code.like("RM-%")
    ).all()
    
    if existing_roles:
        code_numbers = []
        for role in existing_roles:
            if role.code:
                try:
                    num = int(role.code.split("-")[1])
                    code_numbers.append(num)
                except (ValueError, IndexError):
                    continue
        
        if code_numbers:
            new_num = max(code_numbers) + 1
        else:
            new_num = 1
    else:
        new_num = 1
    
    code = f"RM-{new_num:04d}"
    
    while db.query(RoleMaster).filter(RoleMaster.code == code).first():
        new_num += 1
        code = f"RM-{new_num:04d}"
    
    return code

def validate_hierarchy(role_type: RoleTypeEnum, parent_id: Optional[int], db: Session) -> bool:
    """Validate parent-child relationship"""
    if role_type == RoleTypeEnum.NSH:
        # NSH cannot have parent
        if parent_id is not None:
            raise HTTPException(
                status_code=400,
                detail="NSH (National Sales Head) cannot have a parent role"
            )
        return True
    
    if parent_id is None:
        raise HTTPException(
            status_code=400,
            detail=f"{role_type.value} must have a parent role"
        )
    
    parent = db.query(RoleMaster).filter(RoleMaster.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent role not found")
    
    # Validate parent-child relationship
    valid_parents = {
        RoleTypeEnum.TSM: [RoleTypeEnum.NSH],
        RoleTypeEnum.RSM: [RoleTypeEnum.TSM],
        RoleTypeEnum.DSM: [RoleTypeEnum.RSM],
        RoleTypeEnum.SM: [RoleTypeEnum.DSM],
        RoleTypeEnum.SO: [RoleTypeEnum.SM],
    }
    
    if parent.role_type not in valid_parents.get(role_type, []):
        raise HTTPException(
            status_code=400,
            detail=f"{role_type.value} can only have parent of type {[p.value for p in valid_parents[role_type]]}"
        )
    
    return True

def get_path_to_nsh(role_id: int, db: Session) -> List[RoleMaster]:
    """Get path from current role to NSH (upward traversal)"""
    path = []
    current = db.query(RoleMaster).filter(RoleMaster.id == role_id).first()
    
    if not current:
        return path
    
    visited = set()  # Prevent circular references
    
    while current:
        if current.id in visited:
            break  # Circular reference detected
        visited.add(current.id)
        
        path.append(current)
        
        if current.role_type == RoleTypeEnum.NSH:
            break
        
        if current.parent_id:
            current = db.query(RoleMaster).filter(RoleMaster.id == current.parent_id).first()
        else:
            break
    
    return path

def get_all_subordinates(role_id: int, db: Session) -> List[RoleMaster]:
    """Get all subordinate roles recursively (downward traversal)"""
    subordinates = []
    visited = set()  # Prevent circular references
    
    def get_children(parent_id: int):
        if parent_id in visited:
            return  # Circular reference detected
        visited.add(parent_id)
        
        children = db.query(RoleMaster).filter(
            RoleMaster.parent_id == parent_id,
            RoleMaster.is_active == True
        ).all()
        
        for child in children:
            subordinates.append(child)
            get_children(child.id)  # Recursive call
    
    get_children(role_id)
    return subordinates

def serialize_role_master(role: RoleMaster) -> dict:
    """Helper function to properly serialize RoleMaster model to dict"""
    return {
        "id": role.id,
        "code": role.code,
        "role_type": role.role_type,
        "name": role.name,
        "parent_id": role.parent_id,
        "employee_id": role.employee_id,
        "territory": role.territory,
        "region": role.region,
        "district": role.district,
        "area": role.area,
        "description": role.description,
        "is_active": role.is_active,
        "created_at": role.created_at,
        "updated_at": role.updated_at,
        "parent_name": role.parent.name if role.parent else None,
        "employee_name": role.assigned_employee.first_name + " " + (role.assigned_employee.last_name or "") if role.assigned_employee else None
    }

@router.get("/", response_model=List[RoleMasterSchema])
def get_role_masters(
    skip: int = 0,
    limit: int = 100,
    role_type: Optional[RoleTypeEnum] = None,
    db: Session = Depends(get_db)
):
    """Get all role masters with optional filtering"""
    query = db.query(RoleMaster).filter(RoleMaster.is_active == True)
    
    if role_type:
        query = query.filter(RoleMaster.role_type == role_type)
    
    roles = query.offset(skip).limit(limit).all()
    
    # Enrich with parent and employee names
    result = []
    for role in roles:
        role_data = {
            "id": role.id,
            "code": role.code,
            "role_type": role.role_type,
            "name": role.name,
            "parent_id": role.parent_id,
            "employee_id": role.employee_id,
            "territory": role.territory,
            "region": role.region,
            "district": role.district,
            "area": role.area,
            "description": role.description,
            "is_active": role.is_active,
            "created_at": role.created_at,
            "updated_at": role.updated_at,
            "parent_name": role.parent.name if role.parent else None,
            "employee_name": role.assigned_employee.first_name + " " + (role.assigned_employee.last_name or "") if role.assigned_employee else None
        }
        result.append(RoleMasterSchema(**role_data))
    
    return result

@router.get("/{role_id}", response_model=RoleMasterSchema)
def get_role_master(role_id: int, db: Session = Depends(get_db)):
    """Get single role master"""
    role = db.query(RoleMaster).filter(RoleMaster.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role master not found")
    
    role_data = serialize_role_master(role)
    return RoleMasterSchema(**role_data)

@router.post("/", response_model=RoleMasterSchema)
def create_role_master(role: RoleMasterCreate, db: Session = Depends(get_db)):
    """Create new role master"""
    # Auto-generate code if not provided
    if not role.code:
        role.code = generate_role_master_code(db)
    
    # Check if code already exists
    existing_role = db.query(RoleMaster).filter(RoleMaster.code == role.code).first()
    if existing_role:
        raise HTTPException(status_code=400, detail="Role master with this code already exists")
    
    # Validate hierarchy
    validate_hierarchy(role.role_type, role.parent_id, db)
    
    # Verify employee exists if provided
    if role.employee_id:
        employee = db.query(Employee).filter(Employee.id == role.employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
    
    db_role = RoleMaster(**role.model_dump())
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    
    # Update employee's role_master_id if employee is assigned
    if role.employee_id:
        employee = db.query(Employee).filter(Employee.id == role.employee_id).first()
        if employee:
            employee.role_master_id = db_role.id
            db.commit()
    
    role_data = serialize_role_master(db_role)
    return RoleMasterSchema(**role_data)

@router.put("/{role_id}", response_model=RoleMasterSchema)
def update_role_master(role_id: int, role: RoleMasterUpdate, db: Session = Depends(get_db)):
    """Update role master"""
    db_role = db.query(RoleMaster).filter(RoleMaster.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="Role master not found")
    
    # Prevent circular reference
    if role.parent_id == role_id:
        raise HTTPException(status_code=400, detail="Cannot assign role as its own parent")
    
    # Check if trying to assign a descendant as parent
    if role.parent_id:
        descendants = get_all_subordinates(role_id, db)
        descendant_ids = [d.id for d in descendants]
        if role.parent_id in descendant_ids:
            raise HTTPException(status_code=400, detail="Cannot assign a descendant as parent")
    
    # Validate hierarchy
    validate_hierarchy(role.role_type, role.parent_id, db)
    
    # Check if code conflicts with another role
    if role.code and role.code != db_role.code:
        existing_role = db.query(RoleMaster).filter(RoleMaster.code == role.code).first()
        if existing_role:
            raise HTTPException(status_code=400, detail="Role master with this code already exists")
    
    # Verify employee exists if provided
    if role.employee_id and role.employee_id != db_role.employee_id:
        employee = db.query(Employee).filter(Employee.id == role.employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update old employee's role_master_id if employee changed
    if db_role.employee_id and db_role.employee_id != role.employee_id:
        old_employee = db.query(Employee).filter(Employee.id == db_role.employee_id).first()
        if old_employee:
            old_employee.role_master_id = None
            db.commit()
    
    # Update role
    update_data = role.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_role, field, value)
    
    db.commit()
    db.refresh(db_role)
    
    # Update new employee's role_master_id
    if role.employee_id:
        employee = db.query(Employee).filter(Employee.id == role.employee_id).first()
        if employee:
            employee.role_master_id = db_role.id
            db.commit()
    
    role_data = serialize_role_master(db_role)
    return RoleMasterSchema(**role_data)

@router.delete("/{role_id}")
def delete_role_master(role_id: int, db: Session = Depends(get_db)):
    """Delete role master"""
    db_role = db.query(RoleMaster).filter(RoleMaster.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="Role master not found")
    
    # Check if role has children
    children = db.query(RoleMaster).filter(RoleMaster.parent_id == role_id).first()
    if children:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete role master that has subordinate roles. Please reassign or delete subordinates first."
        )
    
    # Unassign employee
    if db_role.employee_id:
        employee = db.query(Employee).filter(Employee.id == db_role.employee_id).first()
        if employee:
            employee.role_master_id = None
            db.commit()
    
    db.delete(db_role)
    db.commit()
    return {"message": "Role master deleted successfully"}

@router.get("/{role_id}/hierarchy", response_model=RoleHierarchyResponse)
def get_role_hierarchy(role_id: int, db: Session = Depends(get_db)):
    """Get full hierarchy for a role (path to NSH and all subordinates)"""
    role = db.query(RoleMaster).filter(RoleMaster.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role master not found")
    
    path_to_root = get_path_to_nsh(role_id, db)
    subordinates = get_all_subordinates(role_id, db)
    
    # Convert to schema format
    role_data = serialize_role_master(role)
    
    path_schemas = []
    for r in path_to_root:
        r_data = serialize_role_master(r)
        path_schemas.append(RoleMasterSchema(**r_data))
    
    sub_schemas = []
    for r in subordinates:
        r_data = serialize_role_master(r)
        sub_schemas.append(RoleMasterSchema(**r_data))
    
    return RoleHierarchyResponse(
        current_role=RoleMasterSchema(**role_data),
        path_to_root=path_schemas,
        subordinates=sub_schemas
    )

@router.get("/{role_id}/path-to-nsh", response_model=List[RoleMasterSchema])
def get_path_to_nsh_endpoint(role_id: int, db: Session = Depends(get_db)):
    """Get path from role to NSH"""
    path = get_path_to_nsh(role_id, db)
    
    result = []
    for role in path:
        role_data = serialize_role_master(role)
        result.append(RoleMasterSchema(**role_data))
    
    return result

@router.get("/{role_id}/subordinates", response_model=List[RoleMasterSchema])
def get_subordinates(role_id: int, db: Session = Depends(get_db)):
    """Get all subordinate roles"""
    subordinates = get_all_subordinates(role_id, db)
    
    result = []
    for role in subordinates:
        role_data = serialize_role_master(role)
        result.append(RoleMasterSchema(**role_data))
    
    return result

@router.get("/by-employee/{employee_id}", response_model=RoleMasterSchema)
def get_role_by_employee(employee_id: int, db: Session = Depends(get_db)):
    """Get role assigned to an employee"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if not employee.role_master_id:
        raise HTTPException(status_code=404, detail="Employee has no assigned role")
    
    role = db.query(RoleMaster).filter(RoleMaster.id == employee.role_master_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role master not found")
    
    role_data = serialize_role_master(role)
    return RoleMasterSchema(**role_data)

@router.get("/by-type/{role_type}", response_model=List[RoleMasterSchema])
def get_roles_by_type(role_type: RoleTypeEnum, db: Session = Depends(get_db)):
    """Get all roles by type"""
    roles = db.query(RoleMaster).filter(
        RoleMaster.role_type == role_type,
        RoleMaster.is_active == True
    ).all()
    
    result = []
    for role in roles:
        role_data = serialize_role_master(role)
        result.append(RoleMasterSchema(**role_data))
    
    return result

