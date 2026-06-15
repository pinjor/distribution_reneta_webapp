"""Refund liability and customer credit balance settlement."""
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Employee, Order
from app.models_platform import CustomerCreditBalance, RefundLiability, RefundSettlement
from app.services.audit_service import AuditService


class RefundService:
    @staticmethod
    def get_or_create_balance(db: Session, customer_id: int) -> CustomerCreditBalance:
        bal = db.query(CustomerCreditBalance).filter(CustomerCreditBalance.customer_id == customer_id).first()
        if not bal:
            bal = CustomerCreditBalance(customer_id=customer_id, balance_amount=Decimal("0"))
            db.add(bal)
            db.commit()
            db.refresh(bal)
        return bal

    @staticmethod
    def create_liability(
        db: Session,
        customer_id: int,
        amount: Decimal,
        user: Employee,
        *,
        order_id: Optional[int] = None,
        cn_no: Optional[str] = None,
        return_id: Optional[str] = None,
    ) -> RefundLiability:
        liability = RefundLiability(
            customer_id=customer_id,
            order_id=order_id,
            return_id=return_id,
            cn_no=cn_no,
            liability_amount=amount,
            remaining_amount=amount,
            status="OPEN",
        )
        db.add(liability)
        bal = RefundService.get_or_create_balance(db, customer_id)
        bal.balance_amount = Decimal(str(bal.balance_amount or 0)) + amount
        AuditService.log_create(db, "refund_liability", str(customer_id), {
            "amount": float(amount), "cn_no": cn_no,
        }, user)
        db.commit()
        db.refresh(liability)
        return liability

    @staticmethod
    def settle(
        db: Session,
        liability_id: int,
        settlement_amount: Decimal,
        user: Employee,
        settlement_order_id: Optional[int] = None,
    ) -> RefundSettlement:
        liability = db.query(RefundLiability).filter(RefundLiability.id == liability_id).first()
        if not liability:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liability not found")
        remaining = Decimal(str(liability.remaining_amount or 0))
        if settlement_amount > remaining:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Settlement exceeds remaining liability")

        settlement = RefundSettlement(
            liability_id=liability_id,
            settlement_order_id=settlement_order_id,
            settlement_amount=settlement_amount,
            settled_by=user.id,
        )
        db.add(settlement)
        liability.remaining_amount = remaining - settlement_amount
        if liability.remaining_amount <= 0:
            liability.status = "SETTLED"

        bal = RefundService.get_or_create_balance(db, liability.customer_id)
        bal.balance_amount = Decimal(str(bal.balance_amount or 0)) - settlement_amount

        AuditService.log_finance_action(db, "refund_settlement", str(liability_id), "SETTLE", user, new_value={
            "amount": float(settlement_amount),
        })
        db.commit()
        db.refresh(settlement)
        return settlement

    @staticmethod
    def get_customer_balance(db: Session, customer_id: int) -> Decimal:
        bal = db.query(CustomerCreditBalance).filter(CustomerCreditBalance.customer_id == customer_id).first()
        return Decimal(str(bal.balance_amount if bal else 0))
