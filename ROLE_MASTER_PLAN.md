# Role Master Setup - Implementation Plan

## 1. Database Structure

### 1.1 Role Master Table (`role_masters`)
This table will store the hierarchical role structure.

**Fields:**
- `id` (Primary Key)
- `code` (Unique, Auto-generated: RM-0001, RM-0002, etc.)
- `role_type` (Enum: NSH, TSM, RSM, DSM, SM, SO)
- `name` (e.g., "North Zone Sales Head", "Mumbai Territory Manager")
- `parent_id` (Foreign Key to `role_masters.id`, nullable for NSH)
- `employee_id` (Foreign Key to `employees.id`, nullable - assigned employee)
- `territory` (VARCHAR, optional - for TSM)
- `region` (VARCHAR, optional - for RSM)
- `district` (VARCHAR, optional - for DSM)
- `area` (VARCHAR, optional - for SM)
- `description` (TEXT, optional)
- `is_active` (BOOLEAN, default TRUE)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Self-Referential Relationship:**
- `parent_id` → `role_masters.id` (allows hierarchical structure)
- NSH has `parent_id = NULL`
- Each level has `parent_id` pointing to its immediate superior

**Example Data Structure:**
```
NSH-001 (National Sales Head)
  └─ TSM-001 (Mumbai Territory)
      └─ RSM-001 (Mumbai Region)
          └─ DSM-001 (Mumbai District)
              └─ SM-001 (Mumbai Area 1)
                  └─ SO-001 (Sales Officer 1)
                  └─ SO-002 (Sales Officer 2)
```

### 1.2 Employee Table Modification
Add field to `employees` table:
- `role_master_id` (Foreign Key to `role_masters.id`, nullable)
- This links an employee to their role in the hierarchy

## 2. Backend Implementation

### 2.1 Models (`backend/app/models.py`)

```python
class RoleTypeEnum(str, Enum):
    NSH = "NSH"  # National Sales Head
    TSM = "TSM"  # Territory Sales Manager
    RSM = "RSM"  # Regional Sales Manager
    DSM = "DSM"  # District Sales Manager
    SM = "SM"    # Sales Manager
    SO = "SO"    # Sales Officer

class RoleMaster(Base):
    __tablename__ = "role_masters"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    role_type = Column(Enum(RoleTypeEnum), nullable=False)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("role_masters.id"), nullable=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    territory = Column(String(100))
    region = Column(String(100))
    district = Column(String(100))
    area = Column(String(100))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Self-referential relationship
    parent = relationship("RoleMaster", remote_side=[id], backref="children")
    
    # Employee relationship
    employee = relationship("Employee")
```

### 2.2 Schemas (`backend/app/schemas.py`)

```python
class RoleMasterBase(BaseModel):
    code: str
    role_type: RoleTypeEnum
    name: str
    parent_id: Optional[int] = None
    employee_id: Optional[int] = None
    territory: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    area: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

class RoleMasterCreate(RoleMasterBase):
    pass

class RoleMasterUpdate(RoleMasterBase):
    pass

class RoleMaster(RoleMasterBase):
    id: int
    parent_name: Optional[str] = None  # For display
    employee_name: Optional[str] = None  # For display
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class RoleHierarchyResponse(BaseModel):
    """Response model for hierarchy traversal"""
    current_role: RoleMaster
    path_to_root: List[RoleMaster]  # From current to NSH
    subordinates: List[RoleMaster]  # Direct children
```

### 2.3 API Router (`backend/app/routers/role_masters.py`)

**Endpoints:**
1. `GET /api/role-masters/` - Get all roles
2. `GET /api/role-masters/{id}` - Get single role
3. `POST /api/role-masters/` - Create role
4. `PUT /api/role-masters/{id}` - Update role
5. `DELETE /api/role-masters/{id}` - Delete role
6. `GET /api/role-masters/{id}/hierarchy` - Get full hierarchy (up and down)
7. `GET /api/role-masters/{id}/path-to-nsh` - Get path from role to NSH
8. `GET /api/role-masters/{id}/subordinates` - Get all subordinates
9. `GET /api/role-masters/by-employee/{employee_id}` - Get role by employee
10. `GET /api/role-masters/by-type/{role_type}` - Get all roles by type

**Key Functions:**
- `get_path_to_nsh(role_id)` - Traverse up to NSH
- `get_all_subordinates(role_id)` - Get all subordinates (recursive)
- `validate_hierarchy(role_type, parent_id)` - Ensure valid parent-child relationship
- `get_role_by_employee(employee_id)` - Get role assigned to employee

## 3. Frontend Implementation

### 3.1 Role Master Setup Page (`src/pages/settings/RoleMaster.tsx`)

**Form Fields:**
- Code (auto-generated, read-only)
- Role Type (dropdown: NSH, TSM, RSM, DSM, SM, SO)
- Name (text input)
- Parent Role (dropdown - filtered by role type hierarchy)
  - If NSH: No parent (disabled)
  - If TSM: Only NSH roles shown
  - If RSM: Only TSM roles shown
  - If DSM: Only RSM roles shown
  - If SM: Only DSM roles shown
  - If SO: Only SM roles shown
- Assigned Employee (dropdown - all employees)
- Territory (text input - shown only for TSM)
- Region (text input - shown only for RSM)
- District (text input - shown only for DSM)
- Area (text input - shown only for SM)
- Description (textarea)

**List View:**
- Tree/Tabular view showing hierarchy
- Columns: Code, Role Type, Name, Parent, Employee, Status
- Expandable tree to show children
- Search and filter by role type

### 3.2 Hierarchy Visualization Component (`src/components/role/HierarchyTree.tsx`)

**Features:**
- Visual tree structure
- Expand/collapse nodes
- Click to view details
- Highlight path from selected role to NSH
- Show all subordinates

