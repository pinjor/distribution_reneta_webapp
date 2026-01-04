from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
import json
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app import models, schemas

router = APIRouter()


def generate_order_number(prefix: str = "ORD") -> str:
    stamp = datetime.utcnow()
    return f"{prefix}-{stamp.strftime('%Y%m%d')}-{stamp.strftime('%H%M%S')}{stamp.microsecond // 1000:03d}"


def generate_memo_number(db: Session) -> str:
    """Generate a unique 8-digit numeric memo/invoice number"""
    import random
    max_attempts = 100
    
    for _ in range(max_attempts):
        # Generate 8-digit number (10000000 to 99999999)
        memo_num = str(random.randint(10000000, 99999999))
        
        # Check if it already exists
        existing = db.query(models.Order).filter(models.Order.memo_number == memo_num).first()
        if not existing:
            return memo_num
    
    # Fallback: use timestamp-based number if random fails
    timestamp = int(datetime.utcnow().timestamp())
    return str(timestamp % 100000000).zfill(8)


def map_item_to_model(item_data: schemas.OrderItemCreate, order: models.Order) -> models.OrderItem:
    total_qty = item_data.total_quantity
    if total_qty is None:
        total_qty = item_data.quantity + (item_data.free_goods or 0)
    
    return models.OrderItem(
        order=order,
        product_code=item_data.product_code,  # Updated from old_code
        product_name=item_data.product_name,
        pack_size=item_data.pack_size,
        quantity=item_data.quantity,
        free_goods=item_data.free_goods or 0,
        total_quantity=total_qty,
        trade_price=item_data.trade_price,
        unit_price=item_data.unit_price or item_data.trade_price,
        discount_percent=item_data.discount_percent or 0,
        batch_number=item_data.batch_number,  # Added batch_number
        current_stock=item_data.current_stock,  # Added current_stock
        delivery_date=item_data.delivery_date,
        selected=item_data.selected,
    )


@router.get("", response_model=List[schemas.Order])
def list_orders(db: Session = Depends(get_db)) -> List[schemas.Order]:
    """Get all orders that are not yet validated, have items, and have a route assigned"""
    from sqlalchemy import exists
    # Only show non-validated orders that have at least one item AND have a route
    orders = (
        db.query(models.Order)
        .filter(models.Order.validated == False)  # Only show non-validated orders
        .filter(models.Order.route_code.isnot(None))  # Must have a route assigned
        .filter(models.Order.route_code != "")  # Route code must not be empty
        .filter(exists().where(models.OrderItem.order_id == models.Order.id))  # Must have at least one item
        .order_by(models.Order.created_at.desc())
        .all()
    )
    # Filter out orders with empty items list or missing route (additional safety check)
    return [order for order in orders if order.items and len(order.items) > 0 and order.route_code]


# IMPORTANT: /collection-approval route MUST be defined BEFORE /{order_id} route
# FastAPI matches routes in order, so specific routes must come before parameterized routes
@router.get("/collection-approval")
@router.get("/remaining-cash-list")
def get_remaining_cash_list(
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get list of orders after delivery approval (for Remaining Cash and Collection list).
    Returns orders that have been approved for delivery, including fully collected, partially collected, and cancelled/postponed.
    These orders should appear grouped by loading number.
    """
    try:
        query = db.query(models.Order).filter(
            models.Order.loading_number.isnot(None),
            or_(
                models.Order.collection_status == "Pending",
                models.Order.collection_status == "Partially Collected",
                models.Order.collection_status == "Postponed",
                models.Order.collection_status == "Fully Collected"  # Include fully collected
            ),
            models.Order.collection_source == "Web"  # Only orders approved from web (Assigned Order List)
        )
        
        if status_filter and status_filter != "all":
            query = query.filter(models.Order.collection_status == status_filter)
        
        orders = query.order_by(
            models.Order.loading_number.desc().nullslast(),
            models.Order.loading_date.desc().nullslast(),
            models.Order.created_at.desc()
        ).all()
        
        result = []
        for order in orders:
            employee = order.assigned_employee
            vehicle = order.assigned_vehicle_rel
            
            total_amount = Decimal('0')
            for item in order.items:
                unit_price = item.unit_price or item.trade_price or Decimal('0')
                discount = item.discount_percent or Decimal('0')
                price_after_discount = unit_price * (1 - discount / 100)
                item_qty = item.total_quantity or (item.quantity + (item.free_goods or Decimal('0')))
                total_price = price_after_discount * item_qty
                total_amount += total_price
            
            collected = order.collected_amount or Decimal('0')
            pending = total_amount - collected
            
            order_dict = {
                "id": order.id,
                "order_number": order.order_number,
                "memo_number": order.memo_number,
                "customer_id": order.customer_id,
                "customer_name": order.customer_name,
                "customer_code": order.customer_code,
                "pso_id": order.pso_id,
                "pso_name": order.pso_name,
                "pso_code": order.pso_code,
                "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
                "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
                "collection_status": order.collection_status or "Pending",
                "collection_type": order.collection_type,
                "collected_amount": float(collected),
                "pending_amount": float(pending),
                "total_amount": float(total_amount),
                "collection_source": order.collection_source or "Web",
                "collection_approved": order.collection_approved or False,
                "loading_number": order.loading_number,
                "loading_date": order.loading_date.isoformat() if order.loading_date else None,
                "area": order.area,
                "assigned_employee_id": order.assigned_to,
                "assigned_employee_name": f"{employee.first_name} {employee.last_name or ''}".strip() if employee else None,
                "assigned_employee_code": employee.employee_id if employee else None,
                "assigned_vehicle_id": order.assigned_vehicle,
                "assigned_vehicle_registration": vehicle.registration_number if vehicle else None,
                "assigned_vehicle_model": vehicle.vehicle_type if vehicle else None,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "updated_at": order.updated_at.isoformat() if order.updated_at else None,
            }
            result.append(order_dict)
        
        return JSONResponse(content=result)
    except Exception as e:
        import traceback
        error_msg = f"Error in get_remaining_cash_list: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return Response(
            content=json.dumps({"error": str(e), "detail": error_msg}),
            media_type="application/json",
            status_code=500
        )


def get_collection_approval_list(
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get list of orders that need collection approval from mobile app.
    Returns orders with collection_status = Partially Collected or Postponed
    that were marked from mobile app and need approval.
    """
    print("=== get_collection_approval_list CALLED ===")
    print(f"status_filter: {status_filter}")
    try:
        query = db.query(models.Order).filter(
            or_(
                models.Order.collection_status == "Partially Collected",
                models.Order.collection_status == "Postponed"
            ),
            models.Order.collection_source == "Mobile App",  # Only mobile app collections need approval
            models.Order.collection_approved == False  # Only show orders that need approval
        )
        
        if status_filter and status_filter != "all":
            query = query.filter(models.Order.collection_status == status_filter)
        
        orders = query.order_by(
            models.Order.loading_number.desc().nullslast(),
            models.Order.loading_date.desc().nullslast(),
            models.Order.created_at.desc()
        ).all()
        
        result = []
        for order in orders:
            employee = order.assigned_employee
            vehicle = order.assigned_vehicle_rel
            
            total_amount = Decimal('0')
            for item in order.items:
                item_total = (item.trade_price or Decimal('0')) * (item.total_quantity or Decimal('0'))
                total_amount += item_total
            
            collected = order.collected_amount or Decimal('0')
            pending = total_amount - collected
            
            order_dict = {
                "id": order.id,
                "order_number": order.order_number,
                "memo_number": order.memo_number,
                "customer_id": order.customer_id,
                "customer_name": order.customer_name,
                "customer_code": order.customer_code,
                "pso_id": order.pso_id,
                "pso_name": order.pso_name,
                "pso_code": order.pso_code,
                "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
                "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
                "collection_status": order.collection_status or "Pending",
                "collection_type": order.collection_type,
                "collected_amount": float(collected),
                "pending_amount": float(pending),
                "total_amount": float(total_amount),
                "collection_source": order.collection_source or "Mobile App",
                "collection_approved": order.collection_approved or False,
                "collection_approved_at": order.collection_approved_at.isoformat() if order.collection_approved_at else None,
                "loading_number": order.loading_number,
                "loading_date": order.loading_date.isoformat() if order.loading_date else None,
                "area": order.area,
                "assigned_employee_id": order.assigned_to,
                "assigned_employee_name": f"{employee.first_name} {employee.last_name or ''}".strip() if employee else None,
                "assigned_employee_code": employee.employee_id if employee else None,
                "assigned_vehicle_id": order.assigned_vehicle,
                "assigned_vehicle_registration": vehicle.registration_number if vehicle else None,
                "assigned_vehicle_model": vehicle.vehicle_type if vehicle else None,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "updated_at": order.updated_at.isoformat() if order.updated_at else None,
            }
            result.append(order_dict)
        
        return JSONResponse(content=result)
    except Exception as e:
        import traceback
        error_msg = f"Error in get_collection_approval_list: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        from fastapi.responses import Response
        return Response(
            content=json.dumps({"error": str(e), "detail": error_msg}),
            media_type="application/json",
            status_code=500
        )


@router.get("/assigned")
def get_assigned_orders(
    status_filter: Optional[str] = Query(None, alias="status_filter"),
    route_code: Optional[str] = Query(None, alias="route_code"),
    db: Session = Depends(get_db)
):
    """Get assigned orders list"""
    from sqlalchemy import func
    from decimal import Decimal
    
    try:
        query = (
            db.query(models.Order)
            .filter(
                models.Order.assigned_to.isnot(None),
                models.Order.assigned_vehicle.isnot(None),
            )
        )
        
        if status_filter and status_filter != "all":
            # Map status filter to order status or assignment status
            if status_filter == "Pending":
                query = query.filter(models.Order.loaded == True, models.Order.status == models.OrderStatusEnum.APPROVED)
            elif status_filter == "Out for Delivery":
                query = query.filter(models.Order.loaded == True)
            elif status_filter == "Delivered":
                # This would need a delivery status field or separate table
                pass
        
        if route_code and route_code != "all":
            query = query.filter(models.Order.route_code == route_code)
        
        # Order by most recent first (by assignment_date or created_at)
        orders = query.order_by(
            models.Order.assignment_date.desc().nullslast(),
            models.Order.loaded_at.desc().nullslast(),
            models.Order.created_at.desc()
        ).all()
        
        result = []
        for order in orders:
            employee = order.assigned_employee
            vehicle = order.assigned_vehicle_rel
            
            # Calculate total value
            total_value = Decimal("0")
            for item in order.items:
                unit_price = item.unit_price or item.trade_price
                discount = item.discount_percent or Decimal("0")
                price_after_discount = unit_price * (1 - discount / 100)
                total_price = price_after_discount * (item.total_quantity or (item.quantity + (item.free_goods or 0)))
                total_value += total_price
            
            # Determine status
            order_status = "Pending"
            if order.loaded:
                order_status = "Out for Delivery"
            # In a real system, you'd check delivery status from a separate table
            
            # Ensure assignment_date is a datetime object
            assignment_dt = order.assignment_date or order.loaded_at or (order.created_at if order.created_at else datetime.utcnow())
            if assignment_dt is None:
                assignment_dt = datetime.utcnow()
            
            order_response = {
                "id": order.id,
                "order_id": order.id,
                "order_number": order.order_number,
                "memo_number": order.memo_number,
                "customer_name": order.customer_name or "Unknown Customer",
                "customer_code": order.customer_code,
                "route_code": order.route_code,
                "route_name": order.route_name,
                "assigned_employee_id": employee.id if employee else 0,
                "assigned_employee_name": f"{employee.first_name} {employee.last_name or ''}".strip() if employee else "Unknown",
                "assigned_employee_code": employee.employee_id if employee else None,
                "assigned_vehicle_id": vehicle.id if vehicle else 0,
                "assigned_vehicle_registration": vehicle.registration_number if vehicle else "Unknown",
                "assigned_vehicle_model": vehicle.vehicle_type if vehicle else None,
                "assignment_date": assignment_dt.isoformat() if assignment_dt else datetime.utcnow().isoformat(),
                "loading_number": order.loading_number,
                "loading_date": order.loading_date.isoformat() if order.loading_date else None,
                "area": order.area,
                "status": order_status,
                "items_count": len(order.items),
                "total_value": float(total_value),
            }
            result.append(order_response)
        
        return result
    except Exception as e:
        import traceback
        error_msg = f"Error in get_assigned_orders: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg)


# MIS Report endpoints - MUST be before /{order_id} route to avoid route conflicts
@router.get("/mis-report", response_model=List[schemas.MISReportMemo])
def get_mis_report_memos(
    start_date: Optional[str] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="Filter by status (validated, printed, assigned, loaded, collected, postponed)"),
    route_code: Optional[str] = Query(None, description="Filter by route code"),
    db: Session = Depends(get_db)
):
    """
    Get all memos for MIS report with date and status filters.
    Returns comprehensive memo list with key status indicators.
    """
    from sqlalchemy import exists, func, or_
    from sqlalchemy.orm import joinedload
    
    query = db.query(models.Order).options(
        joinedload(models.Order.items),
        joinedload(models.Order.assigned_employee),
        joinedload(models.Order.assigned_vehicle_rel)
    )
    
    # Filter by date range - parse string dates
    if start_date:
        try:
            start_date_parsed = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(models.Order.delivery_date >= start_date_parsed)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid start_date format. Expected YYYY-MM-DD, got: {start_date}")
    if end_date:
        try:
            end_date_parsed = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(models.Order.delivery_date <= end_date_parsed)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid end_date format. Expected YYYY-MM-DD, got: {end_date}")
    
    # Filter by route
    if route_code:
        query = query.filter(models.Order.route_code == route_code)
    
    # Filter by status
    if status:
        if status == "validated":
            query = query.filter(models.Order.validated == True)
        elif status == "printed":
            query = query.filter(models.Order.printed == True)
        elif status == "assigned":
            query = query.filter(models.Order.assigned_to.isnot(None))
        elif status == "loaded":
            query = query.filter(models.Order.loaded == True)
        elif status == "collected":
            query = query.filter(models.Order.collection_status.in_(["Fully Collected", "Partially Collected"]))
        elif status == "postponed":
            query = query.filter(models.Order.postponed == True)
        elif status == "pending_validation":
            query = query.filter(models.Order.validated == False)
        elif status == "pending_print":
            query = query.filter(models.Order.printed == False, models.Order.validated == True)
        elif status == "pending_collection":
            query = query.filter(
                or_(
                    models.Order.collection_status == "Pending",
                    models.Order.collection_status.is_(None)
                )
            )
    
    orders = query.order_by(models.Order.delivery_date.desc(), models.Order.created_at.desc()).all()
    
    result = []
    for order in orders:
        # Calculate total amount
        total_amount = Decimal('0')
        for item in order.items:
            item_total = (item.trade_price or Decimal('0')) * (item.total_quantity or Decimal('0'))
            total_amount += item_total
        
        # Get validation timestamp (use updated_at when validated is True)
        validated_at = None
        if order.validated:
            validated_at = order.updated_at
        
        result.append(schemas.MISReportMemo(
            id=order.id,
            order_id=order.id,
            order_number=order.order_number,
            memo_number=order.memo_number,
            customer_name=order.customer_name,
            customer_code=order.customer_code,
            route_code=order.route_code,
            route_name=order.route_name,
            delivery_date=order.delivery_date,
            validated=order.validated or False,
            validated_at=validated_at,
            printed=order.printed or False,
            printed_at=order.printed_at,
            postponed=order.postponed or False,
            assigned=(order.assigned_to is not None and order.assigned_vehicle is not None),
            assigned_at=order.assignment_date,
            assigned_employee_name=order.assigned_employee.first_name + " " + (order.assigned_employee.last_name or "") if order.assigned_employee else None,
            assigned_vehicle_registration=order.assigned_vehicle_rel.registration_number if order.assigned_vehicle_rel else None,
            loaded=order.loaded or False,
            loaded_at=order.loaded_at,
            loading_number=order.loading_number,
            collection_status=order.collection_status,
            collection_type=order.collection_type,
            collected_amount=order.collected_amount,
            pending_amount=order.pending_amount,
            collection_approved=order.collection_approved or False,
            collection_approved_at=order.collection_approved_at,
            total_amount=total_amount,
            status=order.status.value if order.status else "DRAFT",
            created_at=order.created_at
        ))
    
    return result


