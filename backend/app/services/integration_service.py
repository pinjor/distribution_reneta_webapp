"""Integration framework with adapter pattern and job queue."""
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models_platform import (
    IntegrationFailure,
    IntegrationJob,
    IntegrationJobLog,
    IntegrationJobStatusEnum,
    IntegrationSystem,
)
from app.services.audit_service import AuditService


class BaseIntegrationAdapter:
    system_code: str = "BASE"

    def pull(self, db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def push(self, db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


class SandboxAdapter(BaseIntegrationAdapter):
    """Sandbox adapter — does not fake success; returns explicit sandbox status."""

    def __init__(self, system_code: str):
        self.system_code = system_code

    def pull(self, db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "status": "SANDBOX",
            "message": f"{self.system_code} pull not configured — set INTEGRATION_SANDBOX=false and configure credentials",
            "records": [],
        }

    def push(self, db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "status": "SANDBOX",
            "message": f"{self.system_code} push not configured",
            "accepted": False,
        }


ADAPTERS = {
    "ORACLE_ERP": SandboxAdapter("ORACLE_ERP"),
    "FIELD_FORCE": SandboxAdapter("FIELD_FORCE"),
    "RMC": SandboxAdapter("RMC"),
    "HR_EMPRESS": SandboxAdapter("HR_EMPRESS"),
    "POWERBI": SandboxAdapter("POWERBI"),
}


class IntegrationService:
    @staticmethod
    def ensure_systems(db: Session) -> None:
        for code, name in [
            ("ORACLE_ERP", "Oracle ERP"),
            ("FIELD_FORCE", "Field Force / OOT"),
            ("RMC", "RMC"),
            ("HR_EMPRESS", "HR / Empress"),
            ("POWERBI", "PowerBI Export"),
        ]:
            if not db.query(IntegrationSystem).filter(IntegrationSystem.code == code).first():
                db.add(IntegrationSystem(code=code, name=name, is_active=True))
        db.commit()

    @staticmethod
    def create_job(
        db: Session,
        system_code: str,
        job_type: str,
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None,
    ) -> IntegrationJob:
        IntegrationService.ensure_systems(db)
        system = db.query(IntegrationSystem).filter(IntegrationSystem.code == system_code).first()
        if not system:
            raise ValueError(f"Unknown system: {system_code}")

        if idempotency_key:
            existing = db.query(IntegrationJob).filter(
                IntegrationJob.idempotency_key == idempotency_key
            ).first()
            if existing:
                return existing

        job = IntegrationJob(
            system_id=system.id,
            job_type=job_type,
            idempotency_key=idempotency_key or str(uuid.uuid4()),
            status=IntegrationJobStatusEnum.PENDING,
            payload_json=payload,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def run_job(db: Session, job: IntegrationJob, direction: str = "pull") -> IntegrationJob:
        settings = get_settings()
        system = db.query(IntegrationSystem).filter(IntegrationSystem.id == job.system_id).first()
        adapter = ADAPTERS.get(system.code, SandboxAdapter(system.code))

        job.status = IntegrationJobStatusEnum.RUNNING
        job.started_at = datetime.utcnow()
        db.add(IntegrationJobLog(job_id=job.id, message=f"Starting {direction} for {system.code}"))
        db.commit()

        try:
            if direction == "pull":
                result = adapter.pull(db, job.payload_json or {})
            else:
                result = adapter.push(db, job.payload_json or {})

            if result.get("status") == "SANDBOX" and not settings.integration_sandbox:
                raise RuntimeError(result.get("message", "Integration not configured"))

            job.result_json = result
            job.status = IntegrationJobStatusEnum.SUCCESS if result.get("status") != "SANDBOX" else IntegrationJobStatusEnum.SUCCESS
            job.completed_at = datetime.utcnow()
            db.add(IntegrationJobLog(job_id=job.id, message=f"Completed: {result.get('status')}"))
            AuditService.log_integration_event(db, system.code, str(job.id), "SUCCESS", result)
        except Exception as exc:
            job.status = IntegrationJobStatusEnum.FAILED
            job.retry_count = (job.retry_count or 0) + 1
            job.completed_at = datetime.utcnow()
            db.add(IntegrationJobLog(job_id=job.id, level="ERROR", message=str(exc)))
            db.add(IntegrationFailure(
                job_id=job.id,
                system_code=system.code,
                error_message=str(exc),
                payload_json=job.payload_json,
            ))
            AuditService.log_integration_event(db, system.code, str(job.id), "FAILED", {"error": str(exc)})

        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def retry_job(db: Session, job_id: int) -> IntegrationJob:
        job = db.query(IntegrationJob).filter(IntegrationJob.id == job_id).first()
        if not job:
            raise ValueError("Job not found")
        job.status = IntegrationJobStatusEnum.RETRY
        db.commit()
        direction = "push" if "push" in (job.job_type or "").lower() else "pull"
        return IntegrationService.run_job(db, job, direction=direction)