### 3.3 Employee Role Assignment

**In Employee Form:**
- Add "Role Assignment" dropdown
- Shows available roles matching employee's designation
- When assigned, links `employee.role_master_id`

## 4. Hierarchy Traversal Logic

### 4.1 Path to NSH (Upward Traversal)

```python
def get_path_to_nsh(role_id: int, db: Session) -> List[RoleMaster]:
    """
    Get path from current role to NSH (top of hierarchy)
    Returns: [Current Role, Parent, Grandparent, ..., NSH]
    """
    path = []
    current = db.query(RoleMaster).filter(RoleMaster.id == role_id).first()
    
    while current:
        path.append(current)
        if current.role_type == RoleTypeEnum.NSH:
            break
        if current.parent_id:
            current = db.query(RoleMaster).filter(RoleMaster.id == current.parent_id).first()
        else:
            break
    
    return path
```

### 4.2 Get All Subordinates (Downward Traversal)

```python
def get_all_subordinates(role_id: int, db: Session) -> List[RoleMaster]:
    """
    Get all subordinate roles recursively
    Returns: [Direct children, their children, etc.]
    """
    subordinates = []
    
    def get_children(parent_id: int):
        children = db.query(RoleMaster).filter(RoleMaster.parent_id == parent_id).all()
        for child in children:
            subordinates.append(child)
            get_children(child.id)  # Recursive call
    
    get_children(role_id)
    return subordinates
```

### 4.3 Get Direct Superior

```python
def get_direct_superior(role_id: int, db: Session) -> Optional[RoleMaster]:
    """
    Get immediate superior (parent)
    """
    role = db.query(RoleMaster).filter(RoleMaster.id == role_id).first()
    if role and role.parent_id:
        return db.query(RoleMaster).filter(RoleMaster.id == role.parent_id).first()
    return None
```

## 5. Employee-Role Connection

### 5.1 Employee Model Update

```python
class Employee(Base):
    # ... existing fields ...
    role_master_id = Column(Integer, ForeignKey("role_masters.id"), nullable=True)
    role_master = relationship("RoleMaster")
```

### 5.2 API Endpoints for Employee-Role Connection

1. **Get Employee's Role Hierarchy:**
   - `GET /api/employees/{id}/role-hierarchy`
   - Returns: Employee's role and path to NSH

2. **Get All Employees Under a Role:**
   - `GET /api/role-masters/{id}/employees`
   - Returns: All employees assigned to this role and all subordinate roles

3. **Assign Employee to Role:**
   - `PUT /api/employees/{id}/assign-role`
   - Body: `{ "role_master_id": 123 }`

## 6. Use Cases

### Use Case 1: Get TSM from SM
1. Get SM's role: `role_master` from employee
2. Traverse up: `get_path_to_nsh(role_id)`
3. Filter by `role_type == TSM`
4. Return TSM role

### Use Case 2: Get All SOs Under a TSM
1. Get TSM role
2. Get all subordinates: `get_all_subordinates(tsm_role_id)`
3. Filter by `role_type == SO`
4. Get employees assigned to those SO roles

### Use Case 3: Get Full Hierarchy for Employee
1. Get employee's role
2. Get path to NSH (upward)
3. Get all subordinates (downward)
4. Return complete hierarchy structure

## 7. Validation Rules

1. **Parent-Child Relationship:**
   - NSH can only be parent to TSM
   - TSM can only be parent to RSM
   - RSM can only be parent to DSM
   - DSM can only be parent to SM
   - SM can only be parent to SO
   - SO cannot have children

2. **Circular Reference Prevention:**
   - Cannot assign a role as its own parent
   - Cannot assign a descendant as parent

3. **Employee Assignment:**
   - One employee can be assigned to one role
   - One role can have one employee assigned
   - (Optional: Allow multiple employees per role if needed)

## 8. UI/UX Considerations

### 8.1 Role Master Form
- Dynamic form fields based on role type
- Parent dropdown filters based on selected role type
- Visual indicator of hierarchy level
- Validation messages for invalid parent selection

### 8.2 Hierarchy View
- Tree visualization
- Breadcrumb navigation
- Search functionality
- Filter by role type
- Export hierarchy structure

### 8.3 Employee Assignment
- Show available roles in dropdown
- Display role path when selecting
- Show current assignment
- Allow reassignment with confirmation

## 9. Database Indexes

```sql
CREATE INDEX idx_role_masters_parent_id ON role_masters(parent_id);
CREATE INDEX idx_role_masters_employee_id ON role_masters(employee_id);
CREATE INDEX idx_role_masters_role_type ON role_masters(role_type);
CREATE INDEX idx_employees_role_master_id ON employees(role_master_id);
```

## 10. Implementation Steps

1. **Phase 1: Database & Models**
   - Create `role_masters` table
   - Update `employees` table
   - Create models and schemas

2. **Phase 2: Backend API**
   - Create router with CRUD operations
   - Implement hierarchy traversal functions
   - Add validation logic

3. **Phase 3: Frontend Setup Page**
   - Create Role Master form
   - Implement list view with hierarchy
   - Add search and filter

4. **Phase 4: Employee Integration**
   - Update employee form
   - Add role assignment dropdown
   - Create hierarchy visualization

5. **Phase 5: Testing**
   - Test hierarchy traversal
   - Test employee-role assignment
   - Test validation rules

## 11. Future Enhancements

1. **Role History:** Track role changes over time
2. **Multiple Assignments:** Allow employees to have multiple roles
3. **Role Permissions:** Link roles to permissions/access rights
4. **Reporting Structure:** Generate org charts
5. **Bulk Assignment:** Assign multiple employees at once
6. **Role Templates:** Pre-defined role structures

