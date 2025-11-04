from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Product
from app.schemas import ProductCreate, ProductUpdate, Product as ProductSchema

router = APIRouter()

def generate_product_sku(db: Session) -> str:
    """Generate a unique product SKU in format PRD-XXXX"""
    existing_products = db.query(Product).filter(
        Product.sku.like("PRD-%")
    ).all()
    
    if existing_products:
        code_numbers = []
        for product in existing_products:
            if product.sku:
                try:
                    num = int(product.sku.split("-")[1])
                    code_numbers.append(num)
                except (ValueError, IndexError):
                    continue
        
        if code_numbers:
            new_num = max(code_numbers) + 1
        else:
            new_num = 1
    else:
        new_num = 1
    
    sku = f"PRD-{new_num:04d}"
    
    while db.query(Product).filter(Product.sku == sku).first():
        new_num += 1
        sku = f"PRD-{new_num:04d}"
    
    return sku

@router.get("/", response_model=List[ProductSchema])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(Product).offset(skip).limit(limit).all()
    return products

@router.get("/{product_id}", response_model=ProductSchema)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/", response_model=ProductSchema)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    # Auto-generate SKU if not provided
    if not product.sku:
        product.sku = generate_product_sku(db)
    
    # Use SKU as code if code not provided
    if not product.code:
        product.code = product.sku
    
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.put("/{product_id}", response_model=ProductSchema)
def update_product(product_id: int, product: ProductUpdate, db: Session = Depends(get_db)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(db_product)
    db.commit()
    return {"message": "Product deleted successfully"}

