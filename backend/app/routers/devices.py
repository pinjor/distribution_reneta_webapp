"""DEX device binding API."""
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_client_ip, require_auth, require_permission
from app.database import get_db
from app.models import Employee
from app.models_platform import DeviceLoginAttempt, MobileDevice
from app.services.device_service import DeviceService

router = APIRouter()


class DeviceRegisterRequest(BaseModel):
    device_id: str
    imei_or_hardware_id: Optional[str] = None
    device_name: Optional[str] = None
    platform: Optional[str] = None
    app_version: Optional[str] = None


class DeviceBlockRequest(BaseModel):
    reason: str


@router.post("/register")
def register_device(
    payload: DeviceRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    return DeviceService.register_device(
        db, user, payload.device_id,
        imei=payload.imei_or_hardware_id,
        device_name=payload.device_name,
        platform=payload.platform,
        app_version=payload.app_version,
        ip_address=get_client_ip(request),
    )


@router.post("/verify")
def verify_device(
    payload: DeviceRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    return DeviceService.verify_device(db, user, payload.device_id, ip_address=get_client_ip(request))


@router.post("/{device_id}/block")
def block_device(
    device_id: int,
    payload: DeviceBlockRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("devices.manage")),
):
    return DeviceService.block_device(db, device_id, user, payload.reason)


@router.post("/{device_id}/unblock")
def unblock_device(
    device_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("devices.manage")),
):
    return DeviceService.unblock_device(db, device_id, user)


@router.get("")
def list_devices(
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("devices.read")),
):
    q = db.query(MobileDevice)
    if (user.role or "").lower() != "admin":
        q = q.filter(MobileDevice.user_id == user.id)
    return q.order_by(MobileDevice.registered_at.desc()).all()


@router.get("/login-attempts")
def login_attempts(
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("devices.read")),
):
    return db.query(DeviceLoginAttempt).order_by(DeviceLoginAttempt.created_at.desc()).limit(200).all()
