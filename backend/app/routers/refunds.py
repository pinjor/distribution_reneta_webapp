"""Refund liability and settlement API."""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.database import get_db
from app.models import Employee
from app.models_platform import RefundLiability, RefundSettlement
from app.services.refund_service import RefundService

router = APIRouter()


class CreateLiabilityRequest(BaseModel):
    customer_id: int
    amount: Decimal
    order_id: int | None = None
    cn_no: str | None = None
    return_id: str | None = None


class SettleRequest(BaseModel):
    settlement_amount: Decimal
    settlement_order_id: int | None = None


@router.get("/liabilities")
def list_liabilities(db: Session = Depends(get_db), user: Employee = Depends(require_permission("billing.read"))):
    return db.query(RefundLiability).order_by(RefundLiability.created_at.desc()).limit(500).all()


@router.post("/liabilities")
def create_liability(
    payload: CreateLiabilityRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("billing.write")),
):
    return RefundService.create_liability(
        db, payload.customer_id, payload.amount, user,
        order_id=payload.order_id, cn_no=payload.cn_no, return_id=payload.return_id,
    )


@router.get("/customers/{customer_id}/credit-balance")
def customer_credit_balance(
    customer_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("billing.read")),
):
    return {"customer_id": customer_id, "balance": float(RefundService.get_customer_balance(db, customer_id))}


@router.post("/liabilities/{liability_id}/settle")
def settle_liability(
    liability_id: int,
    payload: SettleRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("billing.approve")),
):
    return RefundService.settle(db, liability_id, payload.settlement_amount, user, payload.settlement_order_id)


@router.get("/settlements")
def list_settlements(db: Session = Depends(get_db), user: Employee = Depends(require_permission("billing.read"))):
    return db.query(RefundSettlement).order_by(RefundSettlement.settled_at.desc()).limit(500).all()
