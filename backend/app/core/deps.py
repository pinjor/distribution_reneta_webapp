"""FastAPI security dependencies: auth, RBAC, depot access."""
from typing import Callable, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth import verify_token
from app.core.config import get_settings
from app.core.permissions import permissions_for_role
from app.database import get_db
from app.models import Employee

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    auto_error=False,
)


def _credentials_exception(detail: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _forbidden_exception(detail: str = "Insufficient permissions") -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[Employee]:
    if not token:
        return None
    payload = verify_token(token)
    if payload is None:
        return None
    email = payload.get("sub")
    if not email:
        return None
    return db.query(Employee).filter(Employee.email == email).first()


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Employee:
    settings = get_settings()
    if not settings.require_auth:
        # Dev bypass: return first admin or any active user
        user = db.query(Employee).filter(Employee.is_active == True).first()
        if user:
            return user
    if not token:
        raise _credentials_exception("Authentication required")
    payload = verify_token(token)
    if payload is None:
        raise _credentials_exception()
    email = payload.get("sub")
    if not email:
        raise _credentials_exception()
    user = db.query(Employee).filter(Employee.email == email).first()
    if user is None:
        raise _credentials_exception("User not found")
    return user


async def require_auth(user: Employee = Depends(get_current_user)) -> Employee:
    """Authenticated, active, non-blocked user."""
    if not user.is_active:
        raise _forbidden_exception("User account is inactive")
    if getattr(user, "is_blocked", False):
        raise _forbidden_exception("User account is blocked")
    return user


def require_role(*roles: str) -> Callable:
    allowed = {r.lower() for r in roles}

    async def _checker(user: Employee = Depends(require_auth)) -> Employee:
        role = (user.role or "user").lower()
        if role == "admin" or role in allowed:
            return user
        raise _forbidden_exception(f"Role '{user.role}' not allowed")

    return _checker


def require_permission(permission_code: str) -> Callable:
    async def _checker(user: Employee = Depends(require_auth)) -> Employee:
        perms = permissions_for_role(user.role or "user")
        if permission_code not in perms:
            raise _forbidden_exception(f"Missing permission: {permission_code}")
        return user

    return _checker


def require_any_permission(*permission_codes: str) -> Callable:
    codes = set(permission_codes)

    async def _checker(user: Employee = Depends(require_auth)) -> Employee:
        perms = permissions_for_role(user.role or "user")
        if not codes.intersection(perms):
            raise _forbidden_exception(f"Missing one of permissions: {', '.join(codes)}")
        return user

    return _checker


def require_depot_access(depot_id: Optional[int]) -> Callable:
    """Factory for depot-scoped endpoints that receive depot_id."""

    async def _checker(user: Employee = Depends(require_auth)) -> Employee:
        if (user.role or "").lower() == "admin":
            return user
        if depot_id is not None and user.depot_id is not None and user.depot_id != depot_id:
            raise _forbidden_exception("Access denied for this depot")
        return user

    return _checker


def get_client_ip(request: Request) -> Optional[str]:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def get_user_agent(request: Request) -> Optional[str]:
    return request.headers.get("User-Agent")
