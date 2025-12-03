from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from app.database import get_db
from app.models import (
    DepotTransfer, DepotTransferItem, Depot, Product, 
    ProductItemStock, ProductItemStockDetail, Employee,
    DepotTransferStatusEnum
)
from pydantic import BaseModel
from typing import Optional as Opt

router = APIRouter(prefix="/depot-transfers", tags=["Depot Transfers"])


# Schemas
class DepotTransferItemCreate(BaseModel):
    product_id: int
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    quantity: Decimal
    unit_price: Decimal = Decimal("0")


class DepotTransferCreate(BaseModel):
    transfer_number: Optional[str] = None
    transfer_date: date
    from_depot_id: int
    to_depot_id: int
    vehicle_id: Optional[int] = None
    driver_name: Optional[str] = None
    transfer_note: Optional[str] = None
    remarks: Optional[str] = None
    items: List[DepotTransferItemCreate]


class DepotTransferResponse(BaseModel):
    id: int
    transfer_number: str
    transfer_date: date
    from_depot_id: int
    from_depot_name: Optional[str] = None
    to_depot_id: int
    to_depot_name: Optional[str] = None
    vehicle_id: Optional[int] = None
    vehicle_registration: Optional[str] = None
    driver_name: Optional[str] = None
    status: str
    transfer_note: Optional[str] = None
    remarks: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    received_by: Optional[int] = None
    received_at: Optional[datetime] = None
    total_items: int
    total_quantity: Decimal
    total_value: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True


class DepotTransferItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    quantity: Decimal
    unit_price: Decimal
    
    class Config:
        from_attributes = True


class DepotTransferDetailResponse(DepotTransferResponse):
    items: List[DepotTransferItemResponse]


def generate_transfer_number(db: Session) -> str:
    """Generate unique transfer number"""
    today = date.today()
    date_prefix = today.strftime("%Y%m%d")
    
    # Get the highest transfer number for today
    max_transfer = db.query(func.max(DepotTransfer.transfer_number)).filter(
        DepotTransfer.transfer_number.like(f"DT-{date_prefix}-%")
    ).scalar()
    
    if max_transfer:
        try:
            sequence = int(max_transfer.split("-")[2])
            next_sequence = sequence + 1
        except (ValueError, IndexError):
            next_sequence = 1
    else:
        next_sequence = 1
    
    return f"DT-{date_prefix}-{next_sequence:04d}"


@router.post("/", response_model=DepotTransferDetailResponse, status_code=status.HTTP_201_CREATED)
def create_depot_transfer(transfer: DepotTransferCreate, db: Session = Depends(get_db)):
    """Create a new depot transfer request"""
    # Validate depots
    from_depot = db.query(Depot).filter(Depot.id == transfer.from_depot_id).first()
    if not from_depot:
        raise HTTPException(status_code=404, detail="Source depot not found")
    
    to_depot = db.query(Depot).filter(Depot.id == transfer.to_depot_id).first()
    if not to_depot:
        raise HTTPException(status_code=404, detail="Destination depot not found")
    
    if transfer.from_depot_id == transfer.to_depot_id:
        raise HTTPException(status_code=400, detail="Source and destination depots cannot be the same")
    
    # Generate transfer number if not provided
    transfer_number = transfer.transfer_number or generate_transfer_number(db)
    
    # Check if transfer number already exists
    existing = db.query(DepotTransfer).filter(DepotTransfer.transfer_number == transfer_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Transfer number already exists")
    
    # Validate items
    if not transfer.items:
        raise HTTPException(status_code=400, detail="At least one item is required")
    
    # Check stock availability for each item
    for item in transfer.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        # Check stock in source depot
        stock = db.query(ProductItemStock).filter(
            ProductItemStock.product_id == item.product_id,
            ProductItemStock.depot_id == transfer.from_depot_id
        ).first()
        
        if not stock or stock.stock_qty < item.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for product {product.name or product.code}. Available: {stock.stock_qty if stock else 0}, Required: {item.quantity}"
            )
    
    # Create transfer - set status to PENDING so it's ready for approval
    db_transfer = DepotTransfer(
        transfer_number=transfer_number,
        transfer_date=transfer.transfer_date,
        from_depot_id=transfer.from_depot_id,
        to_depot_id=transfer.to_depot_id,
        vehicle_id=transfer.vehicle_id,
        driver_name=transfer.driver_name,
        transfer_note=transfer.transfer_note,
        remarks=transfer.remarks,
        status=DepotTransferStatusEnum.PENDING
    )
    db.add(db_transfer)
    db.flush()
    
    # Create transfer items
    total_quantity = Decimal("0")
    total_value = Decimal("0")
    for item in transfer.items:
        db_item = DepotTransferItem(
            transfer_id=db_transfer.id,
            product_id=item.product_id,
            batch_number=item.batch_number,
            expiry_date=item.expiry_date,
            quantity=item.quantity,
            unit_price=item.unit_price
        )
        db.add(db_item)
        total_quantity += item.quantity
        total_value += item.quantity * item.unit_price
    
    db.commit()
    
    # Reload transfer with items relationship
    db.refresh(db_transfer)
    # Query again to ensure items are loaded
    db_transfer = db.query(DepotTransfer).filter(DepotTransfer.id == db_transfer.id).first()
    
    # Build detailed response with items
    return build_transfer_detail_response(db_transfer, db)


@router.get("/", response_model=List[DepotTransferResponse])
def get_depot_transfers(
    status_filter: Optional[str] = Query(None, alias="status_filter"),
    from_depot_id: Optional[int] = Query(None, alias="from_depot_id"),
    to_depot_id: Optional[int] = Query(None, alias="to_depot_id"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get list of depot transfers"""
    query = db.query(DepotTransfer)
    
    if status_filter:
        query = query.filter(DepotTransfer.status == status_filter)
    
    if from_depot_id:
        query = query.filter(DepotTransfer.from_depot_id == from_depot_id)
    
    if to_depot_id:
        query = query.filter(DepotTransfer.to_depot_id == to_depot_id)
    
    transfers = query.order_by(DepotTransfer.created_at.desc()).offset(skip).limit(limit).all()
    
    return [build_transfer_response(transfer, db) for transfer in transfers]


@router.get("/{transfer_id}", response_model=DepotTransferDetailResponse)
def get_depot_transfer(transfer_id: int, db: Session = Depends(get_db)):
    """Get depot transfer details"""
    transfer = db.query(DepotTransfer).filter(DepotTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Depot transfer not found")
    
    return build_transfer_detail_response(transfer, db)


class ApproveRequest(BaseModel):
    approved_by: int


@router.post("/{transfer_id}/approve", response_model=DepotTransferDetailResponse)
def approve_depot_transfer(
    transfer_id: int,
    request: ApproveRequest,
    db: Session = Depends(get_db)
):
    """Approve depot transfer - reduces stock from source depot"""
    transfer = db.query(DepotTransfer).filter(DepotTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Depot transfer not found")
    
    status_value = transfer.status.value if hasattr(transfer.status, 'value') else str(transfer.status)
    if status_value != "Pending":
        raise HTTPException(status_code=400, detail=f"Cannot approve transfer with status: {status_value}. Only Pending transfers can be approved.")
    
    # Verify approver exists
    approver = db.query(Employee).filter(Employee.id == request.approved_by).first()
    if not approver:
        raise HTTPException(status_code=404, detail="Approver not found")
    
    # Check stock availability and reduce stock
    for item in transfer.items:
        # Get stock in source depot
        stock = db.query(ProductItemStock).filter(
            ProductItemStock.product_id == item.product_id,
            ProductItemStock.depot_id == transfer.from_depot_id
        ).first()
        
        if not stock:
            raise HTTPException(
                status_code=400,
                detail=f"Stock not found for product {item.product_id} in source depot"
            )
        
        if stock.stock_qty < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for product {item.product_id}. Available: {stock.stock_qty}, Required: {item.quantity}"
            )
        
        # Reduce stock from source depot
        stock.stock_qty -= item.quantity
        stock.issue += item.quantity
        
        # Update batch-wise stock if batch number is provided
        if item.batch_number:
            stock_detail = db.query(ProductItemStockDetail).filter(
                ProductItemStockDetail.item_code == stock.id,
                ProductItemStockDetail.batch_no == item.batch_number
            ).first()
            
            if stock_detail:
                if stock_detail.quantity < item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient batch stock for product {item.product_id}, batch {item.batch_number}"
                    )
                stock_detail.quantity -= item.quantity
                stock_detail.available_quantity -= item.quantity
    
    # Update transfer status - set to IN_TRANSIT after approval (ready for receive)
    transfer.status = DepotTransferStatusEnum.IN_TRANSIT
    transfer.approved_by = request.approved_by
    transfer.approved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(transfer)
    
    return build_transfer_detail_response(transfer, db)


class ReceiveRequest(BaseModel):
    received_by: int


@router.post("/{transfer_id}/receive", response_model=DepotTransferDetailResponse)
def receive_depot_transfer(
    transfer_id: int,
    request: ReceiveRequest,
    db: Session = Depends(get_db)
):
    """Receive depot transfer - increases stock in destination depot"""
    transfer = db.query(DepotTransfer).filter(DepotTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Depot transfer not found")
    
    status_value = transfer.status.value if hasattr(transfer.status, 'value') else str(transfer.status)
    if status_value != "In Transit":
        raise HTTPException(status_code=400, detail=f"Cannot receive transfer with status: {status_value}. Only In Transit transfers can be received.")
    
    # Verify receiver exists
    receiver = db.query(Employee).filter(Employee.id == request.received_by).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    # Increase stock in destination depot
    for item in transfer.items:
        # Get or create stock in destination depot
        stock = db.query(ProductItemStock).filter(
            ProductItemStock.product_id == item.product_id,
            ProductItemStock.depot_id == transfer.to_depot_id
        ).first()
        
        if not stock:
            # Get product to create stock entry
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
            
            # Create new stock entry
            stock = ProductItemStock(
                product_id=item.product_id,
                product_code=product.code or str(product.id),
                sku_code=product.code or str(product.id),
                depot_id=transfer.to_depot_id,
                stock_qty=Decimal("0"),
                gross_stock_receive=Decimal("0"),
                issue=Decimal("0")
            )
            db.add(stock)
            db.flush()
        
        # Increase stock in destination depot
        stock.stock_qty += item.quantity
        stock.gross_stock_receive += item.quantity
        
        # Update or create batch-wise stock if batch number is provided
        if item.batch_number:
            stock_detail = db.query(ProductItemStockDetail).filter(
                ProductItemStockDetail.item_code == stock.id,
                ProductItemStockDetail.batch_no == item.batch_number
            ).first()
            
            if not stock_detail:
                # Create new batch detail
                stock_detail = ProductItemStockDetail(
                    item_code=stock.id,
                    batch_no=item.batch_number,
                    expiry_date=item.expiry_date,
                    quantity=Decimal("0"),
                    available_quantity=Decimal("0")
                )
                db.add(stock_detail)
            
            stock_detail.quantity += item.quantity
            stock_detail.available_quantity += item.quantity
    
    # Update transfer status
    transfer.status = DepotTransferStatusEnum.RECEIVED
    transfer.received_by = request.received_by
    transfer.received_at = datetime.utcnow()
    
    db.commit()
    db.refresh(transfer)
    
    return build_transfer_detail_response(transfer, db)


def build_transfer_response(transfer: DepotTransfer, db: Session) -> DepotTransferResponse:
    """Build transfer response with aggregated data"""
    from_depot = db.query(Depot).filter(Depot.id == transfer.from_depot_id).first()
    to_depot = db.query(Depot).filter(Depot.id == transfer.to_depot_id).first()
    
    # Calculate totals
    total_items = len(transfer.items)
    total_quantity = sum(item.quantity for item in transfer.items)
    total_value = sum(item.quantity * item.unit_price for item in transfer.items)
    
    vehicle_registration = None
    if transfer.vehicle_id:
        from app.models import Vehicle
        vehicle = db.query(Vehicle).filter(Vehicle.id == transfer.vehicle_id).first()
        if vehicle:
            vehicle_registration = vehicle.registration_number
    
    return DepotTransferResponse(
        id=transfer.id,
        transfer_number=transfer.transfer_number,
        transfer_date=transfer.transfer_date,
        from_depot_id=transfer.from_depot_id,
        from_depot_name=from_depot.name if from_depot else None,
        to_depot_id=transfer.to_depot_id,
        to_depot_name=to_depot.name if to_depot else None,
        vehicle_id=transfer.vehicle_id,
        vehicle_registration=vehicle_registration,
        driver_name=transfer.driver_name,
        status=transfer.status.value if hasattr(transfer.status, 'value') else str(transfer.status),
        transfer_note=transfer.transfer_note,
        remarks=transfer.remarks,
        approved_by=transfer.approved_by,
        approved_at=transfer.approved_at,
        received_by=transfer.received_by,
        received_at=transfer.received_at,
        total_items=total_items,
        total_quantity=total_quantity,
        total_value=total_value,
        created_at=transfer.created_at
    )


def build_transfer_detail_response(transfer: DepotTransfer, db: Session) -> DepotTransferDetailResponse:
    """Build detailed transfer response with items"""
    base_response = build_transfer_response(transfer, db)
    
    items = []
    for item in transfer.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        items.append(DepotTransferItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name if product else None,
            product_code=product.code if product else None,
            batch_number=item.batch_number,
            expiry_date=item.expiry_date,
            quantity=item.quantity,
            unit_price=item.unit_price
        ))
    
    return DepotTransferDetailResponse(
        **base_response.model_dump(),
        items=items
    )

