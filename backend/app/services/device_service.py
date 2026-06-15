"""DEX device binding backend support."""
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Employee
from app.models_platform import DeviceLoginAttempt, DeviceStatusEnum, MobileDevice
from app.services.audit_service import AuditService


class DeviceService:
    @staticmethod
    def register_device(
        db: Session,
        user: Employee,
        device_id: str,
        *,
        imei: Optional[str] = None,
        device_name: Optional[str] = None,
        platform: Optional[str] = None,
        app_version: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> MobileDevice:
        # One active device per user — block second device
        active = db.query(MobileDevice).filter(
            MobileDevice.user_id == user.id,
            MobileDevice.status == DeviceStatusEnum.ACTIVE,
            MobileDevice.device_id != device_id,
        ).first()
        if active:
            db.add(DeviceLoginAttempt(
                user_id=user.id, device_id=device_id,
                attempt_status="BLOCKED_SECOND_DEVICE", ip_address=ip_address,
            ))
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User already has an active device registered. Contact HQ for device change.",
            )

        existing = db.query(MobileDevice).filter(
            MobileDevice.user_id == user.id,
            MobileDevice.device_id == device_id,
        ).first()
        if existing:
            if existing.status == DeviceStatusEnum.BLOCKED:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Device is blocked")
            existing.last_seen_at = datetime.utcnow()
            existing.app_version = app_version or existing.app_version
            db.commit()
            return existing

        device = MobileDevice(
            user_id=user.id,
            device_id=device_id,
            imei_or_hardware_id=imei,
            device_name=device_name,
            platform=platform,
            app_version=app_version,
            status=DeviceStatusEnum.ACTIVE,
            last_seen_at=datetime.utcnow(),
        )
        db.add(device)
        AuditService.log_create(db, "mobile_device", device_id, {"user_id": user.id}, user)
        db.commit()
        db.refresh(device)
        return device

    @staticmethod
    def verify_device(db: Session, user: Employee, device_id: str, ip_address: Optional[str] = None) -> MobileDevice:
        device = db.query(MobileDevice).filter(
            MobileDevice.user_id == user.id,
            MobileDevice.device_id == device_id,
        ).first()
        if not device:
            db.add(DeviceLoginAttempt(
                user_id=user.id, device_id=device_id,
                attempt_status="UNREGISTERED", ip_address=ip_address,
            ))
            db.commit()
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Device not registered")
        if device.status == DeviceStatusEnum.BLOCKED:
            db.add(DeviceLoginAttempt(
                user_id=user.id, device_id=device_id,
                attempt_status="BLOCKED", ip_address=ip_address,
            ))
            db.commit()
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Device is blocked")
        device.last_seen_at = datetime.utcnow()
        db.commit()
        return device

    @staticmethod
    def block_device(db: Session, device_id: int, admin: Employee, reason: str) -> MobileDevice:
        device = db.query(MobileDevice).filter(MobileDevice.id == device_id).first()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        device.status = DeviceStatusEnum.BLOCKED
        device.blocked_at = datetime.utcnow()
        device.blocked_by = admin.id
        device.block_reason = reason
        AuditService.log_action(
            db, entity_type="mobile_device", entity_id=str(device.id),
            action="BLOCK", user=admin, reason=reason,
        )
        db.commit()
        db.refresh(device)
        return device

    @staticmethod
    def unblock_device(db: Session, device_id: int, admin: Employee) -> MobileDevice:
        device = db.query(MobileDevice).filter(MobileDevice.id == device_id).first()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        device.status = DeviceStatusEnum.ACTIVE
        device.blocked_at = None
        device.blocked_by = None
        device.block_reason = None
        AuditService.log_action(
            db, entity_type="mobile_device", entity_id=str(device.id),
            action="UNBLOCK", user=admin,
        )
        db.commit()
        db.refresh(device)
        return device
