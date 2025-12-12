"""
Mobile App API Endpoints
Handles memo assignment, acceptance, and status tracking for mobile users
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from app.database import get_db
from app import models, schemas

router = APIRouter(tags=["Mobile"])


@router.get("/assigned-memos", response_model=List[schemas.MobileAssignedMemo])
def get_assigned_memos(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all assigned memos available for mobile app users to accept.
    
    Returns memos that:
    - Have been assigned (have loading_number, assigned_to, assigned_vehicle)
    - Are not yet accepted by any mobile user
    - Are available for all mobile app users to see and accept
    """
    try:
        # Get all assigned orders with loading numbers
        # These are orders that appear in "Assigned Order List"
        orders = (
            db.query(models.Order)
            .filter(
                models.Order.loading_number.isnot(None),
                models.Order.assigned_to.isnot(None),
                models.Order.assigned_vehicle.isnot(None),
                models.Order.loaded == True,  # Must be loaded/assigned
                # Only get orders not yet accepted
                (models.Order.mobile_accepted == False) | (models.Order.mobile_accepted.is_(None))
            )
            .order_by(
                models.Order.loading_number.asc(),
                models.Order.assignment_date.desc().nullslast(),
                models.Order.created_at.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        result = []
        for order in orders:
            employee = order.assigned_employee
            vehicle = order.assigned_vehicle_rel
            
            # Calculate total value
            total_value = Decimal("0")
            for item in order.items:
                unit_price = item.unit_price or item.trade_price or Decimal("0")
                discount = item.discount_percent or Decimal("0")
                price_after_discount = unit_price * (1 - discount / 100)
                total_price = price_after_discount * (item.total_quantity or (item.quantity + (item.free_goods or 0)))
                total_value += total_price
            
            memo_data = {
                "id": order.id,
                "order_id": order.id,
                "memo_number": order.memo_number,
                "order_number": order.order_number or f"order-{order.id}",
                "loading_number": order.loading_number,
                "customer_name": order.customer_name or "Unknown Customer",
                "customer_code": order.customer_code,
                "route_code": order.route_code,
                "route_name": order.route_name,
                "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
                "assigned_employee_id": employee.id if employee else None,
                "assigned_employee_name": f"{employee.first_name} {employee.last_name or ''}".strip() if employee else None,
                "assigned_vehicle_id": vehicle.id if vehicle else None,
                "assigned_vehicle_registration": vehicle.registration_number if vehicle else None,
                "assignment_date": order.assignment_date.isoformat() if order.assignment_date else None,
                "items_count": len(order.items),
                "total_value": float(total_value),
                "mobile_accepted": order.mobile_accepted or False,
                "mobile_accepted_by": order.mobile_accepted_by,
                "mobile_accepted_at": order.mobile_accepted_at.isoformat() if order.mobile_accepted_at else None,
                "area": order.area,
                "status": "Available"  # Available for acceptance
            }
            result.append(schemas.MobileAssignedMemo(**memo_data))
        
        return result
    
    except Exception as e:
        import traceback
        error_msg = f"Error fetching assigned memos: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )


@router.post("/accept-memo", response_model=schemas.MobileAcceptMemoResponse)
def accept_memo(
    payload: schemas.MobileAcceptMemoRequest,
    db: Session = Depends(get_db)
):
    """
    Accept a memo from mobile app.
    
    When a mobile user accepts a memo:
    - Sets mobile_accepted = True
    - Records mobile_accepted_by (user_id from mobile app)
    - Records mobile_accepted_at timestamp
    - Returns success response with updated memo status
    """
    try:
        # Find the order by memo_number or order_id
        order = None
        if payload.memo_number:
            order = db.query(models.Order).filter(
                models.Order.memo_number == payload.memo_number
            ).first()
        elif payload.order_id:
            order = db.query(models.Order).filter(
                models.Order.id == payload.order_id
            ).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Memo not found"
            )
        
        # Check if already accepted
        if order.mobile_accepted:
            return schemas.MobileAcceptMemoResponse(
                success=True,
                message=f"Memo {order.memo_number} was already accepted",
                memo_number=order.memo_number,
                loading_number=order.loading_number,
                accepted_at=order.mobile_accepted_at.isoformat() if order.mobile_accepted_at else None,
                accepted_by=order.mobile_accepted_by
            )
        
        # Update order with acceptance
        order.mobile_accepted = True
        order.mobile_accepted_by = payload.user_id
        order.mobile_accepted_at = datetime.utcnow()
        order.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(order)
        
        return schemas.MobileAcceptMemoResponse(
            success=True,
            message=f"Memo {order.memo_number} accepted successfully",
            memo_number=order.memo_number,
            loading_number=order.loading_number,
            accepted_at=order.mobile_accepted_at.isoformat(),
            accepted_by=order.mobile_accepted_by
        )
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_msg = f"Error accepting memo: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )


@router.get("/loading-number/{loading_number}/status", response_model=schemas.MobileLoadingNumberStatus)
def get_loading_number_status(
    loading_number: str,
    db: Session = Depends(get_db)
):
    """
    Get acceptance status for all memos in a loading number.
    
    Returns:
    - Total memos in the loading number
    - Accepted memos count
    - Pending memos count
    - List of all memos with their acceptance status
    """
    try:
        # Get all orders with this loading number
        orders = (
            db.query(models.Order)
            .filter(
                models.Order.loading_number == loading_number
            )
            .all()
        )
        
        if not orders:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No orders found for loading number {loading_number}"
            )
        
        total_memos = len(orders)
        accepted_memos = len([o for o in orders if o.mobile_accepted])
        pending_memos = total_memos - accepted_memos
        
        memos_status = []
        for order in orders:
            memos_status.append({
                "memo_number": order.memo_number,
                "order_id": order.id,
                "customer_name": order.customer_name,
                "accepted": order.mobile_accepted or False,
                "accepted_by": order.mobile_accepted_by,
                "accepted_at": order.mobile_accepted_at.isoformat() if order.mobile_accepted_at else None
            })
        
        return schemas.MobileLoadingNumberStatus(
            loading_number=loading_number,
            total_memos=total_memos,
            accepted_memos=accepted_memos,
            pending_memos=pending_memos,
            acceptance_rate=round((accepted_memos / total_memos * 100) if total_memos > 0 else 0, 2),
            memos=memos_status,
            all_accepted=accepted_memos == total_memos
        )
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = f"Error getting loading number status: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )


