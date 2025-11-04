from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime

# Authentication schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class SignupRequest(BaseModel):
    employee_id: str
    first_name: str
    last_name: Optional[str] = None
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    depot_id: Optional[int] = None
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: int
    employee_id: str
    email: Optional[str]
    first_name: str
    last_name: Optional[str]
    role: str
    department: Optional[str]
    depot_id: Optional[int]
    
    class Config:
        from_attributes = True

# Base schemas
class CompanyBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    is_active: bool = True

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class Company(CompanyBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Depot schemas
class DepotBase(BaseModel):
    name: str
    code: str
    company_id: int
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True

class DepotCreate(DepotBase):
    pass

class Depot(DepotBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Employee schemas
class EmployeeBase(BaseModel):
    employee_id: str
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    depot_id: Optional[int] = None
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Customer schemas
class CustomerBase(BaseModel):
    name: str
    code: Optional[str] = None  # Auto-generated if not provided
    type: str = "Retailer"
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    credit_limit: Decimal = 0
    priority: str = "Medium"  # High, Medium, Low
    delivery_status_block: bool = False
    delivery_status_open: bool = True
    credit_status_cash: bool = False
    credit_status_credit: bool = True
    payment_days: Optional[int] = None
    is_active: bool = True

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Vendor schemas
class VendorBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    is_active: bool = True

class VendorCreate(VendorBase):
    pass

class Vendor(VendorBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Product schemas
class ProductBase(BaseModel):
    name: str
    code: Optional[str] = None  # SKU/Product Code (auto-generated)
    sku: Optional[str] = None  # Auto-generated SKU
    old_code: Optional[str] = None
    new_code: Optional[str] = None
    generic_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    hsn_code: Optional[str] = None
    unit_of_measure: str = "PCS"
    base_price: Decimal = 0
    primary_packaging: Optional[str] = None
    product_type_commercial: bool = False
    product_type_sample: bool = False
    product_type_institutional: bool = False
    product_type_export: bool = False
    ifc_value1: Optional[Decimal] = None
    ifc_value2: Optional[Decimal] = None
    ifc_result: Optional[Decimal] = None
    mc_value1: Optional[Decimal] = None
    mc_value2: Optional[Decimal] = None
    mc_value3: Optional[Decimal] = None
    mc_result: Optional[Decimal] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Vehicle schemas
class VehicleBase(BaseModel):
    vehicle_id: str
    vehicle_type: str
    registration_number: str
    capacity: Optional[Decimal] = None
    depot_id: Optional[int] = None
    vendor: Optional[str] = None
    status: str = "Active"
    is_active: bool = True

class VehicleCreate(VehicleBase):
    pass

class Vehicle(VehicleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Driver schemas
class DriverBase(BaseModel):
    driver_id: str
    first_name: str
    last_name: Optional[str] = None
    license_number: str
    license_expiry: Optional[date] = None
    contact: Optional[str] = None
    vehicle_id: Optional[str] = None
    route: Optional[str] = None
    status: str = "Available"
    is_active: bool = True

class DriverCreate(DriverBase):
    pass

class Driver(DriverBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Stock Ledger schemas
class StockLedgerBase(BaseModel):
    product_id: int
    batch: Optional[str] = None
    depot_id: int
    storage_type: Optional[str] = None
    quantity: Decimal
    reserved_quantity: Decimal = 0
    available_quantity: Decimal
    expiry_date: Optional[date] = None
    status: str = "Unrestricted"

class StockLedger(StockLedgerBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