@router.get("/mis-report/{memo_id}", response_model=schemas.MISReportMemoDetail)
def get_mis_report_memo_detail(
    memo_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed history and full cycle information for a specific memo.
    Returns comprehensive memo details including all lifecycle events.
    """
    from sqlalchemy.orm import joinedload
    
    order = db.query(models.Order).options(
        joinedload(models.Order.items),
        joinedload(models.Order.assigned_employee),
        joinedload(models.Order.assigned_vehicle_rel)
    ).filter(models.Order.id == memo_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Memo not found")
    
    # Calculate total amount and items
    total_amount = Decimal('0')
    memo_items = []
    for item in order.items:
        item_total = (item.trade_price or Decimal('0')) * (item.total_quantity or Decimal('0'))
        total_amount += item_total
        
        memo_items.append(schemas.MISReportMemoItem(
            product_code=item.product_code,
            product_name=item.product_name,
            pack_size=item.pack_size,
            total_quantity=item.total_quantity or Decimal('0'),
            delivered_quantity=item.delivered_quantity if hasattr(item, 'delivered_quantity') else None,
            returned_quantity=item.returned_quantity if hasattr(item, 'returned_quantity') else None,
            unit_price=item.trade_price or Decimal('0'),
            discount_percent=item.discount_percent or Decimal('0'),
            total_price=item_total
        ))
    
    # Get validation timestamp
    validated_at = None
    if order.validated:
        validated_at = order.updated_at
    
    # Get collection approved by name
    collection_approved_by_name = None
    if order.collection_approved_by:
        approved_by_emp = db.query(models.Employee).filter(models.Employee.id == order.collection_approved_by).first()
        if approved_by_emp:
            collection_approved_by_name = f"{approved_by_emp.first_name} {approved_by_emp.last_name or ''}".strip()
    
    # Determine delivery status (would come from app integration, using collection_status for now)
    delivery_status = None
    if order.loaded:
        if order.collection_status == "Fully Collected":
            delivery_status = "Fully Delivered"
        elif order.collection_status == "Partially Collected":
            delivery_status = "Partial Delivered"
        elif order.postponed:
            delivery_status = "Postponed"
    
    return schemas.MISReportMemoDetail(
        id=order.id,
        order_id=order.id,
        order_number=order.order_number,
        memo_number=order.memo_number,
        customer_name=order.customer_name,
        customer_code=order.customer_code,
        customer_id=order.customer_id,
        route_code=order.route_code,
        route_name=order.route_name,
        delivery_date=order.delivery_date,
        pso_name=order.pso_name,
        pso_code=order.pso_code,
        pso_id=order.pso_id,
        validated=order.validated or False,
        validated_at=validated_at,
        printed=order.printed or False,
        printed_at=order.printed_at,
        postponed=order.postponed or False,
        assigned=(order.assigned_to is not None and order.assigned_vehicle is not None),
        assigned_at=order.assignment_date,
        assigned_employee_id=order.assigned_to,
        assigned_employee_name=order.assigned_employee.first_name + " " + (order.assigned_employee.last_name or "") if order.assigned_employee else None,
        assigned_employee_code=order.assigned_employee.employee_id if order.assigned_employee else None,
        assigned_vehicle_id=order.assigned_vehicle,
        assigned_vehicle_registration=order.assigned_vehicle_rel.registration_number if order.assigned_vehicle_rel else None,
        assigned_vehicle_model=order.assigned_vehicle_rel.vehicle_type if order.assigned_vehicle_rel else None,
        loaded=order.loaded or False,
        loaded_at=order.loaded_at,
        loading_number=order.loading_number,
        loading_date=order.loading_date,
        delivery_status=delivery_status,
        collection_status=order.collection_status,
        collection_type=order.collection_type,
        collected_amount=order.collected_amount,
        pending_amount=order.pending_amount,
        collection_approved=order.collection_approved or False,
        collection_approved_at=order.collection_approved_at,
        collection_approved_by_name=collection_approved_by_name,
        collection_source=order.collection_source,
        items=memo_items,
        total_amount=total_amount,
        total_items_count=len(memo_items),
        status=order.status.value if order.status else "DRAFT",
        created_at=order.created_at,
        updated_at=order.updated_at
    )


@router.get("/{order_id}", response_model=schemas.Order)
def get_order(order_id: int, db: Session = Depends(get_db)) -> schemas.Order:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.post("", response_model=schemas.Order, status_code=status.HTTP_201_CREATED)
def create_order(order_data: schemas.OrderCreate, db: Session = Depends(get_db)) -> schemas.Order:
    try:
        # MANDATORY: Route validation - Route is required for all orders
        if not order_data.route_code or order_data.route_code.strip() == '':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Route is required. Please select a route before saving the order."
            )
        
        if not order_data.items:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order requires at least one item")
        
        # Validate batch stock for each item
        from app.models import ProductItemStock, ProductItemStockDetail, Product
        from sqlalchemy import func
        from sqlalchemy.sql import func as sql_func
        
        for item in order_data.items:
            if not item.batch_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Batch number is required for product {item.product_code}. Products without batch numbers have no stock."
                )
            
            # Find product by code
            product = db.query(Product).filter(
                (Product.code == item.product_code) | 
                (Product.old_code == item.product_code) |
                (Product.sku == item.product_code)
            ).first()
            
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product {item.product_code} not found"
                )
            
            # Check if product has any numeric batches with stock (before validating specific batch)
            # No depot filtering - use central stock
            batch_check_query = db.query(ProductItemStockDetail, ProductItemStock).join(
                ProductItemStock, ProductItemStockDetail.item_code == ProductItemStock.id
            ).filter(
                ProductItemStock.product_id == product.id,
                ProductItemStockDetail.available_quantity > 0
            )
            
            all_available_batches = batch_check_query.all()
            has_numeric_batch_with_stock = False
            for detail, stock in all_available_batches:
                batch_no = (detail.batch_no or "").strip()
                if batch_no and batch_no.isdigit() and (detail.available_quantity or 0) > 0:
                    has_numeric_batch_with_stock = True
                    break
            
            if not has_numeric_batch_with_stock:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {item.product_code} has no numeric batches with available stock. Products must have numeric batches with stock to be ordered."
                )
            
            # Normalize batch number (trim whitespace, handle case)
            batch_number_clean = (item.batch_number or "").strip() if item.batch_number else None
            if not batch_number_clean:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Batch number is required for product {item.product_code}. Products without batch numbers have no stock."
                )
            
            # Check batch stock availability - first get all batches (including 0 stock) for better error messages
            # Use case-insensitive comparison for batch numbers
            from sqlalchemy import func
            # No depot filtering - use central stock
            query_all = db.query(ProductItemStockDetail, ProductItemStock).join(
                ProductItemStock, ProductItemStockDetail.item_code == ProductItemStock.id
            ).filter(
                ProductItemStock.product_id == product.id,
                func.upper(func.trim(ProductItemStockDetail.batch_no)) == func.upper(batch_number_clean)
            )
            
            # Get all batches and filter by batch number (case-insensitive, trimmed)
            all_batches_raw = query_all.all()
            all_batches = []
            for detail, stock in all_batches_raw:
                batch_no_clean = (detail.batch_no or "").strip().upper()
                if batch_no_clean == batch_number_clean.upper():
                    all_batches.append((detail, stock))
            
            if not all_batches:
                # Try to find any batches for this product to help debug
                # No depot filtering - use central stock
                debug_query = db.query(ProductItemStockDetail.batch_no).join(
                    ProductItemStock, ProductItemStockDetail.item_code == ProductItemStock.id
                ).filter(ProductItemStock.product_id == product.id)
                # No depot filtering - use central stock
                available_batches = [b[0] for b in debug_query.distinct().all() if b[0]]
                batches_msg = f" Available batches: {', '.join(available_batches[:5])}" if available_batches else ""
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Batch '{batch_number_clean}' for product {item.product_code} not found.{batches_msg}"
                )
            
            # Find batch with available stock
            batch_stock = None
            for detail, stock in all_batches:
                available = float(detail.available_quantity or 0)
                if available > 0:
                    batch_stock = (detail, stock)
                    break
            
            if not batch_stock:
                # Batch exists but has no available stock
                detail, stock = all_batches[0]
                available = float(detail.available_quantity or 0)
                total = float(detail.quantity or 0)
                reserved = float(detail.reserved_quantity or 0)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Batch '{batch_number_clean}' for product {item.product_code} has no available stock. (Total: {total}, Reserved: {reserved}, Available: {available})"
                )
            
            detail, stock = batch_stock
            available_qty = float(detail.available_quantity or 0)
            
            if item.quantity > available_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Quantity {item.quantity} exceeds available stock {available_qty} for batch '{batch_number_clean}' of product {item.product_code}"
                )

        order = models.Order(
            depot_code=order_data.depot_code or None,
            depot_name=order_data.depot_name or None,
            customer_id=order_data.customer_id,
            customer_name=order_data.customer_name,
            customer_code=order_data.customer_code,
            pso_id=order_data.pso_id,
            pso_name=order_data.pso_name,
            pso_code=order_data.pso_code,
            route_code=order_data.route_code,
            route_name=order_data.route_name,
            delivery_date=order_data.delivery_date,
            status=order_data.status or models.OrderStatusEnum.DRAFT,
            notes=order_data.notes,
        )

        for item in order_data.items:
            order.items.append(map_item_to_model(item, order))

        db.add(order)
        db.flush()  # Flush to get the order ID without committing
        
        # Generate order number in format "order-{id}" (lowercase)
        if not order.order_number:
            order.order_number = f"order-{order.id}"
        
        db.commit()
        db.refresh(order)
        return order
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error creating order: {e}")
        print(error_trace)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )


@router.put("/{order_id}", response_model=schemas.Order)
def update_order(order_id: int, order_update: schemas.OrderUpdate, db: Session = Depends(get_db)) -> schemas.Order:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    
    # MANDATORY: Route validation - If route_code is being updated, it must not be empty
    if order_update.route_code is not None:
        if order_update.route_code.strip() == '':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Route is required. Please select a route before saving the order."
            )
    # If route_code is not being updated, ensure existing route is still valid
    elif not order.route_code or order.route_code.strip() == '':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Route is required. Please select a route before saving the order."
        )
    
    # Validate batch stock for each item if items are being updated
    if order_update.items:
        from app.models import ProductItemStock, ProductItemStockDetail, Product
        from sqlalchemy import func
        
        # Get existing items in the order to calculate what's already reserved
        existing_items_by_batch = {}
        existing_items_map = {existing_item.id: existing_item for existing_item in order.items}
        for existing_item in order.items:
            if existing_item.batch_number and existing_item.product_code:
                key = f"{existing_item.product_code}_{existing_item.batch_number}"
                existing_items_by_batch[key] = existing_items_by_batch.get(key, 0) + float(existing_item.quantity or 0)
        
        for item in order_update.items:
            # Check if this is an existing item and if we're only updating non-stock fields
            is_existing_item = item.id and item.id in existing_items_map
            existing_item = existing_items_map.get(item.id) if is_existing_item else None
            
            # Skip batch validation if:
            # 1. Item already exists AND existing item has no batch (legacy data) AND we're not adding one
            # 2. Item already exists AND we're not changing batch_number, quantity, or product_code
            skip_batch_validation = False
            if is_existing_item and existing_item:
                # FIRST: If existing item has no batch and we're not adding one, skip validation (legacy data)
                existing_has_batch = existing_item.batch_number and (existing_item.batch_number or "").strip()
                item_has_batch = item.batch_number and (item.batch_number or "").strip()
                
                if not existing_has_batch and not item_has_batch:
                    skip_batch_validation = True
                else:
                    # Use existing batch_number if not provided in payload for comparison
                    item_batch = item.batch_number or existing_item.batch_number
                    existing_batch = existing_item.batch_number or ""
                    
                    batch_changed = (item_batch or "").strip() != (existing_batch or "").strip()
                    quantity_changed = item.quantity != existing_item.quantity
                    product_changed = item.product_code != existing_item.product_code
                    
                    # If we're only updating selected or other non-stock fields, skip validation
                    if not batch_changed and not quantity_changed and not product_changed:
                        skip_batch_validation = True
            
            # Only validate batch if we're not skipping validation
            if not skip_batch_validation:
                # Use existing batch_number if not provided in payload
                batch_to_validate = item.batch_number
                if not batch_to_validate and existing_item:
                    batch_to_validate = existing_item.batch_number
                
                if not batch_to_validate:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Batch number is required for product {item.product_code}. Products without batch numbers have no stock."
                    )
                
                # Find product by code
                product = db.query(Product).filter(
                    (Product.code == item.product_code) | 
                    (Product.old_code == item.product_code) |
                    (Product.sku == item.product_code)
                ).first()
                
                if not product:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Product {item.product_code} not found"
                    )
                
                # Check if product has any numeric batches with stock (before validating specific batch)
                # No depot filtering - use central stock
                batch_check_query = db.query(ProductItemStockDetail, ProductItemStock).join(
                    ProductItemStock, ProductItemStockDetail.item_code == ProductItemStock.id
                ).filter(
                    ProductItemStock.product_id == product.id,
                    ProductItemStockDetail.available_quantity > 0
                )
                
                all_available_batches = batch_check_query.all()
                has_numeric_batch_with_stock = False
                for detail, stock in all_available_batches:
                    batch_no = (detail.batch_no or "").strip()
                    if batch_no and batch_no.isdigit() and (detail.available_quantity or 0) > 0:
                        has_numeric_batch_with_stock = True
                        break
                
                if not has_numeric_batch_with_stock:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Product {item.product_code} has no numeric batches with available stock. Products must have numeric batches with stock to be ordered."
                    )
                
                # Normalize batch number (trim whitespace, handle case)
                # Use batch_to_validate which may come from existing item
                batch_number_clean = (batch_to_validate or "").strip() if batch_to_validate else None
                if not batch_number_clean:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Batch number is required for product {item.product_code}. Products without batch numbers have no stock."
                    )
                
                # Validate batch number is numeric only
                if not batch_number_clean.isdigit():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Batch number '{batch_number_clean}' for product {item.product_code} must be numeric only (digits only)."
                    )
                
                # Check batch stock availability - first get all batches (including 0 stock) for better error messages
                # Get all batches for this product and match in Python (exact match for numeric batches)
                query_all = db.query(ProductItemStockDetail, ProductItemStock).join(
                    ProductItemStock, ProductItemStockDetail.item_code == ProductItemStock.id
                ).filter(
                    ProductItemStock.product_id == product.id
                )
                
                # No depot filtering - use central stock
                
                # Get all batches and filter by batch number (exact match, numeric only)
                all_batches_raw = query_all.all()
                all_batches = []
                for detail, stock in all_batches_raw:
                    batch_no_clean = (detail.batch_no or "").strip()
                    # Only match numeric batch numbers
                    if batch_no_clean.isdigit() and batch_no_clean == batch_number_clean:
                        all_batches.append((detail, stock))
                
                if not all_batches:
                    # Try to find any batches for this product to help debug
                    # No depot filtering - use central stock
                    debug_query = db.query(ProductItemStockDetail.batch_no).join(
                        ProductItemStock, ProductItemStockDetail.item_code == ProductItemStock.id
                    ).filter(ProductItemStock.product_id == product.id)
                    available_batches = [b[0] for b in debug_query.distinct().all() if b[0]]
                    batches_msg = f" Available batches: {', '.join(available_batches[:5])}" if available_batches else ""
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Batch '{batch_number_clean}' for product {item.product_code} not found.{batches_msg}"
                    )
                
                # Find batch with available stock
                batch_stock = None
                for detail, stock in all_batches:
                    available = float(detail.available_quantity or 0)
                    if available > 0:
                        batch_stock = (detail, stock)
                        break
                
                if not batch_stock:
                    # Batch exists but has no available stock
                    detail, stock = all_batches[0]
                    available = float(detail.available_quantity or 0)
                    total = float(detail.quantity or 0)
                    reserved = float(detail.reserved_quantity or 0)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Batch '{batch_number_clean}' for product {item.product_code} has no available stock. (Total: {total}, Reserved: {reserved}, Available: {available})"
                    )
                
                detail, stock = batch_stock
                available_qty = float(detail.available_quantity or 0)
                
                # Calculate how much of this batch is already in the order (excluding the item being updated)
                batch_key = f"{item.product_code}_{batch_number_clean}"
                
                # Check if this is updating an existing item
                existing_item_qty = 0
                if item.id:
                    existing_item = db.query(models.OrderItem).filter(models.OrderItem.id == item.id).first()
                    if existing_item:
                        # If updating the same batch, add back its old quantity
                        if existing_item.batch_number == item.batch_number and existing_item.product_code == item.product_code:
                            existing_item_qty = float(existing_item.quantity or 0)
                
                # Calculate other items in order using this batch (excluding the item being updated)
                other_items_qty = existing_items_by_batch.get(batch_key, 0) - existing_item_qty
                
                # Effective available = current available + existing item qty (if updating) - other items already in order
                effective_available = available_qty + existing_item_qty - other_items_qty
                
                # Ensure effective available is not negative
                effective_available = max(0, effective_available)
                
                if item.quantity > effective_available:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Quantity {item.quantity} exceeds available stock {effective_available:.2f} for batch {batch_number_clean} of product {item.product_code}. (Stock available: {available_qty}, Already reserved in this order: {other_items_qty})"
                    )

    if order_update.depot_code is not None:
        order.depot_code = order_update.depot_code
    if order_update.depot_name is not None:
        order.depot_name = order_update.depot_name
    if order_update.customer_id is not None:
        order.customer_id = order_update.customer_id
    if order_update.customer_name is not None:
        order.customer_name = order_update.customer_name
    if order_update.customer_code is not None:
        order.customer_code = order_update.customer_code
    if order_update.pso_id is not None:
        order.pso_id = order_update.pso_id
    if order_update.pso_name is not None:
        order.pso_name = order_update.pso_name
    if order_update.pso_code is not None:
        order.pso_code = order_update.pso_code
    if order_update.route_code is not None:
        order.route_code = order_update.route_code
    if order_update.route_name is not None:
        order.route_name = order_update.route_name
    if order_update.delivery_date is not None:
        order.delivery_date = order_update.delivery_date
    if order_update.notes is not None:
        order.notes = order_update.notes
    if order_update.status is not None:
        order.status = order_update.status

    if order_update.items is not None:
        existing_items = {item.id: item for item in order.items}
        keep_ids = set()

        for item_data in order_update.items:
            if item_data.id and item_data.id in existing_items:
                item = existing_items[item_data.id]
                item.product_code = item_data.product_code  # Updated from old_code
                item.product_name = item_data.product_name
                item.pack_size = item_data.pack_size
                item.quantity = item_data.quantity
                item.free_goods = item_data.free_goods or 0
                item.total_quantity = item_data.total_quantity or (item_data.quantity + (item_data.free_goods or 0))
                item.batch_number = item_data.batch_number  # Added batch_number
                item.current_stock = item_data.current_stock  # Added current_stock
                item.trade_price = item_data.trade_price
                item.unit_price = item_data.unit_price or item_data.trade_price
                item.discount_percent = item_data.discount_percent or 0
                item.delivery_date = item_data.delivery_date
                item.selected = item_data.selected
                keep_ids.add(item.id)
            else:
                new_item = map_item_to_model(item_data, order)
                db.add(new_item)
                db.flush()
                keep_ids.add(new_item.id)

        for existing_id, existing_item in list(existing_items.items()):
            if existing_id not in keep_ids:
                order.items.remove(existing_item)
                db.delete(existing_item)

    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)) -> None:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    db.delete(order)
    db.commit()


@router.post("/{order_id}/submit", response_model=schemas.Order)
def submit_order(order_id: int, db: Session = Depends(get_db)) -> schemas.Order:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if not order.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order has no items")

    order.status = models.OrderStatusEnum.SUBMITTED
    db.commit()
    db.refresh(order)
    return order


@router.post("/validate", response_model=schemas.OrderValidationResponse)
def validate_orders(payload: schemas.OrderValidationRequest, db: Session = Depends(get_db)) -> schemas.OrderValidationResponse:
    if not payload.order_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No orders selected for validation")

    # IMPORTANT: Load orders with items to ensure selected status is checked correctly
    from sqlalchemy.orm import joinedload
    orders = (
        db.query(models.Order)
        .options(joinedload(models.Order.items))
        .filter(models.Order.id.in_(payload.order_ids))
        .all()
    )

    if not orders:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No matching orders found")

    generated_number = payload.order_number or generate_order_number()

    for order in orders:
        # Allow validating Draft, Submitted, or Partially Approved orders
        # Check if order is already fully validated (all items selected and status is APPROVED)
        all_selected = all(item.selected for item in order.items)
        if order.status == models.OrderStatusEnum.APPROVED and all_selected and order.validated:
            continue

        # Check if at least one item is selected
        selected_items = [item for item in order.items if item.selected]
        if not selected_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order {order.id} has no selected items to validate",
            )

        # Set order number if not already set
        if not order.order_number:
            order.order_number = generated_number
        
        # Generate memo number if not already set (8-digit numeric)
        if not order.memo_number:
            order.memo_number = generate_memo_number(db)
        
        # Update status based on selection and validate
        if all_selected:
            order.status = models.OrderStatusEnum.APPROVED
            # Mark order as validated (fully validated - all items selected)
            order.validated = True
        else:
            order.status = models.OrderStatusEnum.PARTIALLY_APPROVED
            # Partially validated orders are not fully validated yet
            order.validated = False

    db.commit()

    refreshed = (
        db.query(models.Order)
        .filter(models.Order.id.in_(payload.order_ids))
        .order_by(models.Order.created_at.desc())
        .all()
    )

    return schemas.OrderValidationResponse(order_number=generated_number, orders=refreshed)


@router.get("/route-wise/all", response_model=List[schemas.RouteWiseOrderResponse])
def get_all_route_wise_orders(db: Session = Depends(get_db)) -> List[schemas.RouteWiseOrderResponse]:
    """Get all route-wise orders grouped by route"""
    from sqlalchemy import func
    from decimal import Decimal
    from app.models import Route
    from sqlalchemy.orm import joinedload
    
    # Get all active routes
    routes = db.query(models.Route).filter(models.Route.status == "Active").order_by(models.Route.route_id).all()
    
    result = []
    for route in routes:
        # Get approved orders for this route (including loaded ones for stats, but exclude from items)
        # Order by most recent first
        # IMPORTANT: Use joinedload to ensure items are loaded correctly
        all_orders = (
            db.query(models.Order)
            .options(joinedload(models.Order.items))
            .filter(
                models.Order.route_code == route.route_id,
                models.Order.status.in_([models.OrderStatusEnum.APPROVED, models.OrderStatusEnum.PARTIALLY_APPROVED])
            )
            .order_by(models.Order.created_at.desc())
            .all()
        )
        
        # Only show validated and unloaded orders for the items list
        # validated=True means all items were selected during validation (fully validated)
        validated_unloaded_orders = [o for o in all_orders if o.validated == True and (o.loaded == False or o.loaded is None)]
        
        # Generate memo numbers for orders that don't have them
        for order in validated_unloaded_orders:
            if not order.memo_number:
                order.memo_number = generate_memo_number(db)
        
        # Commit memo numbers
        if any(not o.memo_number for o in validated_unloaded_orders):
            db.commit()
        
        # Build route-wise items (only from validated and unloaded orders)
        items = []
        for order in validated_unloaded_orders:
            for item in order.items:
                if not item.selected:
                    continue
                    
                unit_price = item.unit_price or item.trade_price
                discount = item.discount_percent or Decimal("0")
                price_after_discount = unit_price * (1 - discount / 100)
                total_price = price_after_discount * (item.total_quantity or (item.quantity + (item.free_goods or 0)))
                
                items.append(schemas.RouteWiseOrderItemResponse(
                    id=item.id,
                    order_id=order.id,
                    order_number=order.order_number,
                    memo_number=order.memo_number,
                    product_code=item.product_code,
                    size=item.pack_size,
                    free_goods=item.free_goods or 0,
                    total_quantity=item.total_quantity or (item.quantity + (item.free_goods or 0)),
                    unit_price=unit_price,
                    discount_percent=item.discount_percent or 0,
                    total_price=total_price,
                    customer_name=order.customer_name,
                    customer_code=order.customer_code,
                    route_code=route.route_id,
                    route_name=route.name,
                    validated=order.validated,
                    printed=order.printed,
                    printed_at=order.printed_at.isoformat() if order.printed_at else None,
                    postponed=order.postponed or False,
                    assigned_to=order.assigned_to,
                    assigned_vehicle=order.assigned_vehicle,
                    loaded=order.loaded,
                    loaded_at=order.loaded_at.isoformat() if order.loaded_at else None,
                    pso_name=order.pso_name,
                    pso_code=order.pso_code,
                ))
        
        # Calculate statistics - items list shows unloaded orders, but stats count all orders
        # Items list: only validated and unloaded orders (for display)
        total_order = len(validated_unloaded_orders)
        validated = len([o for o in validated_unloaded_orders if o.validated == True])
        printed = len([o for o in validated_unloaded_orders if o.printed == True])
        pending_print = validated - printed  # Only validated orders can be printed
        
        # Loaded/assigned count: count from ALL orders (including loaded ones) for accurate stats
        # This ensures the "Assigned" tile count increases when orders are assigned
        loaded = len([o for o in all_orders if o.loaded == True and o.validated == True])
        
        postponed = len([o for o in validated_unloaded_orders if getattr(o, 'postponed', False) == True])
        
        stats = schemas.RouteWiseOrderStats(
            total_order=total_order,
            validated=validated,
            printed=printed,
            pending_print=max(0, pending_print),
            loaded=loaded,
            postponed=postponed,
        )
        
        result.append(schemas.RouteWiseOrderResponse(
            route_code=route.route_id,
            route_name=route.name,
            items=items,
            stats=stats
        ))
    
    return result


@router.get("/route-wise/{route_code}", response_model=schemas.RouteWiseOrderResponse)
def get_route_wise_orders(route_code: str, db: Session = Depends(get_db)) -> schemas.RouteWiseOrderResponse:
    """Get route-wise orders with statistics"""
    from sqlalchemy import func, case
    from decimal import Decimal
    
    # Get approved orders for the route
    # Order by most recent first
    orders = (
        db.query(models.Order)
        .filter(
            models.Order.route_code == route_code,
            models.Order.status.in_([models.OrderStatusEnum.APPROVED, models.OrderStatusEnum.PARTIALLY_APPROVED]),
            models.Order.loaded == False  # Only unloaded orders
        )
        .order_by(models.Order.created_at.desc())
        .all()
    )
    
    # Build route-wise items
    items = []
    for order in orders:
        for item in order.items:
            if not item.selected:
                continue
                
            unit_price = item.unit_price or item.trade_price
            discount = item.discount_percent or Decimal("0")
            price_after_discount = unit_price * (1 - discount / 100)
            total_price = price_after_discount * (item.total_quantity or (item.quantity + (item.free_goods or 0)))
            
            items.append(schemas.RouteWiseOrderItemResponse(
                id=item.id,
                order_id=order.id,
                order_number=order.order_number,
                memo_number=order.memo_number,
                product_code=item.product_code,
                size=item.pack_size,
                free_goods=item.free_goods or 0,
                total_quantity=item.total_quantity or (item.quantity + (item.free_goods or 0)),
                unit_price=unit_price,
                discount_percent=item.discount_percent or 0,
                total_price=total_price,
                customer_name=order.customer_name,
                customer_code=order.customer_code,
                route_code=order.route_code,
                route_name=order.route_name,
                validated=order.validated,
                printed=order.printed,
                printed_at=order.printed_at.isoformat() if order.printed_at else None,
                postponed=order.postponed or False,
                assigned_to=order.assigned_to,
                assigned_vehicle=order.assigned_vehicle,
                loaded=order.loaded,
                loaded_at=order.loaded_at.isoformat() if order.loaded_at else None,
                pso_name=order.pso_name,
                pso_code=order.pso_code,
            ))
    
    # Calculate statistics
    total_order = len(orders)
    validated = sum(1 for o in orders if o.validated)
    printed = sum(1 for o in orders if o.printed)
    pending_print = validated - printed
    # Count assigned orders (have assigned_to and assigned_vehicle) - matches Assigned Order List count
    # This counts individual orders, not loading groups
    loaded = sum(1 for o in orders if o.assigned_to is not None and o.assigned_vehicle is not None)
    postponed = sum(1 for o in orders if o.postponed or False)
    
    stats = schemas.RouteWiseOrderStats(
        total_order=total_order,
        validated=validated,
        printed=printed,
        pending_print=max(0, pending_print),
        loaded=loaded,
        postponed=postponed,
    )
    
    return schemas.RouteWiseOrderResponse(items=items, stats=stats)


@router.post("/route-wise/print", status_code=status.HTTP_200_OK)
def print_route_wise_orders(payload: schemas.RouteWisePrintRequest, db: Session = Depends(get_db)):
    """Generate and return combined PDF: packing report + individual invoice reports for selected orders"""
    from datetime import datetime
    from fastapi.responses import Response
    from app.reports.packing_report import generate_packing_report
    from app.reports.invoice_report import generate_invoice_report
    from app.models import Company, Depot, Customer
    from PyPDF2 import PdfWriter, PdfReader
    import io
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Filter to only pending print orders (not already printed)
        orders = (
            db.query(models.Order)
            .filter(
                models.Order.id.in_(payload.order_ids),
                models.Order.printed == False  # Only pending print orders
            )
            .all()
        )
        
        if not orders:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="No pending print orders found. All selected orders may already be printed."
            )
        
        # Generate memo numbers for orders that don't have them
        memo_generated = False
        for order in orders:
            if not order.memo_number:
                order.memo_number = generate_memo_number(db)
                memo_generated = True
        
        # Commit memo numbers if any were generated
        if memo_generated:
            db.commit()
        
        # Eager load items to avoid lazy loading issues
        for order in orders:
            _ = order.items  # Trigger lazy load
        
        # Get company info (no depot filtering - use central store)
        company = db.query(models.Company).first()  # Get first company if available
        
        # Always use RENATA LIMITED for invoice reports
        company_name = "RENATA LIMITED"
        company_address = company.address if company else "BLOCK-C, ROAD-6, HOUSE-39, DHOUR, TURAG, DHAKA-1230"
        company_phone = company.phone if company else "8981868, 8981813"
        depot_name = orders[0].depot_name if orders and orders[0].depot_name else "CENTRAL STORE"
        route_name = orders[0].route_name if orders else ""
        area = route_name  # Use route name as area
        
        logger.info(f"Generating reports for {len(orders)} orders, route: {route_name}")
        
        # Create PDF writer to merge all PDFs
        pdf_writer = PdfWriter()
        
        # 1. Generate packing summary report
        try:
            packing_pdf_bytes = generate_packing_report(
                orders=orders,
                company_name=company_name,
                depot_name=depot_name,
                route_name=route_name,
                area=area
            )
            
            if not packing_pdf_bytes or len(packing_pdf_bytes) == 0:
                logger.error("Generated packing PDF is empty")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate packing report: empty result"
                )
            
            # Add packing report to merged PDF
            packing_pdf_reader = PdfReader(io.BytesIO(packing_pdf_bytes))
            for page in packing_pdf_reader.pages:
                pdf_writer.add_page(page)
            
            logger.info(f"Packing report generated successfully, size: {len(packing_pdf_bytes)} bytes")
            
        except Exception as e:
            logger.error(f"Error generating packing report: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate packing report: {str(e)}"
            )
        
        # 2. Generate individual invoice reports for each selected order
        invoice_count = 0
        invoice_errors = []
        for order in orders:
            try:
                # Ensure order has items loaded
                if not hasattr(order, 'items') or not order.items:
                    logger.warning(f"Order {order.id} has no items, skipping invoice generation")
                    invoice_errors.append(f"Order {order.id} (memo: {order.memo_number}): No items found")
                    continue
                
                # Get customer details
                customer = None
                customer_code = getattr(order, 'customer_code', None) or getattr(order, 'customer_id', None)
                if customer_code:
                    customer = db.query(models.Customer).filter(models.Customer.code == customer_code).first()
                
                customer_address = customer.address if customer else getattr(order, 'customer_address', '') or ''
                customer_phone = customer.phone if customer else ''
                
                logger.info(f"Generating invoice report for order {order.id} (memo: {order.memo_number}), items: {len(order.items)}")
                
                # Generate invoice report for this order
                try:
                    invoice_pdf_bytes = generate_invoice_report(
                        order=order,
                        db=db,  # Pass database session
                        company_name=company_name,
                        company_address=company_address,
                        company_phone=company_phone,
                        depot_name=depot_name,
                        customer_address=customer_address,
                        customer_phone=customer_phone
                    )
                except Exception as gen_error:
                    logger.error(f"Error in generate_invoice_report for order {order.id}: {str(gen_error)}", exc_info=True)
                    invoice_errors.append(f"Order {order.id} (memo: {order.memo_number}): Generation failed - {str(gen_error)}")
                    continue
                
                if not invoice_pdf_bytes:
                    logger.warning(f"generate_invoice_report returned None for order {order.id}")
                    invoice_errors.append(f"Order {order.id} (memo: {order.memo_number}): Empty PDF returned")
                    continue
                
                if len(invoice_pdf_bytes) == 0:
                    logger.warning(f"Empty invoice PDF bytes for order {order.id}")
                    invoice_errors.append(f"Order {order.id} (memo: {order.memo_number}): Empty PDF bytes")
                    continue
                
                # Add invoice report to merged PDF
                try:
                    invoice_pdf_reader = PdfReader(io.BytesIO(invoice_pdf_bytes))
                    page_count = len(invoice_pdf_reader.pages)
                    
                    if page_count == 0:
                        logger.warning(f"Invoice PDF has no pages for order {order.id}")
                        invoice_errors.append(f"Order {order.id} (memo: {order.memo_number}): PDF has no pages")
                        continue
                    
                    for page in invoice_pdf_reader.pages:
                        pdf_writer.add_page(page)
                    
                    invoice_count += 1
                    logger.info(f"Invoice report generated successfully for order {order.id} (memo: {order.memo_number}), {page_count} pages added")
                except Exception as read_error:
                    logger.error(f"Error reading/adding invoice PDF for order {order.id}: {str(read_error)}", exc_info=True)
                    invoice_errors.append(f"Order {order.id} (memo: {order.memo_number}): PDF read failed - {str(read_error)}")
                    continue
                    
            except Exception as e:
                logger.error(f"Unexpected error generating invoice report for order {order.id}: {str(e)}", exc_info=True)
                invoice_errors.append(f"Order {order.id} (memo: {order.memo_number}): Unexpected error - {str(e)}")
                continue
        
        logger.info(f"Generated {invoice_count} invoice reports out of {len(orders)} orders")
        if invoice_errors:
            logger.warning(f"Invoice generation errors: {', '.join(invoice_errors)}")
        
        # 3. Merge all PDFs into one
        try:
            merged_pdf_buffer = io.BytesIO()
            pdf_writer.write(merged_pdf_buffer)
            merged_pdf_buffer.seek(0)
            merged_pdf_bytes = merged_pdf_buffer.getvalue()
            
            if not merged_pdf_bytes or len(merged_pdf_bytes) == 0:
                logger.error("Merged PDF is empty")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to merge PDFs: empty result"
                )
            
            logger.info(f"Merged PDF generated successfully, size: {len(merged_pdf_bytes)} bytes, pages: {len(pdf_writer.pages)}")
            
        except Exception as e:
            logger.error(f"Error merging PDFs: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to merge PDFs: {str(e)}"
            )
        
        # Mark orders as printed
        for order in orders:
            order.printed = True
            order.printed_at = datetime.utcnow()
        
        db.commit()
        
        # Return merged PDF as response
        return Response(
            content=merged_pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="packing_report_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.pdf"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in print_route_wise_orders: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )


@router.post("/route-wise/assign", status_code=status.HTTP_200_OK)
def assign_route_wise_orders(payload: schemas.RouteWiseAssignRequest, db: Session = Depends(get_db)):
    """Assign orders to employee and vehicle"""
    from datetime import datetime, date
    from sqlalchemy import func, count
    
    # Verify employee and vehicle exist
    employee = db.query(models.Employee).filter(models.Employee.id == payload.employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    
    orders = (
        db.query(models.Order)
        .filter(models.Order.id.in_(payload.order_ids))
        .all()
    )
    
    if not orders:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No orders found")
    
    # Generate unique loading number
    # Format: YYYYMMDD-XXXX (e.g., 20251125-0001)
    today = date.today()
    date_prefix = today.strftime("%Y%m%d")
    
    # Get the highest loading number for today
    max_loading = db.query(func.max(models.Order.loading_number)).filter(
        models.Order.loading_number.like(f"{date_prefix}-%")
    ).scalar()
    
    if max_loading:
        # Extract the sequence number and increment
        try:
            sequence = int(max_loading.split("-")[1])
            next_sequence = sequence + 1
        except (ValueError, IndexError):
            next_sequence = 1
    else:
        next_sequence = 1
    
    # Get unique route codes from orders
    route_codes_in_orders = list(set([o.route_code for o in orders if o.route_code]))
    route_codes = payload.route_codes if payload.route_codes else route_codes_in_orders
    
    # Append route codes to loading number if multiple routes
    if len(route_codes) > 1:
        route_suffix = "-" + "-".join(sorted(route_codes))[:20]  # Limit length
        loading_number = f"{date_prefix}-{next_sequence:04d}{route_suffix}"
    else:
        loading_number = f"{date_prefix}-{next_sequence:04d}"
    
    # Get route code and area from first order
    route_code = orders[0].route_code if orders else None
    route_name = orders[0].route_name if orders else None
    
    # Assign orders with loading number
    for order in orders:
        order.assigned_to = payload.employee_id
        order.assigned_vehicle = payload.vehicle_id
        order.loaded = True
        order.loaded_at = datetime.utcnow()
        order.assignment_date = datetime.utcnow()
        order.loading_number = loading_number
        order.loading_date = today
        # Show all routes in area if multiple routes
        if len(route_codes) > 1:
            order.area = ", ".join(sorted(route_codes))
        else:
            order.area = route_name or route_code or "N/A"
    
    db.commit()
    
    # Create trip assignment automatically
    try:
        from app.models import Route, Driver, Trip, TransportExpense, RouteStop
        from haversine import haversine, Unit
        
        # Helper function to calculate route distance
        def calc_route_distance(route_id: int) -> float:
            stops = db.query(RouteStop).filter(
                RouteStop.route_id == route_id
            ).order_by(RouteStop.stop_sequence).all()
            
            if len(stops) < 2:
                return 0.0
            
            total_distance = 0.0
            for i in range(len(stops) - 1):
                stop1 = stops[i]
                stop2 = stops[i + 1]
                
                if stop1.latitude and stop1.longitude and stop2.latitude and stop2.longitude:
                    point1 = (float(stop1.latitude), float(stop1.longitude))
                    point2 = (float(stop2.latitude), float(stop2.longitude))
                    distance_km = haversine(point1, point2, unit=Unit.KILOMETERS)
                    total_distance += distance_km
            
            return round(total_distance, 2)
        
        # Helper function to generate trip number
        def gen_trip_number() -> str:
            year = today.strftime("%Y")
            month = today.strftime("%m")
            from sqlalchemy import func
            count = db.query(func.count(Trip.id)).filter(
                func.date(Trip.created_at) == today
            ).scalar() or 0
            return f"TRP-{year}{month}-{str(count + 1).zfill(4)}"
        
        # Find route by route_code
        route = None
        if route_code:
            route = db.query(Route).filter(Route.route_id == route_code).first()
        
        # Find driver - employees and drivers are separate, so just get any available driver
        # Or try to match by name if employee name matches driver name
        driver = None
        employee = db.query(models.Employee).filter(models.Employee.id == payload.employee_id).first()
        
        if employee:
            # Try to find driver by matching first name and last name
            driver = db.query(Driver).filter(
                Driver.first_name == employee.first_name,
                Driver.last_name == employee.last_name
            ).first()
        
        # If no match, get any available driver
        if not driver:
            driver = db.query(Driver).filter(Driver.status == "Available", Driver.is_active == True).first()
        
        # If still no driver, get any active driver
        if not driver:
            driver = db.query(Driver).filter(Driver.is_active == True).first()
        
        # Create trip even if route or driver is missing (with defaults)
        if not route:
            print(f"Warning: Route not found for route_code: {route_code}")
        if not driver:
            print(f"Warning: No driver found for employee_id: {payload.employee_id}")
        
        # Only create trip if we have both route and driver
        if route and driver:
            # Calculate distance
            distance_km = calc_route_distance(route.id)
            
            # Calculate estimated fuel cost
            estimated_fuel_cost = 0.0
            if hasattr(vehicle, 'fuel_rate') and vehicle.fuel_rate and distance_km > 0:
                estimated_fuel_cost = float(vehicle.fuel_rate) * distance_km
            
            # Generate trip number
            trip_number = gen_trip_number()
            
            # Create trip for the first order
            trip_data = {
                "trip_number": trip_number,
                "delivery_id": orders[0].id,  # Link to first order
                "vehicle_id": payload.vehicle_id,
                "driver_id": driver.id,
                "route_id": route.id,
                "trip_date": today,
                "distance_km": distance_km,
                "estimated_fuel_cost": estimated_fuel_cost,
                "status": "Scheduled",
                "notes": f"Auto-created from order assignment. Loading Number: {loading_number}"
            }
            
            db_trip = Trip(**trip_data)
            db.add(db_trip)
            db.flush()  # Flush to get trip.id
            
            # Create auto-calculated fuel expense
            if estimated_fuel_cost > 0:
                fuel_expense = TransportExpense(
                    trip_id=db_trip.id,
                    expense_type="fuel",
                    amount=estimated_fuel_cost,
                    description=f"Auto-calculated fuel cost for {distance_km} km (Loading: {loading_number})",
                    expense_date=today,
                    is_auto_calculated=True
                )
                db.add(fuel_expense)
            
            db.commit()
    except Exception as e:
        # Log error but don't fail the order assignment
        import traceback
        print(f"Error creating trip assignment: {str(e)}")
        traceback.print_exc()
        # Don't rollback - keep the order assignment
        pass
    
    return {
        "message": f"Assigned {len(orders)} order(s) to {employee.first_name} {employee.last_name} and vehicle {vehicle.registration_number}",
        "order_ids": payload.order_ids,
        "employee_id": payload.employee_id,
        "vehicle_id": payload.vehicle_id,
        "loading_number": loading_number,
        "assigned_at": datetime.utcnow().isoformat(),
    }


@router.post("/assigned/from-barcodes", status_code=status.HTTP_200_OK)
def create_assigned_order_list_from_barcodes(payload: schemas.BarcodeAssignRequest, db: Session = Depends(get_db)):
    """Create assigned order list by scanning memo barcodes"""
    from datetime import datetime, date
    from sqlalchemy import func
    
    # Verify employee and vehicle exist
    employee = db.query(models.Employee).filter(models.Employee.id == payload.employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    
    # Find orders by memo numbers
    orders = (
        db.query(models.Order)
        .filter(models.Order.memo_number.in_(payload.memo_numbers))
        .all()
    )
    
    if not orders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"No orders found with the provided memo numbers"
        )
    
    # Check if any orders are already assigned
    already_assigned = [o for o in orders if o.loaded or o.assigned_to]
    if already_assigned:
        memo_list = [o.memo_number for o in already_assigned if o.memo_number]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Some orders are already assigned: {', '.join(memo_list)}"
        )
    
    # Check if all memo numbers were found
    found_memo_numbers = {o.memo_number for o in orders if o.memo_number}
    missing_memos = set(payload.memo_numbers) - found_memo_numbers
    if missing_memos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orders not found for memo numbers: {', '.join(missing_memos)}"
        )
    
    # Generate unique loading number (same format as route-wise assignment)
    today = date.today()
    date_prefix = today.strftime("%Y%m%d")
    
    # Get the highest loading number for today
    max_loading = db.query(func.max(models.Order.loading_number)).filter(
        models.Order.loading_number.like(f"{date_prefix}-%")
    ).scalar()
    
    if max_loading:
        try:
            sequence = int(max_loading.split("-")[1])
            next_sequence = sequence + 1
        except (ValueError, IndexError):
            next_sequence = 1
    else:
        next_sequence = 1
    
    loading_number = f"{date_prefix}-{next_sequence:04d}"
    
    # Get route code and area from first order (if available)
    route_code = orders[0].route_code if orders else None
    route_name = orders[0].route_name if orders else None
    
    # Assign all orders with the same loading number
    assigned_order_ids = []
    for order in orders:
        order.assigned_to = payload.employee_id
        order.assigned_vehicle = payload.vehicle_id
        order.loaded = True
        order.loaded_at = datetime.utcnow()
        order.assignment_date = datetime.utcnow()
        order.loading_number = loading_number
        order.loading_date = today
        order.area = route_name or route_code or "N/A"
        assigned_order_ids.append(order.id)
    
    db.commit()
    
    # Create trip assignment automatically
    try:
        from app.models import Route, Driver, Trip, TransportExpense, RouteStop
        from haversine import haversine, Unit
        
        # Helper function to calculate route distance
        def calc_route_distance(route_id: int) -> float:
            stops = db.query(RouteStop).filter(
                RouteStop.route_id == route_id
            ).order_by(RouteStop.stop_sequence).all()
            
            if len(stops) < 2:
                return 0.0
            
            total_distance = 0.0
            for i in range(len(stops) - 1):
                stop1 = stops[i]
                stop2 = stops[i + 1]
                
                if stop1.latitude and stop1.longitude and stop2.latitude and stop2.longitude:
                    point1 = (float(stop1.latitude), float(stop1.longitude))
                    point2 = (float(stop2.latitude), float(stop2.longitude))
                    distance_km = haversine(point1, point2, unit=Unit.KILOMETERS)
                    total_distance += distance_km
            
            return round(total_distance, 2)
        
        # Helper function to generate trip number
        def gen_trip_number() -> str:
            year = today.strftime("%Y")
            month = today.strftime("%m")
            from sqlalchemy import func
            count = db.query(func.count(Trip.id)).filter(
                func.date(Trip.created_at) == today
            ).scalar() or 0
            return f"TRP-{year}{month}-{str(count + 1).zfill(4)}"
        
        # Find route by route_code from first order
        route = None
        if orders and orders[0].route_code:
            route = db.query(Route).filter(Route.route_id == orders[0].route_code).first()
        
        # Find driver - employees and drivers are separate, so match by name or get any available
        driver = None
        employee = db.query(models.Employee).filter(models.Employee.id == payload.employee_id).first()
        
        if employee:
            # Try to find driver by matching first name and last name
            driver = db.query(Driver).filter(
                Driver.first_name == employee.first_name,
                Driver.last_name == employee.last_name
            ).first()
        
        # If no match, get any available driver
        if not driver:
            driver = db.query(Driver).filter(Driver.status == "Available", Driver.is_active == True).first()
        
        # If still no driver, get any active driver
        if not driver:
            driver = db.query(Driver).filter(Driver.is_active == True).first()
        
        # Create trip even if route or driver is missing (with defaults)
        if not route:
            print(f"Warning: Route not found for route_code: {route_code}")
        if not driver:
            print(f"Warning: No driver found for employee_id: {payload.employee_id}")
        
        # Only create trip if we have both route and driver
        if route and driver:
            # Calculate distance
            distance_km = calc_route_distance(route.id)
            
            # Calculate estimated fuel cost
            estimated_fuel_cost = 0.0
            if hasattr(vehicle, 'fuel_rate') and vehicle.fuel_rate and distance_km > 0:
                estimated_fuel_cost = float(vehicle.fuel_rate) * distance_km
            
            # Generate trip number
            trip_number = gen_trip_number()
            
            # Create trip
            trip_data = {
                "trip_number": trip_number,
                "delivery_id": orders[0].id if orders else None,
                "vehicle_id": payload.vehicle_id,
                "driver_id": driver.id,
                "route_id": route.id,
                "trip_date": today,
                "distance_km": distance_km,
                "estimated_fuel_cost": estimated_fuel_cost,
                "status": "Scheduled",
                "notes": f"Auto-created from barcode assignment. Loading Number: {loading_number}"
            }
            
            db_trip = Trip(**trip_data)
            db.add(db_trip)
            db.flush()  # Flush to get trip.id
            
            # Create auto-calculated fuel expense
            if estimated_fuel_cost > 0:
                fuel_expense = TransportExpense(
                    trip_id=db_trip.id,
                    expense_type="fuel",
                    amount=estimated_fuel_cost,
                    description=f"Auto-calculated fuel cost for {distance_km} km (Loading: {loading_number})",
                    expense_date=today,
                    is_auto_calculated=True
                )
                db.add(fuel_expense)
            
            db.commit()
    except Exception as e:
        # Log error but don't fail the order assignment
        import traceback
        print(f"Error creating trip assignment: {str(e)}")
        traceback.print_exc()
        # Don't rollback - keep the order assignment
        pass
    
    return {
        "message": f"Successfully created assigned order list with {len(orders)} order(s)",
        "loading_number": loading_number,
        "order_ids": assigned_order_ids,
        "memo_numbers": [o.memo_number for o in orders if o.memo_number],
        "employee_id": payload.employee_id,
        "vehicle_id": payload.vehicle_id,
        "assigned_at": datetime.utcnow().isoformat(),
    }


@router.get("/loading-report/{loading_number}")
def get_loading_report(loading_number: str, db: Session = Depends(get_db)):
    """Generate loading report PDF for a specific loading number"""
    from datetime import datetime
    from decimal import Decimal
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from io import BytesIO
    from fastapi.responses import Response
    
    # Get all orders with this loading number
    orders = (
        db.query(models.Order)
        .filter(models.Order.loading_number == loading_number)
        .order_by(models.Order.order_number)
        .all()
    )
    
    if not orders:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No orders found for loading number {loading_number}")
    
    # Get employee and vehicle info from first order
    first_order = orders[0]
    employee = first_order.assigned_employee
    vehicle = first_order.assigned_vehicle_rel
    
    # Create PDF buffer with proper margins to prevent overlap
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch, leftMargin=0.5*inch, rightMargin=0.5*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#000000'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    # Company Header - Center aligned
    company_name = first_order.depot_name if first_order.depot_name else "CENTRAL STORE"
    story.append(Paragraph(company_name.upper(), title_style))
    story.append(Spacer(1, 0.15*inch))
    
    # Report Title - Center aligned
    report_title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#000000'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        leading=16
    )
    story.append(Paragraph("LOADING REPORT", report_title_style))
    story.append(Spacer(1, 0.25*inch))
    
    # Header Information Table
    employee_name = f"{employee.first_name} {employee.last_name or ''}".strip() if employee else "N/A"
    employee_code = employee.employee_id if employee else "N/A"
    vehicle_reg = vehicle.registration_number if vehicle else "N/A"
    loading_date = first_order.loading_date.strftime('%d/%m/%Y') if first_order.loading_date else datetime.utcnow().strftime('%d/%m/%Y')
    area = first_order.area or "N/A"
    
    # Truncate long text to prevent overlap in header
    depot_name = (first_order.depot_name[:25] if len(first_order.depot_name) > 25 else first_order.depot_name) if first_order.depot_name else "CENTRAL STORE"
    delivery_by = f"{employee_name} ({employee_code})"[:30] if len(f"{employee_name} ({employee_code})") > 30 else f"{employee_name} ({employee_code})"
    vehicle_reg_short = vehicle_reg[:15] if len(vehicle_reg) > 15 else vehicle_reg
    loading_number_short = loading_number[:15] if len(loading_number) > 15 else loading_number
    area_short = area[:20] if len(area) > 20 else area
    
    header_data = [
        ['Depot:', depot_name, 'Delivery By:', delivery_by],
        ['Van No.:', vehicle_reg_short, 'Loading No.:', loading_number_short],
        ['Date:', loading_date, 'Area:', area_short],
    ]
    
    # Calculate header table width to fit A4 (8.27 inches, with 0.5 inch margins = 7.27 inches usable)
    header_table = Table(header_data, colWidths=[0.9*inch, 2.4*inch, 1.1*inch, 2.37*inch])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),  # Label columns left-aligned
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),  # Value columns left-aligned
        ('ALIGN', (2, 0), (2, -1), 'LEFT'),  # Label columns left-aligned
        ('ALIGN', (3, 0), (3, -1), 'LEFT'),  # Value columns left-aligned
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTNAME', (3, 0), (3, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('WORDWRAP', (0, 0), (-1, -1), True),  # Enable word wrapping for header
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.3*inch))
    
    # COD/INVOICE Sales Table
    story.append(Paragraph("COD/INVOICE Sales", ParagraphStyle(
        'TableTitle',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=colors.HexColor('#000000'),
        spaceAfter=8,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )))
    
    # Table headers
    table_data = [['Memo No.', 'Value', 'Status', 'PSO', 'Remarks', 'Cash', 'Dues', 'Amend', 'Return']]
    
    # Calculate totals
    total_value = Decimal("0")
    total_cash = Decimal("0")
    total_dues = Decimal("0")
    total_amend = Decimal("0")
    total_return = Decimal("0")
    
    # Add order rows
    for order in orders:
        # Calculate order value
        order_value = Decimal("0")
        for item in order.items:
            unit_price = item.unit_price or item.trade_price or Decimal("0")
            discount = item.discount_percent or Decimal("0")
            price_after_discount = unit_price * (1 - discount / 100)
            total_price = price_after_discount * (item.total_quantity or (item.quantity + (item.free_goods or 0)))
            order_value += total_price
        
        memo_no = (order.memo_number or order.order_number or str(order.id))[:15]  # Use memo_number, fallback to order_number
        value = float(order_value)
        status_val = "C"  # C for COD/Cash
        pso = str(order.pso_code or order.pso_id or "N/A")[:10]  # Limit PSO length
        remarks = ""
        cash = float(order_value)  # Assuming full payment for COD
        dues = 0.00
        amend = 0.00
        return_val = 0.00
        
        table_data.append([
            memo_no,
            f"{value:.2f}",
            status_val,
            pso,
            remarks,
            f"{cash:.2f}",
            f"{dues:.2f}",
            f"{amend:.2f}",
            f"{return_val:.2f}"
        ])
        
        total_value += order_value
        total_cash += Decimal(str(cash))
        total_dues += Decimal(str(dues))
        total_amend += Decimal(str(amend))
        total_return += Decimal(str(return_val))
    
    # Add summary rows - use shorter label to prevent overlap
    business_label = 'Business-wise Total'
    table_data.append([business_label, f"{float(total_value):.2f}", '', '', '', f"{float(total_cash):.2f}", f"{float(total_dues):.2f}", f"{float(total_amend):.2f}", f"{float(total_return):.2f}"])
    table_data.append(['Grand Total:', f"{float(total_value):.2f}", '', '', '', f"{float(total_cash):.2f}", f"{float(total_dues):.2f}", f"{float(total_amend):.2f}", f"{float(total_return):.2f}"])
    
    # Create table - adjust column widths to fit A4 (8.27 inches total, with 0.5 inch margins = 7.27 inches usable)
    # Increased first column width for "Business-wise Total" label to prevent overlap
    # Total: 1.1 + 0.8 + 0.4 + 0.6 + 0.7 + 0.8 + 0.6 + 0.6 + 0.57 = 6.57 inches (fits with margin, prevents overlap)
    table = Table(table_data, colWidths=[1.1*inch, 0.8*inch, 0.4*inch, 0.6*inch, 0.7*inch, 0.8*inch, 0.6*inch, 0.6*inch, 0.57*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0E0E0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#000000')),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),  # Memo No. left-aligned
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),  # Value right-aligned
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),  # Status center-aligned
        ('ALIGN', (3, 0), (3, -1), 'CENTER'),  # PSO center-aligned
        ('ALIGN', (4, 0), (4, -1), 'LEFT'),  # Remarks left-aligned
        ('ALIGN', (5, 0), (5, -1), 'RIGHT'),  # Cash right-aligned
        ('ALIGN', (6, 0), (6, -1), 'RIGHT'),  # Dues right-aligned
        ('ALIGN', (7, 0), (7, -1), 'RIGHT'),  # Amend right-aligned
        ('ALIGN', (8, 0), (8, -1), 'RIGHT'),  # Return right-aligned
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('FONTNAME', (0, 1), (-1, -3), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -3), 7),
        ('WORDWRAP', (0, 0), (-1, -1), True),  # Enable word wrapping
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),  # Memo No. left-aligned
        ('ALIGN', (1, 1), (1, -1), 'RIGHT'),  # Value right-aligned
        ('ALIGN', (2, 1), (2, -1), 'CENTER'),  # Status center-aligned
        ('ALIGN', (3, 1), (3, -1), 'CENTER'),  # PSO center-aligned
        ('ALIGN', (4, 1), (4, -1), 'LEFT'),  # Remarks left-aligned
        ('ALIGN', (5, 1), (5, -1), 'RIGHT'),  # Cash right-aligned
        ('ALIGN', (6, 1), (6, -1), 'RIGHT'),  # Dues right-aligned
        ('ALIGN', (7, 1), (7, -1), 'RIGHT'),  # Amend right-aligned
        ('ALIGN', (8, 1), (8, -1), 'RIGHT'),  # Return right-aligned
        ('GRID', (0, 0), (-1, -3), 0.5, colors.HexColor('#CCCCCC')),
        ('BACKGROUND', (0, -2), (-1, -2), colors.HexColor('#F5F5F5')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E8E8E8')),
        ('FONTNAME', (0, -2), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -2), (-1, -1), 8),
        ('ALIGN', (0, -2), (0, -1), 'LEFT'),  # Summary labels left-aligned
        ('ALIGN', (1, -2), (1, -1), 'RIGHT'),  # Summary values right-aligned
        ('ALIGN', (5, -2), (5, -1), 'RIGHT'),  # Summary cash right-aligned
        ('ALIGN', (6, -2), (6, -1), 'RIGHT'),  # Summary dues right-aligned
        ('ALIGN', (7, -2), (7, -1), 'RIGHT'),  # Summary amend right-aligned
        ('ALIGN', (8, -2), (8, -1), 'RIGHT'),  # Summary return right-aligned
        ('LINEBELOW', (0, -2), (-1, -2), 1, colors.HexColor('#000000')),
        ('LINEBELOW', (0, -1), (-1, -1), 2, colors.HexColor('#000000')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -3), [colors.white, colors.HexColor('#FAFAFA')]),  # Alternating row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -3), [colors.white, colors.HexColor('#FAFAFA')]),  # Alternating row colors
    ]))
    
    story.append(table)
    story.append(Spacer(1, 0.4*inch))
    
    # Footer Section
    footer_data = [
        ['Received:', ''],
        ['Packages on:', ''],
        ['with relevant C. O. D. as stated above', ''],
        ['', ''],
        ['Van Driver/ Delivery In-charge', ''],
        ['Signature:', ''],
        ['Date:', ''],
        ['', ''],
        ['C. O. D. CASH & INVENTORY RECONCILATION', ''],
        ['CASH', ''],
        ['Received Tk.', ''],
        ['UNDELIVERED C. O. D.', ''],
        ['(Details on back of form)', ''],
        ['', ''],
        ['Cashier', ''],
        ['Signature:', ''],
        ['Date:', ''],
    ]
    
    footer_table = Table(footer_data, colWidths=[4.2*inch, 2.57*inch])
    footer_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('WORDWRAP', (0, 0), (-1, -1), True),  # Enable word wrapping for footer
        ('LINEBELOW', (0, 4), (-1, 4), 0.5, colors.HexColor('#000000')),
        ('LINEBELOW', (0, 8), (-1, 8), 0.5, colors.HexColor('#000000')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(footer_table)
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("Page 1 of 1", ParagraphStyle(
        'PageNumber',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#666666'),
        alignment=TA_CENTER,
        fontName='Helvetica'
    )))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Loading_Report_{loading_number}.pdf"
        }
    )


@router.get("/money-receipt/{loading_number}")
def get_money_receipt_report(loading_number: str, db: Session = Depends(get_db)):
    """Generate money receipt PDF for a specific loading number after collection approval"""
    from datetime import datetime
    from decimal import Decimal
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from io import BytesIO
    from fastapi.responses import Response
    
    # Get all orders with this loading number that are collection approved
    orders = (
        db.query(models.Order)
        .filter(
            models.Order.loading_number == loading_number,
            models.Order.collection_approved == True
        )
        .order_by(models.Order.order_number)
        .all()
    )
    
    if not orders:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No approved orders found for loading number {loading_number}")
    
    # Get employee and vehicle info from first order
    first_order = orders[0]
    employee = first_order.assigned_employee
    vehicle = first_order.assigned_vehicle_rel
    
    # Create PDF buffer
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch, leftMargin=0.5*inch, rightMargin=0.5*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#000000'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    # Company Header
    company_name = first_order.depot_name if first_order.depot_name else "CENTRAL STORE"
    story.append(Paragraph(company_name.upper(), title_style))
    story.append(Spacer(1, 0.15*inch))
    
    # Report Title
    report_title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#000000'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        leading=16
    )
    story.append(Paragraph("MONEY RECEIPT", report_title_style))
    story.append(Spacer(1, 0.25*inch))
    
    # Header Information
    employee_name = f"{employee.first_name} {employee.last_name or ''}".strip() if employee else "N/A"
    employee_code = employee.employee_id if employee else "N/A"
    vehicle_reg = vehicle.registration_number if vehicle else "N/A"
    loading_date = first_order.loading_date.strftime('%d/%m/%Y') if first_order.loading_date else datetime.utcnow().strftime('%d/%m/%Y')
    area = first_order.area or "N/A"
    
    header_data = [
        ['Depot:', company_name[:25], 'Delivery By:', f"{employee_name} ({employee_code})"[:30]],
        ['Van No.:', vehicle_reg[:15], 'Loading No.:', loading_number[:15]],
        ['Date:', loading_date, 'Area:', area[:20]],
    ]
    
    header_table = Table(header_data, colWidths=[0.9*inch, 2.4*inch, 1.1*inch, 2.37*inch])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (2, -1), 'LEFT'),
        ('ALIGN', (3, 0), (3, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTNAME', (3, 0), (3, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('WORDWRAP', (0, 0), (-1, -1), True),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Money Receipt Table
    story.append(Paragraph("Collection Details", ParagraphStyle(
        'TableTitle',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=colors.HexColor('#000000'),
        spaceAfter=8,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )))
    
    # Table headers
    table_data = [['Memo No.', 'Total Amount', 'Collected', 'Pending', 'Status']]
    
    # Calculate totals
    total_amount = Decimal("0")
    total_collected = Decimal("0")
    total_pending = Decimal("0")
    
    # Add order rows
    for order in orders:
        # Calculate order total amount
        order_total = Decimal("0")
        for item in order.items:
            unit_price = item.unit_price or item.trade_price or Decimal("0")
            discount = item.discount_percent or Decimal("0")
            price_after_discount = unit_price * (1 - discount / 100)
            total_price = price_after_discount * (item.total_quantity or (item.quantity + (item.free_goods or 0)))
            order_total += total_price
        
        memo_no = (order.memo_number or order.order_number or str(order.id))[:15]
        collected = order.collected_amount or Decimal("0")
        pending = order.pending_amount or Decimal("0")
        status_val = order.collection_status or "Pending"
        
        table_data.append([
            memo_no,
            f"{float(order_total):.2f}",
            f"{float(collected):.2f}",
            f"{float(pending):.2f}",
            status_val[:20]
        ])
        
        total_amount += order_total
        total_collected += collected
        total_pending += pending
    
    # Add summary rows
    table_data.append(['Total:', f"{float(total_amount):.2f}", f"{float(total_collected):.2f}", f"{float(total_pending):.2f}", ''])
    
    # Create table
    table = Table(table_data, colWidths=[1.5*inch, 1.2*inch, 1.2*inch, 1.2*inch, 1.37*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0E0E0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#000000')),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
        ('ALIGN', (4, 0), (4, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -2), 7),
        ('WORDWRAP', (0, 0), (-1, -1), True),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.HexColor('#CCCCCC')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E8E8E8')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 8),
        ('LINEBELOW', (0, -1), (-1, -1), 2, colors.HexColor('#000000')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#FAFAFA')]),
    ]))
    
    story.append(table)
    story.append(Spacer(1, 0.4*inch))
    
    # Footer Section
    footer_data = [
        ['Received Amount:', f"৳{float(total_collected):.2f}"],
        ['', ''],
        ['Cashier', ''],
        ['Signature:', ''],
        ['Date:', datetime.utcnow().strftime('%d/%m/%Y')],
    ]
    
    footer_table = Table(footer_data, colWidths=[3*inch, 4.27*inch])
    footer_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (1, 0), (1, 0), 10),
        ('LINEBELOW', (0, 2), (-1, 2), 0.5, colors.HexColor('#000000')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(footer_table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Money_Receipt_{loading_number}.pdf"
        }
    )


@router.put("/assigned/{order_id}/status", status_code=status.HTTP_200_OK)
def update_assigned_order_status(
    order_id: int,
    status_update: schemas.AssignedOrderStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update assigned order status"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    
    if not order.assigned_to or not order.assigned_vehicle:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order is not assigned")
    
    # Update status based on the new status
    # In a real system, you'd have a delivery_status field or separate delivery table
    if status_update.status == "Delivered":
        # Mark as delivered - you might want to add a delivered_at field
        pass
    elif status_update.status == "Out for Delivery":
        order.loaded = True
        if not order.loaded_at:
            from datetime import datetime
            order.loaded_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": f"Order {order_id} status updated to {status_update.status}",
        "order_id": order_id,
        "status": status_update.status,
    }

@router.post("/assigned/approve-delivery", status_code=status.HTTP_200_OK, response_model=schemas.DeliveryApprovalResponse)
def approve_delivery(
    payload: schemas.DeliveryApprovalRequest,
    db: Session = Depends(get_db)
):
    """Approve delivery for a loading group, update quantities, and move orders to collection approval"""
    from datetime import datetime
    from decimal import Decimal
    
    # Get all orders with this loading number
    orders = (
        db.query(models.Order)
        .filter(models.Order.loading_number == payload.loading_number)
        .all()
    )
    
    if not orders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No orders found for loading number {payload.loading_number}"
        )
    
    # Create a map of memo_number to approval data
    memo_map = {memo.memo_number: memo for memo in payload.memos}
    
    approved_count = 0
    orders_moved_to_collection = []
    
    # Update each order based on memo data
    for order in orders:
        memo_number = order.memo_number or order.order_number
        if not memo_number:
            continue
            
        # Try to find matching memo in approval data
        approval_memo = None
        for memo_key, memo_data in memo_map.items():
            if memo_key == memo_number or memo_key == str(order.id):
                approval_memo = memo_data
                break
        
        if not approval_memo:
            # If no specific approval data, check if fully delivered
            continue
        
        # Calculate total order amount (original loading quantity)
        total_amount = Decimal('0')
        for item in order.items:
            unit_price = item.unit_price or item.trade_price or Decimal('0')
            discount = item.discount_percent or Decimal('0')
            price_after_discount = unit_price * (1 - discount / 100)
            # Use original loading quantity (total_quantity)
            loading_qty_item = item.total_quantity or (item.quantity + (item.free_goods or Decimal('0')))
            total_price = price_after_discount * loading_qty_item
            total_amount += total_price
        
        # Determine collection status based on delivered and returned quantities
        loading_qty = approval_memo.delivered_quantity + approval_memo.returned_quantity
        
        if approval_memo.returned_quantity == 0 and approval_memo.delivered_quantity > 0:
            # Fully delivered (returned = 0, delivered = full)
            # Set to "Pending" so it appears in Approval for Collection (will be marked as Fully Collected after approval)
            order.collection_status = "Pending"
            order.collected_amount = total_amount
            order.pending_amount = Decimal('0')
        elif approval_memo.delivered_quantity == 0:
            # Postponed (delivered = 0, all returned)
            order.collection_status = "Postponed"
            order.collection_type = "Postponed"
            order.collected_amount = Decimal('0')
            order.pending_amount = total_amount
        else:
            # Partial delivered (some delivered, some returned)
            order.collection_status = "Partially Collected"
            order.collection_type = "Partial"
            # Calculate collected amount based on delivered quantity ratio
            if loading_qty > 0:
                delivered_ratio = Decimal(str(approval_memo.delivered_quantity)) / Decimal(str(loading_qty))
                order.collected_amount = total_amount * delivered_ratio
                order.pending_amount = total_amount - order.collected_amount
            else:
                order.collected_amount = Decimal('0')
                order.pending_amount = total_amount
        
        # Mark as pending collection approval (will go to Remaining Cash Deposit list)
        order.collection_approved = False
        order.collection_source = "Web"  # Mark as Web source to distinguish from mobile app
        
        approved_count += 1
        orders_moved_to_collection.append(memo_number)
    
    db.commit()
    
    return {
        "message": f"Delivery approved for loading {payload.loading_number}. {approved_count} order(s) moved to collection approval.",
        "loading_number": payload.loading_number,
        "approved_count": approved_count,
        "orders_moved_to_collection": orders_moved_to_collection
    }


@router.post("/route-wise/validate", status_code=status.HTTP_200_OK)
def validate_route_wise_orders(payload: schemas.RouteWiseValidateRequest, db: Session = Depends(get_db)):
    """Validate orders in a route (only unvalidated orders)"""
    from datetime import datetime
    
    # Get all orders for this route
    query = db.query(models.Order).filter(
        models.Order.route_code == payload.route_code,
        models.Order.status.in_([models.OrderStatusEnum.APPROVED, models.OrderStatusEnum.PARTIALLY_APPROVED])
    )
    
    # If specific order_ids provided, filter by them
    if payload.order_ids:
        query = query.filter(models.Order.id.in_(payload.order_ids))
    
    orders = query.all()
    
    if not orders:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No orders found for this route")
    
    # Only validate orders that are not already validated
    unvalidated_orders = [o for o in orders if not o.validated]
    
    if not unvalidated_orders:
        return {
            "message": "All orders in this route are already validated",
            "route_code": payload.route_code,
            "validated_count": 0,
            "total_orders": len(orders)
        }
    
    # Mark as validated
    validated_count = 0
    for order in unvalidated_orders:
        order.validated = True
        validated_count += 1
    
    db.commit()
    
    return {
        "message": f"Validated {validated_count} order(s) in route {payload.route_code}",
        "route_code": payload.route_code,
        "validated_count": validated_count,
        "total_orders": len(orders),
        "already_validated": len(orders) - validated_count
    }


# Collection approval action endpoints (defined after /collection-approval route)
@router.post("/remaining-cash/collect/{loading_number}", response_model=None)
def collect_remaining_cash(
    loading_number: str,
    payload: schemas.CollectionCollectRequest = schemas.CollectionCollectRequest(memos=None),
    db: Session = Depends(get_db)
):
    """
    Collect remaining cash for a loading number (for Remaining Cash Deposit List).
    If memos provided, update collection amounts. Otherwise, approve all as-is.
    """
    from decimal import Decimal
    
    # Get all orders with this loading number that need collection
    orders = db.query(models.Order).filter(
        models.Order.loading_number == loading_number,
        models.Order.collection_source == "Web",
        models.Order.collection_approved == False
    ).all()
    
    if not orders:
        raise HTTPException(
            status_code=404, 
            detail=f"No orders found for loading number {loading_number} that need cash collection"
        )
    
    # If memos provided, update amounts
    if payload and payload.memos and len(payload.memos) > 0:
        memo_map = {memo.memo_number: memo for memo in payload.memos}
        for order in orders:
            memo_number = order.memo_number or order.order_number or str(order.id)
            # Try to match by memo_number, order_number, or order id
            memo_data = None
            for key in [order.memo_number, order.order_number, str(order.id), f"order-{order.id}"]:
                if key and key in memo_map:
                    memo_data = memo_map[key]
                    break
            
            if memo_data:
                # Update collected, remaining, and deposited amounts
                order.collected_amount = Decimal(str(memo_data.collected_amount))
                order.pending_amount = Decimal(str(memo_data.remaining_amount))
                
                # Update collection status based on amounts
                if order.pending_amount == 0 or order.pending_amount is None or order.pending_amount < Decimal('0.01'):
                    order.collection_status = "Fully Collected"
                    order.collection_type = "Full"
                elif order.collected_amount > 0:
                    order.collection_status = "Partially Collected"
                    order.collection_type = "Partial"
                else:
                    order.collection_status = "Postponed"
                    order.collection_type = "Postponed"
    
    # Approve all orders for collection
    approved_count = 0
    for order in orders:
        order.collection_approved = True
        order.collection_approved_at = datetime.utcnow()
        approved_count += 1
    
    db.commit()
    
    return JSONResponse(content={
        "message": f"Remaining cash collected for loading {loading_number}. {approved_count} order(s) approved.",
        "loading_number": loading_number,
        "approved_count": approved_count,
        "approved_at": datetime.utcnow().isoformat()
    })


@router.post("/collection-approval/approve-loading/{loading_number}", response_model=None)
def approve_collection_by_loading(
    loading_number: str,
    db: Session = Depends(get_db)
):
    """Approve all orders in a loading number for collection processing (for both web and mobile app collections)"""
    # Get all orders with this loading number that need approval
    # Support both Web and Mobile App sources
    orders = db.query(models.Order).filter(
        models.Order.loading_number == loading_number,
        or_(
            models.Order.collection_status == "Partially Collected",
            models.Order.collection_status == "Postponed",
            models.Order.collection_status == "Pending"  # Also allow pending orders
        ),
        models.Order.collection_approved == False
    ).all()
    
    if not orders:
        raise HTTPException(
            status_code=404, 
            detail=f"No orders found for loading number {loading_number} that need collection approval"
        )
    
    approved_count = 0
    for order in orders:
        order.collection_approved = True
        order.collection_approved_at = datetime.utcnow()
        # If collection_status is "Pending" and fully collected, mark as "Fully Collected"
        if order.collection_status == "Pending" and (order.pending_amount == 0 or order.pending_amount is None):
            order.collection_status = "Fully Collected"
            order.collection_type = "Full"
        approved_count += 1
    
    db.commit()
    
    return JSONResponse(content={
        "message": f"Collection approved for loading {loading_number}. {approved_count} order(s) approved.",
        "loading_number": loading_number,
        "approved_count": approved_count,
        "approved_at": datetime.utcnow().isoformat()
    })


@router.post("/{order_id}/approve-collection", response_model=None)
def approve_collection(
    order_id: int,
    db: Session = Depends(get_db)
):
    """Approve an order for collection processing"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.collection_status not in ["Pending", "Partially Collected", "Postponed"]:
        raise HTTPException(
            status_code=400,
            detail=f"Order collection status must be Pending, Partially Collected, or Postponed. Current: {order.collection_status}"
        )
    
    order.collection_approved = True
    order.collection_approved_at = datetime.utcnow()
    # Note: collection_approved_by should be set from authenticated user context
    
    # If collection_status is "Pending" and fully collected, mark as "Fully Collected"
    if order.collection_status == "Pending" and (order.pending_amount == 0 or order.pending_amount is None):
        order.collection_status = "Fully Collected"
        order.collection_type = "Full"
    
    db.commit()
    db.refresh(order)
    
    # Return a simple success response without items
    return JSONResponse(content={
        "id": order.id,
        "order_number": order.order_number,
        "memo_number": order.memo_number,
        "customer_id": order.customer_id,
        "customer_name": order.customer_name,
        "customer_code": order.customer_code,
        "pso_id": order.pso_id,
        "pso_name": order.pso_name,
        "pso_code": order.pso_code,
        "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
        "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
        "collection_status": order.collection_status,
        "collection_approved": order.collection_approved,
        "collection_approved_at": order.collection_approved_at.isoformat() if order.collection_approved_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "message": "Order collection approved successfully"
    })


@router.post("/{order_id}/mark-partial-collection", response_model=schemas.CollectionApprovalOrder)
def mark_partial_collection(
    order_id: int,
    collected_amount: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    """Mark an order as partially collected"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Calculate total amount
    total_amount = Decimal('0')
    for item in order.items:
        item_total = (item.trade_price or Decimal('0')) * (item.total_quantity or Decimal('0'))
        total_amount += item_total
    
    # Set collected amount if provided, otherwise use existing
    if collected_amount is not None:
        order.collected_amount = Decimal(str(collected_amount))
    else:
        order.collected_amount = order.collected_amount or Decimal('0')
    
    order.pending_amount = total_amount - (order.collected_amount or Decimal('0'))
    order.collection_status = "Partially Collected"
    order.collection_type = "Partial"
    order.collection_approved = True
    order.collection_approved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(order)
    
    # Calculate total amount
    total_amount = Decimal('0')
    for item in order.items:
        item_total = (item.trade_price or Decimal('0')) * (item.total_quantity or Decimal('0'))
        total_amount += item_total
    
    return {
        "id": order.id,
        "order_number": order.order_number,
        "memo_number": order.memo_number,
        "customer_id": order.customer_id,
        "customer_name": order.customer_name,
        "customer_code": order.customer_code,
        "pso_id": order.pso_id,
        "pso_name": order.pso_name,
        "pso_code": order.pso_code,
        "delivery_date": order.delivery_date,
        "status": order.status,
        "collection_status": order.collection_status,
        "collection_type": order.collection_type,
        "collected_amount": float(order.collected_amount or 0),
        "pending_amount": float(order.pending_amount or 0),
        "total_amount": float(total_amount),
        "collection_source": order.collection_source,
        "collection_approved": order.collection_approved,
        "collection_approved_at": order.collection_approved_at.isoformat() if order.collection_approved_at else None,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    }


@router.post("/{order_id}/mark-postponed-collection", response_model=schemas.CollectionApprovalOrder)
def mark_postponed_collection(
    order_id: int,
    db: Session = Depends(get_db)
):
    """Mark an order collection as postponed"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Calculate total amount
    total_amount = Decimal('0')
    for item in order.items:
        item_total = (item.trade_price or Decimal('0')) * (item.total_quantity or Decimal('0'))
        total_amount += item_total
    
    order.collected_amount = Decimal('0')
    order.pending_amount = total_amount
    order.collection_status = "Postponed"
    order.collection_type = "Postponed"
    order.collection_approved = True
    order.collection_approved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(order)
    
    # Calculate total amount
    total_amount = Decimal('0')
    for item in order.items:
        item_total = (item.trade_price or Decimal('0')) * (item.total_quantity or Decimal('0'))
        total_amount += item_total
    
    return {
        "id": order.id,
        "order_number": order.order_number,
        "memo_number": order.memo_number,
        "customer_id": order.customer_id,
        "customer_name": order.customer_name,
        "customer_code": order.customer_code,
        "pso_id": order.pso_id,
        "pso_name": order.pso_name,
        "pso_code": order.pso_code,
        "delivery_date": order.delivery_date,
        "status": order.status,
        "collection_status": order.collection_status,
        "collection_type": order.collection_type,
        "collected_amount": float(order.collected_amount or 0),
        "pending_amount": float(order.pending_amount or 0),
        "total_amount": float(total_amount),
        "collection_source": order.collection_source,
        "collection_approved": order.collection_approved,
        "collection_approved_at": order.collection_approved_at.isoformat() if order.collection_approved_at else None,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    }
