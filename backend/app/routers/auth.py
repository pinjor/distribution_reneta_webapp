from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.auth import authenticate_user, create_access_token, get_password_hash, verify_token
from app.models import Employee
from app.schemas import LoginRequest, SignupRequest, Token, UserResponse
import os

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Token duration based on remember_me
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated user from token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception
    
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    
    user = db.query(Employee).filter(Employee.email == email).first()
    if user is None:
        raise credentials_exception
    
    return user

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint"""
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Set token expiration based on remember_me
    if login_data.remember_me:
        expires_delta = timedelta(days=30)  # 30 days
    else:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)  # 1 hour default
    
    access_token = create_access_token(
        data={"sub": user.email, "id": user.id}, 
        expires_delta=expires_delta
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "employee_id": user.employee_id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "department": user.department,
        }
    }

@router.post("/signup", response_model=UserResponse)
async def signup(signup_data: SignupRequest, db: Session = Depends(get_db)):
    """Signup endpoint"""
    # Check if email already exists
    existing_user = db.query(Employee).filter(Employee.email == signup_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if employee_id already exists
    existing_emp = db.query(Employee).filter(Employee.employee_id == signup_data.employee_id).first()
    if existing_emp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists"
        )
    
    # Create new employee
    hashed_password = get_password_hash(signup_data.password)
    new_employee = Employee(
        employee_id=signup_data.employee_id,
        first_name=signup_data.first_name,
        last_name=signup_data.last_name,
        email=signup_data.email,
        phone=signup_data.phone,
        hashed_password=hashed_password,
        department=signup_data.department,
        designation=signup_data.designation,
        depot_id=signup_data.depot_id,
        role="user",
        is_active=True
    )
    
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    
    return new_employee

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: Employee = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.post("/refresh")
async def refresh_token(token: str = Depends(oauth2_scheme)):
    """Refresh access token"""
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Create new token
    expires_delta = timedelta(days=30)
    access_token = create_access_token(
        data={"sub": payload.get("sub"), "id": payload.get("id")}, 
        expires_delta=expires_delta
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

