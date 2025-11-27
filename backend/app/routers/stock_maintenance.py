from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import date
from decimal import Decimal
from app.database import get_db
from app.models import StockLedger, Product, ProductItemStock, ProductItemStockDetail, Depot

router = APIRouter()

@router.get("/")
def get_stock_ledger(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    """
    Get stock ledger from new product_item_stock tables.
    Returns batch-wise stock details with product information.
    """
    # Query from new product_item_stock_details table
    stock_details = db.query(
        ProductItemStockDetail,
        ProductItemStock,
        Product,
        Depot
    ).join(
        ProductItemStock, ProductItemStockDetail.item_code == ProductItemStock.id
    ).join(
        Product, ProductItemStock.product_id == Product.id
    ).outerjoin(
        Depot, ProductItemStock.depot_id == Depot.id
    ).filter(
        Product.is_active == True  # Only show active products
    ).offset(skip).limit(limit).all()
    
    result = []
    for detail, stock, product, depot in stock_details:
        result.append({
            "id": detail.id,
            "product_id": product.id,
            "product": {
                "id": product.id,
                "name": product.name,
                "code": product.code,
                "old_code": product.old_code,
                "sku": product.sku
            },
            "product_name": product.name,
            "product_code": product.old_code or product.code,
            "depot_id": stock.depot_id,
            "depot": {
                "id": depot.id if depot else None,
                "name": depot.name if depot else None
            } if depot else None,
            "depot_name": depot.name if depot else "",
            "batch": detail.batch_no,
            "batch_number": detail.batch_no,
            "storage_type": detail.storage_type,
            "source_type": detail.source_type,
            "quantity": float(detail.quantity or 0),
            "available_quantity": float(detail.available_quantity or 0),
            "reserved_quantity": float(detail.reserved_quantity or 0),
            "expiry_date": detail.expiry_date.isoformat() if detail.expiry_date else None,
            "expiry": detail.expiry_date.isoformat() if detail.expiry_date else None,
            "manufacturing_date": detail.manufacturing_date.isoformat() if detail.manufacturing_date else None,
            "status": detail.status or "Unrestricted",
        })
    
    return result

@router.get("/product/{product_id}/batches")
def get_product_batches_fefo(
    product_id: int,
    depot_id: Optional[int] = Query(None, description="Deprecated: No longer filters by depot. Use central stock."),
    db: Session = Depends(get_db)
):
    """
    Get batches for a product using FEFO (First Expiry First Out) logic.
    Returns batches from new product_item_stock_details table.
    Only returns batches with numeric batch numbers.
    No depot filtering - uses central stock.
    """
    query = db.query(ProductItemStockDetail, ProductItemStock).join(
        ProductItemStock, ProductItemStockDetail.item_code == ProductItemStock.id
    ).filter(
        ProductItemStock.product_id == product_id,
        ProductItemStockDetail.available_quantity > 0  # Only show batches with available stock
    )
    # No depot filtering - use central stock
    
    results = query.order_by(
        ProductItemStockDetail.expiry_date.asc().nullslast(),  # FEFO: earliest expiry first
        ProductItemStockDetail.batch_no.asc()  # Then by batch number
    ).all()
    
    result = []
    for detail, stock in results:
        batch_no = (detail.batch_no or "").strip()
        # Only include numeric batch numbers
        if batch_no and batch_no.isdigit():
            result.append({
                "batch_number": batch_no,
                "available_quantity": float(detail.available_quantity or 0),
                "expiry_date": detail.expiry_date.isoformat() if detail.expiry_date else None,
                "depot_id": stock.depot_id,
                "storage_type": detail.storage_type,
                "status": detail.status or "Unrestricted",
                "manufacturing_date": detail.manufacturing_date.isoformat() if detail.manufacturing_date else None,
            })
    
    return result

@router.get("/products/validation")
def validate_products_have_batches_with_stock(
    depot_id: Optional[int] = Query(None, description="Filter by depot ID"),
    db: Session = Depends(get_db)
):
    """
    Validate that all products have numeric batches with stock.
    Returns list of products that don't have numeric batches with stock.
    """
    # Get all active products
    products = db.query(Product).filter(Product.is_active == True).all()
    
    products_without_batches = []
    products_without_numeric_batches = []
    products_without_stock = []
    
    for product in products:
        # Get stock records for this product
        stock_query = db.query(ProductItemStock).filter(
            ProductItemStock.product_id == product.id
        )
        
        if depot_id:
            stock_query = stock_query.filter(ProductItemStock.depot_id == depot_id)
        
        stock_records = stock_query.all()
        
        if not stock_records:
            products_without_batches.append({
                "product_id": product.id,
                "product_code": product.code,
                "product_name": product.name,
                "issue": "No stock records found"
            })
            continue
        
        # Check if product has any batches with stock
        has_numeric_batch_with_stock = False
        total_batches = 0
        numeric_batches = 0
        batches_with_stock = 0
        
        for stock_record in stock_records:
            batch_query = db.query(ProductItemStockDetail).filter(
                ProductItemStockDetail.item_code == stock_record.id
            )
            
            all_batches = batch_query.all()
            total_batches += len(all_batches)
            
            for batch_detail in all_batches:
                batch_no = (batch_detail.batch_no or "").strip()
                available_qty = float(batch_detail.available_quantity or 0)
                
                if batch_no and batch_no.isdigit():
                    numeric_batches += 1
                    if available_qty > 0:
                        batches_with_stock += 1
                        has_numeric_batch_with_stock = True
        
        if total_batches == 0:
            products_without_batches.append({
                "product_id": product.id,
                "product_code": product.code,
                "product_name": product.name,
                "issue": "No batches found"
            })
        elif numeric_batches == 0:
            products_without_numeric_batches.append({
                "product_id": product.id,
                "product_code": product.code,
                "product_name": product.name,
                "issue": f"Has {total_batches} batch(es) but none are numeric"
            })
        elif batches_with_stock == 0:
            products_without_stock.append({
                "product_id": product.id,
                "product_code": product.code,
                "product_name": product.name,
                "issue": f"Has {numeric_batches} numeric batch(es) but none have available stock"
            })
    
    return {
        "summary": {
        "total_products": len(products),
        "products_without_batches": len(products_without_batches),
        "products_without_numeric_batches": len(products_without_numeric_batches),
        "products_without_stock": len(products_without_stock),
        "valid_products": len(products) - len(products_without_batches) - len(products_without_numeric_batches) - len(products_without_stock)
    },
    "products_without_batches": products_without_batches,
    "products_without_numeric_batches": products_without_numeric_batches,
    "products_without_stock": products_without_stock
}

@router.get("/product/{product_id}/current-stock")
def get_product_current_stock(
    product_id: int,
    depot_id: Optional[int] = Query(None, description="Filter by depot ID"),
    db: Session = Depends(get_db)
):
    """
    Get current total available stock for a product across all batches from new tables.
    """
    query = db.query(func.sum(ProductItemStockDetail.available_quantity)).join(
        ProductItemStock, ProductItemStockDetail.item_code == ProductItemStock.id
    ).filter(
        ProductItemStock.product_id == product_id,
        ProductItemStockDetail.available_quantity > 0
    )
    
    if depot_id:
        query = query.filter(ProductItemStock.depot_id == depot_id)
    
    total_stock = query.scalar() or Decimal("0")
    
    # Get product unit of measure
    product = db.query(Product).filter(Product.id == product_id).first()
    unit = product.unit_of_measure if product else "PCS"
    
    return {
        "product_id": product_id,
        "depot_id": depot_id,
        "current_stock": float(total_stock),
        "unit": unit
    }

