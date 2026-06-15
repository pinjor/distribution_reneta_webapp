"""Promotion management API."""
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.database import get_db
from app.models import Employee
from app.models_platform import (
    Promotion,
    PromotionDepot,
    PromotionProduct,
    PromotionRule,
    PromotionStatusEnum,
    PromotionUsageLog,
)
from app.services.audit_service import AuditService

router = APIRouter()


class PromotionCreate(BaseModel):
    promotion_code: str
    promotion_name: str
    promotion_type: str
    start_date: date
    end_date: date


class PromotionRuleCreate(BaseModel):
    rule_type: str
    condition_json: Optional[dict] = None
    benefit_json: Optional[dict] = None
    priority: int = 0


@router.get("")
def list_promotions(db: Session = Depends(get_db), user: Employee = Depends(require_permission("promotions.read"))):
    return db.query(Promotion).order_by(Promotion.created_at.desc()).all()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_promotion(
    payload: PromotionCreate,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("promotions.write")),
):
    if db.query(Promotion).filter(Promotion.promotion_code == payload.promotion_code).first():
        raise HTTPException(status_code=400, detail="Promotion code exists")
    promo = Promotion(**payload.model_dump(), status=PromotionStatusEnum.DRAFT, created_by=user.id)
    db.add(promo)
    AuditService.log_create(db, "promotion", payload.promotion_code, payload.model_dump(), user)
    db.commit()
    db.refresh(promo)
    return promo


@router.post("/{promotion_id}/submit")
def submit_promotion(promotion_id: int, db: Session = Depends(get_db), user: Employee = Depends(require_permission("promotions.write"))):
    promo = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Not found")
    promo.status = PromotionStatusEnum.PENDING_APPROVAL
    promo.approval_status = "PENDING_APPROVAL"
    db.commit()
    return promo


@router.post("/{promotion_id}/approve")
def approve_promotion(promotion_id: int, db: Session = Depends(get_db), user: Employee = Depends(require_permission("promotions.approve"))):
    promo = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Not found")
    promo.status = PromotionStatusEnum.ACTIVE
    promo.approval_status = "APPROVED"
    promo.approved_by = user.id
    from datetime import datetime
    promo.approved_at = datetime.utcnow()
    AuditService.log_approval(db, "promotion", str(promotion_id), user)
    db.commit()
    return promo


@router.post("/{promotion_id}/reject")
def reject_promotion(promotion_id: int, reason: str, db: Session = Depends(get_db), user: Employee = Depends(require_permission("promotions.approve"))):
    promo = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Not found")
    promo.status = PromotionStatusEnum.REJECTED
    promo.approval_status = "REJECTED"
    AuditService.log_rejection(db, "promotion", str(promotion_id), user, reason)
    db.commit()
    return promo


@router.get("/utilization")
def promotion_utilization(db: Session = Depends(get_db), user: Employee = Depends(require_permission("promotions.read"))):
    return db.query(PromotionUsageLog).order_by(PromotionUsageLog.created_at.desc()).limit(500).all()
