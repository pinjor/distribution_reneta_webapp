from sqlalchemy import Column, Integer, String, Boolean, Text, Numeric, Date, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), default="India")
    pincode = Column(String(20))
    phone = Column(String(50))
    email = Column(String(255))
    gstin = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Depot(Base):
    __tablename__ = "depots"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(20))
    phone = Column(String(50))
    email = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    company = relationship("Company")

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    email = Column(String(255), unique=True)
    phone = Column(String(20))
    hashed_password = Column(String(255))
    department = Column(String(100))
    designation = Column(String(100))
    role = Column(String(50), default="user")  # user, admin, manager
    depot_id = Column(Integer, ForeignKey("depots.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    depot = relationship("Depot")

class PriorityEnum(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    type = Column(String(50), default="Retailer")
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(20))
    phone = Column(String(50))
    email = Column(String(255))
    gstin = Column(String(20))
    credit_limit = Column(Numeric(15, 2), default=0)
    priority = Column(Enum(PriorityEnum), default=PriorityEnum.MEDIUM)
    delivery_status_block = Column(Boolean, default=False)
    delivery_status_open = Column(Boolean, default=True)
    credit_status_cash = Column(Boolean, default=False)
    credit_status_credit = Column(Boolean, default=True)
    payment_days = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Vendor(Base):
    __tablename__ = "vendors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(20))
    phone = Column(String(50))
    email = Column(String(255))
    gstin = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)  # SKU/Product Code (auto-generated)
    sku = Column(String(50), unique=True, nullable=False)  # Auto-generated SKU
    old_code = Column(String(50))  # User input old code
    new_code = Column(String(50))  # User input new code
    generic_name = Column(String(255))  # Optional generic name
    business_unit = Column(String(50))  # Pharma, Purnava, Animal health
    category = Column(String(100))  # Keep for backward compatibility, but not in form
    hsn_code = Column(String(20))
    unit_of_measure = Column(String(20), default="PCS")
    base_price = Column(Numeric(15, 2), default=0)
    primary_packaging = Column(String(50))  # Bottle, Blister, Vial, Injection
    product_type_commercial = Column(Boolean, default=False)
    product_type_sample = Column(Boolean, default=False)
    product_type_institutional = Column(Boolean, default=False)
    product_type_export = Column(Boolean, default=False)
    ifc_value1 = Column(Numeric(10, 2))
    ifc_value2 = Column(Numeric(10, 2))
    ifc_result = Column(Numeric(10, 2))
    mc_value1 = Column(Numeric(10, 2))
    mc_value2 = Column(Numeric(10, 2))
    mc_value3 = Column(Numeric(10, 2))
    mc_result = Column(Numeric(10, 2))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Material(Base):
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    category = Column(String(100))
    unit_of_measure = Column(String(20), default="PCS")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ShippingPoint(Base):
    __tablename__ = "shipping_points"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    depot_id = Column(Integer, ForeignKey("depots.id"))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(20))
    phone = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    depot = relationship("Depot")

class Vehicle(Base):
    __tablename__ = "vehicles"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(String(50), unique=True, nullable=False)
    vehicle_type = Column(String(50), nullable=False)
    registration_number = Column(String(50), unique=True, nullable=False)
    capacity = Column(Numeric(10, 2))
    depot_id = Column(Integer, ForeignKey("depots.id"))
    vendor = Column(String(255))
    status = Column(String(50), default="Active")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    depot = relationship("Depot")

class Driver(Base):
    __tablename__ = "drivers"
    
    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    license_number = Column(String(50), unique=True, nullable=False)
    license_expiry = Column(Date)
    contact = Column(String(20))
    vehicle_id = Column(String(50))
    route = Column(String(255))
    status = Column(String(50), default="Available")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Route(Base):
    __tablename__ = "routes"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    depot_id = Column(Integer, ForeignKey("depots.id"))
    stops = Column(Integer, default=0)
    distance = Column(String(50))
    avg_time = Column(String(50))
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    depot = relationship("Depot")

class StockLedger(Base):
    __tablename__ = "stock_ledger"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    batch = Column(String(100))
    depot_id = Column(Integer, ForeignKey("depots.id"))
    storage_type = Column(String(50))
    quantity = Column(Numeric(10, 2))
    reserved_quantity = Column(Numeric(10, 2), default=0)
    available_quantity = Column(Numeric(10, 2))
    expiry_date = Column(Date)
    status = Column(String(50), default="Unrestricted")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    product = relationship("Product")
    depot = relationship("Depot")