@router.get("/my-accepted-memos", response_model=List[schemas.MobileAssignedMemo])
def get_my_accepted_memos(
    user_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all memos accepted by a specific mobile user.
    """
    try:
        orders = (
            db.query(models.Order)
            .filter(
                models.Order.mobile_accepted == True,
                models.Order.mobile_accepted_by == user_id
            )
            .order_by(
                models.Order.mobile_accepted_at.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        result = []
        for order in orders:
            employee = order.assigned_employee
            vehicle = order.assigned_vehicle_rel
            
            # Calculate total value
            total_value = Decimal("0")
            for item in order.items:
                unit_price = item.unit_price or item.trade_price or Decimal("0")
                discount = item.discount_percent or Decimal("0")
                price_after_discount = unit_price * (1 - discount / 100)
                total_price = price_after_discount * (item.total_quantity or (item.quantity + (item.free_goods or 0)))
                total_value += total_price
            
            memo_data = {
                "id": order.id,
                "order_id": order.id,
                "memo_number": order.memo_number,
                "order_number": order.order_number or f"order-{order.id}",
                "loading_number": order.loading_number,
                "customer_name": order.customer_name or "Unknown Customer",
                "customer_code": order.customer_code,
                "route_code": order.route_code,
                "route_name": order.route_name,
                "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
                "assigned_employee_id": employee.id if employee else None,
                "assigned_employee_name": f"{employee.first_name} {employee.last_name or ''}".strip() if employee else None,
                "assigned_vehicle_id": vehicle.id if vehicle else None,
                "assigned_vehicle_registration": vehicle.registration_number if vehicle else None,
                "assignment_date": order.assignment_date.isoformat() if order.assignment_date else None,
                "items_count": len(order.items),
                "total_value": float(total_value),
                "mobile_accepted": True,
                "mobile_accepted_by": order.mobile_accepted_by,
                "mobile_accepted_at": order.mobile_accepted_at.isoformat() if order.mobile_accepted_at else None,
                "area": order.area,
                "status": "Accepted"
            }
            result.append(schemas.MobileAssignedMemo(**memo_data))
        
        return result
    
    except Exception as e:
        import traceback
        error_msg = f"Error fetching accepted memos: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )
