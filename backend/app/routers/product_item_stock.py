from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from decimal import Decimal
from app.database import get_db
from app.models import ProductItemStock, ProductItemStockDetail, Product, Depot
from app.schemas import (
    ProductItemStock as ProductItemStockSchema,
    ProductItemStockCreate,
    ProductItemStockUpdate,
    ProductItemStockDetail as ProductItemStockDetailSchema,
    ProductItemStockDetailCreate
)

router = APIRouter()

@router.get("/", response_model=List[ProductItemStockSchema])
def get_product_item_stock(
    skip: int = 0,
    limit: int = 100,
    product_id: Optional[int] = Query(None),
    depot_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all product item stock records"""
    query = db.query(ProductItemStock)
    
    if product_id:
        query = query.filter(ProductItemStock.product_id == product_id)
    if depot_id:
        query = query.filter(ProductItemStock.depot_id == depot_id)
    
    stock_records = query.offset(skip).limit(limit).all()
    return stock_records

@router.get("/{stock_id}", response_model=ProductItemStockSchema)
def get_product_item_stock_by_id(stock_id: int, db: Session = Depends(get_db)):
    """Get a specific product item stock record with details"""
    stock = db.query(ProductItemStock).filter(ProductItemStock.id == stock_id).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Product item stock not found")
    return stock

@router.post("/", response_model=ProductItemStockSchema)
def create_product_item_stock(
    stock_data: ProductItemStockCreate,
    db: Session = Depends(get_db)
):
    """Create a new product item stock record"""
    # Verify product exists
    product = db.query(Product).filter(Product.id == stock_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if stock record already exists for this product and depot
    existing = db.query(ProductItemStock).filter(
        ProductItemStock.product_id == stock_data.product_id,
        ProductItemStock.depot_id == stock_data.depot_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Stock record already exists for this product and depot")
    
    stock = ProductItemStock(**stock_data.dict())
    db.add(stock)
    db.commit()
    db.refresh(stock)
    return stock

@router.put("/{stock_id}", response_model=ProductItemStockSchema)
def update_product_item_stock(
    stock_id: int,
    stock_data: ProductItemStockUpdate,
    db: Session = Depends(get_db)
):
    """Update a product item stock record"""
    stock = db.query(ProductItemStock).filter(ProductItemStock.id == stock_id).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Product item stock not found")
    
    for key, value in stock_data.dict().items():
        setattr(stock, key, value)
    
    db.commit()
    db.refresh(stock)
    return stock

@router.get("/{stock_id}/details", response_model=List[ProductItemStockDetailSchema])
def get_stock_details(
    stock_id: int,
    db: Session = Depends(get_db)
):
    """Get all batch details for a product item stock"""
    stock = db.query(ProductItemStock).filter(ProductItemStock.id == stock_id).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Product item stock not found")
    
    return stock.details

@router.post("/{stock_id}/details", response_model=ProductItemStockDetailSchema)
def create_stock_detail(
    stock_id: int,
    detail_data: ProductItemStockDetailCreate,
    db: Session = Depends(get_db)
):
    """Create a new batch detail for product item stock"""
    stock = db.query(ProductItemStock).filter(ProductItemStock.id == stock_id).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Product item stock not found")
    
    # Validate batch number is numeric
    batch_no_clean = (detail_data.batch_no or "").strip()
    if not batch_no_clean:
        raise HTTPException(status_code=400, detail="Batch number is required")
    
    if not batch_no_clean.isdigit():
        raise HTTPException(
            status_code=400, 
            detail=f"Batch number '{batch_no_clean}' must be numeric only (digits only)"
        )
    
    # Validate quantity is positive
    if detail_data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
    
    # Check if batch already exists
    existing = db.query(ProductItemStockDetail).filter(
        ProductItemStockDetail.item_code == stock_id,
        ProductItemStockDetail.batch_no == batch_no_clean
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Batch already exists for this stock record")
    
    # Update detail_data with cleaned batch number
    detail_data_dict = detail_data.dict(exclude={"item_code"})
    detail_data_dict["batch_no"] = batch_no_clean
    
    detail = ProductItemStockDetail(
        item_code=stock_id,
        **detail_data_dict
    )
    db.add(detail)
    
    # Update stock quantities
    stock.stock_qty += detail.quantity
    stock.gross_stock_receive += detail.quantity
    
    db.commit()
    db.refresh(detail)
    return detail

@router.get("/product/{product_id}/summary", response_model=dict)
def get_product_stock_summary(
    product_id: int,
    depot_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get stock summary for a product across all depots or specific depot"""
    query = db.query(ProductItemStock).filter(ProductItemStock.product_id == product_id)
    
    if depot_id:
        query = query.filter(ProductItemStock.depot_id == depot_id)
    
    stock_records = query.all()
    
    total_stock = sum(float(record.stock_qty) for record in stock_records)
    total_receive = sum(float(record.gross_stock_receive) for record in stock_records)
    total_issue = sum(float(record.issue) for record in stock_records)
    total_adjusted_in = sum(float(record.adjusted_stock_in_qty) for record in stock_records)
    total_adjusted_out = sum(float(record.adjusted_stock_out_qty) for record in stock_records)
    
    # Count batches
    total_batches = 0
    for record in stock_records:
        total_batches += len(record.details)
    
    return {
        "product_id": product_id,
        "depot_id": depot_id,
        "total_stock_qty": total_stock,
        "total_gross_receive": total_receive,
        "total_issue": total_issue,
        "total_adjusted_in": total_adjusted_in,
        "total_adjusted_out": total_adjusted_out,
        "total_batches": total_batches,
        "depot_count": len(set(record.depot_id for record in stock_records if record.depot_id))
    }

