"""Integration framework API."""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.database import get_db
from app.models import Employee
from app.models_platform import IntegrationFailure, IntegrationJob
from app.services.integration_service import IntegrationService

router = APIRouter()


class IntegrationRunRequest(BaseModel):
    payload: Dict[str, Any] = {}
    idempotency_key: Optional[str] = None


@router.post("/oracle/inventory/pull")
def oracle_inventory_pull(
    payload: IntegrationRunRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("integrations.write")),
):
    job = IntegrationService.create_job(db, "ORACLE_ERP", "inventory_pull", payload.payload, payload.idempotency_key)
    return IntegrationService.run_job(db, job, direction="pull")


@router.post("/oracle/revenue/push")
def oracle_revenue_push(
    payload: IntegrationRunRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("integrations.write")),
):
    job = IntegrationService.create_job(db, "ORACLE_ERP", "revenue_push", payload.payload, payload.idempotency_key)
    return IntegrationService.run_job(db, job, direction="push")


@router.post("/field-force/orders/import")
def field_force_import(
    payload: IntegrationRunRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("integrations.write")),
):
    job = IntegrationService.create_job(db, "FIELD_FORCE", "order_import", payload.payload, payload.idempotency_key)
    return IntegrationService.run_job(db, job, direction="pull")


@router.post("/rmc/sales/push")
def rmc_sales_push(
    payload: IntegrationRunRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("integrations.write")),
):
    job = IntegrationService.create_job(db, "RMC", "sales_push", payload.payload, payload.idempotency_key)
    return IntegrationService.run_job(db, job, direction="push")


@router.post("/hr/employees/sync")
def hr_employee_sync(
    payload: IntegrationRunRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("integrations.write")),
):
    job = IntegrationService.create_job(db, "HR_EMPRESS", "employee_sync", payload.payload, payload.idempotency_key)
    return IntegrationService.run_job(db, job, direction="pull")


@router.get("/jobs")
def list_jobs(db: Session = Depends(get_db), user: Employee = Depends(require_permission("integrations.read"))):
    return db.query(IntegrationJob).order_by(IntegrationJob.created_at.desc()).limit(200).all()


@router.post("/jobs/{job_id}/retry")
def retry_job(job_id: int, db: Session = Depends(get_db), user: Employee = Depends(require_permission("integrations.write"))):
    return IntegrationService.retry_job(db, job_id)


@router.get("/failures")
def list_failures(db: Session = Depends(get_db), user: Employee = Depends(require_permission("integrations.read"))):
    return db.query(IntegrationFailure).filter(IntegrationFailure.resolved == False).order_by(
        IntegrationFailure.created_at.desc()
    ).limit(200).all()
