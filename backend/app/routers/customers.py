from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Customer
from app.schemas import CustomerCreate, Customer as CustomerSchema

router = APIRouter()

def generate_customer_code(db: Session) -> str:
    """Generate a unique customer code in format CUST-XXXX"""
    # Get all existing customers with codes that match the pattern
    existing_customers = db.query(Customer).filter(
        Customer.code.like("CUST-%")
    ).all()
    
    if existing_customers:
        # Extract all numbers from existing codes
        code_numbers = []
        for customer in existing_customers:
            if customer.code:
                try:
                    # Extract number from code like CUST-0001
                    num = int(customer.code.split("-")[1])
                    code_numbers.append(num)
                except (ValueError, IndexError):
                    continue
        
        # Find the highest number
        if code_numbers:
            new_num = max(code_numbers) + 1
        else:
            new_num = 1
    else:
        # No customers exist or no codes match format, start from 1
        new_num = 1
    
    # Format as CUST-0001, CUST-0002, etc.
    code = f"CUST-{new_num:04d}"
    
    # Double-check if code already exists (safety check)
    while db.query(Customer).filter(Customer.code == code).first():
        new_num += 1
        code = f"CUST-{new_num:04d}"
    
    return code

@router.get("/", response_model=List[CustomerSchema])
def get_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    customers = db.query(Customer).offset(skip).limit(limit).all()
    return customers

@router.get("/code/{code}", response_model=CustomerSchema)
def get_customer_by_code(code: str, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.code == code).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.post("/", response_model=CustomerSchema)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    customer_data = customer.model_dump()
    
    # Auto-generate code if not provided
    if not customer_data.get("code"):
        customer_data["code"] = generate_customer_code(db)
    else:
        # Check if provided code already exists
        if db.query(Customer).filter(Customer.code == customer_data["code"]).first():
            raise HTTPException(status_code=400, detail=f"Customer with code {customer_data['code']} already exists")

    if not customer_data.get("sold_to_party"):
        customer_data["sold_to_party"] = customer_data.get("address")

    db_customer = Customer(**customer_data)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.put("/{customer_id}", response_model=CustomerSchema)
def update_customer(customer_id: int, customer: CustomerCreate, db: Session = Depends(get_db)):
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer_data = customer.model_dump(exclude_unset=True)
    
    # Don't allow changing the code during update
    if "code" in customer_data:
        # Only update if it's the same code
        if customer_data["code"] != db_customer.code:
            raise HTTPException(status_code=400, detail="Customer code cannot be changed after creation")
        del customer_data["code"]
    
    # Update customer fields
    for key, value in customer_data.items():
        setattr(db_customer, key, value)

    if "address" in customer_data and "sold_to_party" not in customer_data:
        if not db_customer.sold_to_party or db_customer.sold_to_party == db_customer.address:
            db_customer.sold_to_party = db_customer.address
    
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    db.delete(db_customer)
    db.commit()
    return {"message": "Customer deleted successfully"}

