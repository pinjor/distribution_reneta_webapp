from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.auth import authenticate_user, create_access_token, get_password_hash, verify_token
from app.core.config import get_settings
from app.core.deps import get_client_ip, get_current_user, get_user_agent, require_auth
from app.models import Employee, Depot
from app.models_platform import LoginAudit
from app.schemas import LoginRequest, SignupRequest, Token, UserProfileResponse, UserResponse
from app.services.audit_service import AuditService

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def build_user_profile(user: Employee, db: Session) -> dict:
    depot_data = None
    if user.depot_id:
        depot = db.query(Depot).filter(Depot.id == user.depot_id).first()
        if depot:
            depot_data = {
                "id": depot.id,
                "name": depot.name,
                "code": depot.code,
                "address": depot.address,
                "city": depot.city,
                "state": depot.state,
                "phone": depot.phone,
                "email": depot.email,
            }
    return {
        "id": user.id,
        "employee_id": user.employee_id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "department": user.department,
        "designation": user.designation,
        "phone": user.phone,
        "depot_id": user.depot_id,
        "depot": depot_data,
    }


@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    user = authenticate_user(db, login_data.email, login_data.password)
    ip = get_client_ip(request)
    ua = get_user_agent(request)

    if not user:
        db.add(LoginAudit(
            email=login_data.email, success=False,
            failure_reason="invalid_credentials", ip_address=ip, user_agent=ua,
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        db.add(LoginAudit(user_id=user.id, email=user.email, success=False, failure_reason="inactive", ip_address=ip))
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    if getattr(user, "is_blocked", False):
        db.add(LoginAudit(user_id=user.id, email=user.email, success=False, failure_reason="blocked", ip_address=ip))
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is blocked")

    expires_delta = timedelta(days=30) if login_data.remember_me else timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(data={"sub": user.email, "id": user.id}, expires_delta=expires_delta)

    db.add(LoginAudit(user_id=user.id, email=user.email, success=True, ip_address=ip, user_agent=ua))
    AuditService.log_action(
        db, entity_type="user", entity_id=str(user.id), action="LOGIN",
        user=user, ip_address=ip, user_agent=ua,
    )
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": build_user_profile(user, db),
    }


@router.post("/signup", response_model=UserResponse)
async def signup(signup_data: SignupRequest, db: Session = Depends(get_db)):
    existing_user = db.query(Employee).filter(Employee.email == signup_data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    existing_emp = db.query(Employee).filter(Employee.employee_id == signup_data.employee_id).first()
    if existing_emp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee ID already exists")

    new_employee = Employee(
        employee_id=signup_data.employee_id,
        first_name=signup_data.first_name,
        last_name=signup_data.last_name,
        email=signup_data.email,
        phone=signup_data.phone,
        hashed_password=get_password_hash(signup_data.password),
        department=signup_data.department,
        designation=signup_data.designation,
        depot_id=signup_data.depot_id,
        role="user",
        is_active=True,
        is_blocked=False,
    )
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    return new_employee


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_info(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_user_profile(current_user, db)


@router.get("/permissions")
async def get_my_permissions(current_user: Employee = Depends(require_auth)):
    from app.core.permissions import permissions_for_role
    return {"role": current_user.role, "permissions": sorted(permissions_for_role(current_user.role or "user"))}


@router.post("/refresh")
async def refresh_token(current_user: Employee = Depends(get_current_user)):
    settings = get_settings()
    access_token = create_access_token(
        data={"sub": current_user.email, "id": current_user.id},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(request: Request, current_user: Employee = Depends(require_auth), db: Session = Depends(get_db)):
    AuditService.log_action(
        db, entity_type="user", entity_id=str(current_user.id), action="LOGOUT",
        user=current_user, ip_address=get_client_ip(request),
    )
    db.commit()
    return {"message": "Logged out"}
