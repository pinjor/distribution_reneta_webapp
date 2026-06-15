"""Order validation rules engine API."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.deps import require_auth, require_permission, require_role
from app.database import get_db
from app.models import Employee, Order
from app.models_platform import OrderValidationRun, ValidationRuleConfig
from app.services.order_validation_service import OrderValidationService
from app.core.depot_scope import apply_depot_code_filter

router = APIRouter()


class BatchValidateRequest(BaseModel):
    order_ids: List[int]


class ApproveExceptionRequest(BaseModel):
    reason: str


class RejectValidationRequest(BaseModel):
    reason: str


class RuleUpdateRequest(BaseModel):
    enabled: Optional[bool] = None
    severity: Optional[str] = None
    config_json: Optional[dict] = None


@router.post("/{order_id}/validate")
def validate_single_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("orders.validate")),
):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    run = OrderValidationService.validate_order(db, order, user)
    return {"order_id": order_id, "validation_run_id": run.id, "status": run.validation_status.value}


@router.post("/batch-validate")
def batch_validate(
    payload: BatchValidateRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("orders.validate")),
):
    results = []
    for oid in payload.order_ids:
        order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == oid).first()
        if not order:
            results.append({"order_id": oid, "error": "not found"})
            continue
        run = OrderValidationService.validate_order(db, order, user)
        results.append({"order_id": oid, "validation_run_id": run.id, "status": run.validation_status.value})
    return {"results": results}


@router.get("/{order_id}/validation-result")
def get_validation_result(
    order_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("orders.read")),
):
    run = (
        db.query(OrderValidationRun)
        .filter(OrderValidationRun.order_id == order_id, OrderValidationRun.is_current == True)
        .first()
    )
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No validation result")
    return {
        "run": run,
        "messages": run.messages,
        "batch_allocations": run.batch_allocations,
    }


@router.get("/validation-pending")
def list_pending_validation(
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("orders.read")),
):
    orders_query = db.query(Order).filter(Order.validated == False).order_by(Order.created_at.desc()).limit(200)
    orders = apply_depot_code_filter(orders_query, user, Order.depot_code, db).all()
    return orders


@router.post("/{order_id}/approve-exception")
def approve_exception(
    order_id: int,
    payload: ApproveExceptionRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("orders.approve_exception")),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    run = OrderValidationService.approve_exception(db, order, user, payload.reason)
    return {"order_id": order_id, "status": run.validation_status.value}


@router.post("/{order_id}/reject-validation")
def reject_validation(
    order_id: int,
    payload: RejectValidationRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("orders.validate")),
):
    from app.models_platform import ValidationStatusEnum
    from app.services.audit_service import AuditService
    from app.services.stock_reservation_service import StockReservationService

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    StockReservationService.release_for_order(db, order_id, user)
    order.validated = False
    order.validation_status = ValidationStatusEnum.REJECTED.value
    order.delivery_status = "REJECTED"
    AuditService.log_rejection(db, "order", str(order_id), user, payload.reason)
    db.commit()
    return {"order_id": order_id, "status": "REJECTED"}


@router.get("/validation-rules")
def list_validation_rules(
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("orders.read")),
):
    OrderValidationService.ensure_default_rules(db)
    return db.query(ValidationRuleConfig).all()


@router.put("/validation-rules/{rule_code}")
def update_validation_rule(
    rule_code: str,
    payload: RuleUpdateRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_role("admin", "manager")),
):
    rule = db.query(ValidationRuleConfig).filter(ValidationRuleConfig.rule_code == rule_code).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    if payload.enabled is not None:
        rule.enabled = payload.enabled
    if payload.severity is not None:
        rule.severity = payload.severity
    if payload.config_json is not None:
        rule.config_json = payload.config_json
    db.commit()
    db.refresh(rule)
    return rule