class StockReceipt(Base):
    __tablename__ = "stock_receipts"
    
    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String(50), unique=True, nullable=False)
    receipt_date = Column(Date, nullable=False)
    challan_number = Column(String(100))
    depot_id = Column(Integer, ForeignKey("depots.id"))
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    total_quantity = Column(Numeric(10, 2))
    status = Column(String(50), default="Completed")
    created_by = Column(Integer, ForeignKey("employees.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    depot = relationship("Depot")
    vendor = relationship("Vendor")
    employee = relationship("Employee")
    items = relationship("StockReceiptItem", back_populates="receipt", cascade="all, delete-orphan")

class StockReceiptItem(Base):
    __tablename__ = "stock_receipt_items"
    
    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("stock_receipts.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    batch = Column(String(100))
    quantity = Column(Numeric(10, 2))
    expiry_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    receipt = relationship("StockReceipt", back_populates="items")
    product = relationship("Product")

class StockIssuance(Base):
    __tablename__ = "stock_issuances"
    
    id = Column(Integer, primary_key=True, index=True)
    issuance_number = Column(String(50), unique=True, nullable=False)
    issuance_date = Column(Date, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    depot_id = Column(Integer, ForeignKey("depots.id"))
    total_quantity = Column(Numeric(10, 2))
    status = Column(String(50), default="Pending")
    created_by = Column(Integer, ForeignKey("employees.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    customer = relationship("Customer")
    depot = relationship("Depot")
    employee = relationship("Employee")
    items = relationship("StockIssuanceItem", back_populates="issuance", cascade="all, delete-orphan")

class StockIssuanceItem(Base):
    __tablename__ = "stock_issuance_items"
    
    id = Column(Integer, primary_key=True, index=True)
    issuance_id = Column(Integer, ForeignKey("stock_issuances.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    batch = Column(String(100))
    quantity = Column(Numeric(10, 2))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    issuance = relationship("StockIssuance", back_populates="items")
    product = relationship("Product")

class VehicleLoading(Base):
    __tablename__ = "vehicle_loadings"
    
    id = Column(Integer, primary_key=True, index=True)
    loading_number = Column(String(50), unique=True, nullable=False)
    loading_date = Column(Date, nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"))
    route_id = Column(Integer)
    total_quantity = Column(Numeric(10, 2))
    status = Column(String(50), default="Pending")
    created_by = Column(Integer, ForeignKey("employees.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicle = relationship("Vehicle")
    driver = relationship("Driver")
    employee = relationship("Employee")
    items = relationship("VehicleLoadingItem", back_populates="loading", cascade="all, delete-orphan")

class VehicleLoadingItem(Base):
    __tablename__ = "vehicle_loading_items"
    
    id = Column(Integer, primary_key=True, index=True)
    loading_id = Column(Integer, ForeignKey("vehicle_loadings.id"))
    issuance_id = Column(Integer, ForeignKey("stock_issuances.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    loading = relationship("VehicleLoading", back_populates="items")
    issuance = relationship("StockIssuance")

class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"
    
    id = Column(Integer, primary_key=True, index=True)
    adjustment_number = Column(String(50), unique=True, nullable=False)
    adjustment_date = Column(Date, nullable=False)
    depot_id = Column(Integer, ForeignKey("depots.id"))
    adjustment_type = Column(String(50))
    reason = Column(Text)
    status = Column(String(50), default="Pending")
    submitted_by = Column(Integer, ForeignKey("employees.id"))
    approved_by = Column(Integer, ForeignKey("employees.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    depot = relationship("Depot")
    submitter = relationship("Employee", foreign_keys=[submitted_by])
    approver = relationship("Employee", foreign_keys=[approved_by])
    items = relationship("StockAdjustmentItem", back_populates="adjustment", cascade="all, delete-orphan")

class StockAdjustmentItem(Base):
    __tablename__ = "stock_adjustment_items"
    
    id = Column(Integer, primary_key=True, index=True)
    adjustment_id = Column(Integer, ForeignKey("stock_adjustments.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    batch = Column(String(100))
    quantity_change = Column(Numeric(10, 2))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    adjustment = relationship("StockAdjustment", back_populates="items")
    product = relationship("Product")

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False)
    invoice_date = Column(Date, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    depot_id = Column(Integer, ForeignKey("depots.id"))
    issuance_id = Column(Integer, ForeignKey("stock_issuances.id"))
    amount = Column(Numeric(15, 2), nullable=False)
    mode = Column(String(50))
    status = Column(String(50), default="Pending")
    due_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    customer = relationship("Customer")
    depot = relationship("Depot")
    issuance = relationship("StockIssuance")

