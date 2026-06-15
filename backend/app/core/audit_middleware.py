"""HTTP middleware: audit all successful mutating API requests."""
import logging
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.auth import verify_token
from app.core.deps import get_client_ip
from app.database import SessionLocal
from app.models import Employee
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

SKIP_EXACT = {"/", "/health", "/api/docs", "/api/openapi.json", "/docs", "/redoc"}
SKIP_PREFIXES = ("/api/auth/login", "/api/auth/signup", "/api/auth/refresh")


def _parse_user_id(request: Request, db) -> tuple[Optional[Employee], Optional[str]]:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, None
    token = auth[7:]
    payload = verify_token(token)
    if not payload:
        return None, None
    email = payload.get("sub")
    if not email:
        return None, None
    user = db.query(Employee).filter(Employee.email == email).first()
    device_id = request.headers.get("X-Device-Id")
    return user, device_id


def _entity_from_path(path: str) -> tuple[str, str]:
    parts = [p for p in path.split("/") if p and p != "api"]
    if not parts:
        return "http", path
    entity_type = parts[0].replace("-", "_")
    entity_id = parts[1] if len(parts) > 1 and not parts[1].startswith("?") else path
    return entity_type, str(entity_id)


class AuditWriteMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
            return await call_next(request)

        path = request.url.path.rstrip("/") or "/"
        if path in SKIP_EXACT:
            return await call_next(request)
        if any(path == prefix or path.startswith(prefix + "/") for prefix in SKIP_PREFIXES):
            return await call_next(request)
        if not path.startswith("/api"):
            return await call_next(request)

        response = await call_next(request)

        if response.status_code < 200 or response.status_code >= 300:
            return response

        db = SessionLocal()
        try:
            user, device_id = _parse_user_id(request, db)
            entity_type, entity_id = _entity_from_path(path)
            action = f"HTTP_{request.method}"
            AuditService.log_action(
                db,
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                user=user,
                new_value={
                    "path": path,
                    "method": request.method,
                    "status_code": response.status_code,
                    "query": str(request.url.query) if request.url.query else None,
                },
                ip_address=get_client_ip(request),
                user_agent=request.headers.get("User-Agent"),
                device_id=device_id,
            )
            db.commit()
        except Exception as exc:
            logger.warning("Audit middleware failed for %s: %s", path, exc)
            db.rollback()
        finally:
            db.close()

        return response
