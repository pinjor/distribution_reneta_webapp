from sqlalchemy import Column, Integer, String, Boolean, Text, Numeric, Date, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class RoleTypeEnum(str, enum.Enum):
    NSH = "NSH"  # National Sales Head
    TSM = "TSM"  # Territory Sales Manager
    RSM = "RSM"  # Regional Sales Manager
    DSM = "DSM"  # District Sales Manager
    SM = "SM"    # Sales Manager
    SO = "SO"    # Sales Officer

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
    role_master_id = Column(Integer, ForeignKey("role_masters.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    depot = relationship("Depot")
    role_master = relationship("RoleMaster", foreign_keys=[role_master_id], back_populates="employees")

class PriorityEnum(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class OrderStatusEnum(str, enum.Enum):
    DRAFT = "Draft"
    SUBMITTED = "Submitted"
    APPROVED = "Approved"
    PARTIALLY_APPROVED = "Partially Approved"


class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    type = Column(String(50), default="Retailer")
    address = Column(Text)
    ship_to_party = Column(Text)
    sold_to_party = Column(Text)
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
    free_goods_threshold = Column(Numeric(12, 2), default=100)
    free_goods_quantity = Column(Numeric(12, 2), default=5)
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
    cold_chain_available = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Foreign keys to UOM and PrimaryPackaging (optional for backward compatibility)
    uom_id = Column(Integer, ForeignKey("uoms.id"), nullable=True)
    primary_packaging_id = Column(Integer, ForeignKey("primary_packagings.id"), nullable=True)
    
    uom = relationship("UOM")
    primary_packaging_rel = relationship("PrimaryPackaging")

class UOM(Base):
    __tablename__ = "uoms"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PrimaryPackaging(Base):
    __tablename__ = "primary_packagings"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PriceSetup(Base):
    __tablename__ = "price_setups"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    trade_price = Column(Numeric(15, 2))
    unit_price = Column(Numeric(15, 2))
    ifc_price = Column(Numeric(15, 2))
    mc_price = Column(Numeric(15, 2))
    validity_start_date = Column(Date)
    validity_end_date = Column(Date)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    product = relationship("Product")

class RoleMaster(Base):
    __tablename__ = "role_masters"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    role_type = Column(Enum(RoleTypeEnum), nullable=False)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("role_masters.id"), nullable=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    territory = Column(String(100))
    region = Column(String(100))
    district = Column(String(100))
    area = Column(String(100))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Self-referential relationship
    parent = relationship("RoleMaster", remote_side=[id], backref="children")
    
    # Employee relationship (one role can have one employee assigned)
    assigned_employee = relationship("Employee", foreign_keys=[employee_id], uselist=False)
    
    # Employees assigned to this role (via role_master_id)
    employees = relationship("Employee", foreign_keys="Employee.role_master_id", back_populates="role_master", uselist=True)

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
    # TMS fields
    fuel_type = Column(String(50))  # Petrol, Diesel, CNG, Electric
    fuel_rate = Column(Numeric(10, 2))  # Cost per km
    fuel_efficiency = Column(Numeric(10, 2))  # km per liter
    model = Column(String(100))
    year = Column(Integer)
    maintenance_schedule_km = Column(Numeric(10, 2))  # Next maintenance at km
    last_maintenance_date = Column(Date)
    last_maintenance_km = Column(Numeric(10, 2))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    depot = relationship("Depot")
    trips = relationship("Trip", back_populates="vehicle")

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
    email = Column(String(255))
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    trips = relationship("Trip", back_populates="driver")

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
    route_stops = relationship("RouteStop", back_populates="route", cascade="all, delete-orphan")
    route_shipping_points = relationship("RouteShippingPoint", back_populates="route", cascade="all, delete-orphan")
    trips = relationship("Trip", back_populates="route")

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

class ProductItemStock(Base):
    """Main stock table for products with aggregated stock quantities"""
    __tablename__ = "product_item_stock"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    product_code = Column(String(50), nullable=False)
    sku_code = Column(String(50), nullable=False)
    gross_stock_receive = Column(Numeric(15, 2), default=0)
    issue = Column(Numeric(15, 2), default=0)
    stock_qty = Column(Numeric(15, 2), default=0)
    adjusted_stock_in_qty = Column(Numeric(15, 2), default=0)
    adjusted_stock_out_qty = Column(Numeric(15, 2), default=0)
    depot_id = Column(Integer, ForeignKey("depots.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    product = relationship("Product")
    depot = relationship("Depot")
    details = relationship("ProductItemStockDetail", back_populates="item_stock", cascade="all, delete-orphan")

class ProductItemStockDetail(Base):
    """Batch-wise stock details linked to product_item_stock"""
    __tablename__ = "product_item_stock_details"
    
    id = Column(Integer, primary_key=True, index=True)
    item_code = Column(Integer, ForeignKey("product_item_stock.id", ondelete="CASCADE"), nullable=False)
    batch_no = Column(String(100), nullable=False)
    expiry_date = Column(Date)
    quantity = Column(Numeric(15, 2), default=0)
    available_quantity = Column(Numeric(15, 2), default=0)
    reserved_quantity = Column(Numeric(15, 2), default=0)
    manufacturing_date = Column(Date)
    storage_type = Column(String(50))
    status = Column(String(50), default="Unrestricted")
    source_type = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    item_stock = relationship("ProductItemStock", back_populates="details")

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

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), nullable=True)
    memo_number = Column(String(8), nullable=True, unique=True)  # 8-digit numeric memo/invoice number
    depot_code = Column(String(50), nullable=True)
    depot_name = Column(String(255), nullable=True)
    customer_id = Column(String(50), nullable=False)
    customer_name = Column(String(255), nullable=False)
    customer_code = Column(String(50), nullable=True)
    pso_id = Column(String(50), nullable=False)
    pso_name = Column(String(255), nullable=False)
    pso_code = Column(String(50), nullable=True)
    route_code = Column(String(50), nullable=True)
    route_name = Column(String(255), nullable=True)
    delivery_date = Column(Date, nullable=False)
    status = Column(Enum(OrderStatusEnum), nullable=False, default=OrderStatusEnum.DRAFT)
    validated = Column(Boolean, default=False)
    printed = Column(Boolean, default=False)
    printed_at = Column(DateTime, nullable=True)
    postponed = Column(Boolean, default=False)
    assigned_to = Column(Integer, ForeignKey("employees.id"), nullable=True)
    assigned_vehicle = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    loaded = Column(Boolean, default=False)
    loaded_at = Column(DateTime, nullable=True)
    assignment_date = Column(DateTime, nullable=True)
    # Collection status fields
    collection_status = Column(String(50), nullable=True)  # Pending, Partially Collected, Postponed, Fully Collected
    collection_type = Column(String(50), nullable=True)  # Partial, Postponed
    collected_amount = Column(Numeric(15, 2), nullable=True, default=0)
    pending_amount = Column(Numeric(15, 2), nullable=True)
    collection_approved = Column(Boolean, default=False)
    collection_approved_at = Column(DateTime, nullable=True)
    collection_approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    collection_source = Column(String(50), nullable=True)  # Mobile App, Web
    loading_number = Column(String(50), nullable=True)
    loading_date = Column(Date, nullable=True)
    area = Column(String(100), nullable=True)
    # Mobile app acceptance fields
    mobile_accepted = Column(Boolean, default=False)  # Whether memo was accepted by mobile user
    mobile_accepted_by = Column(String(100), nullable=True)  # Mobile app user ID who accepted
    mobile_accepted_at = Column(DateTime, nullable=True)  # Timestamp when accepted
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    assigned_employee = relationship("Employee", foreign_keys=[assigned_to])
    assigned_vehicle_rel = relationship("Vehicle", foreign_keys=[assigned_vehicle])


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"))
    product_code = Column(String(50), nullable=False)  # Renamed from old_code
    product_name = Column(String(255), nullable=False)
    pack_size = Column(String(100))
    quantity = Column(Numeric(12, 2), nullable=False)
    free_goods = Column(Numeric(12, 2), default=0)
    total_quantity = Column(Numeric(12, 2))
    trade_price = Column(Numeric(12, 2), nullable=False, default=0)
    unit_price = Column(Numeric(12, 2))
    discount_percent = Column(Numeric(5, 2), default=0)
    batch_number = Column(String(100), nullable=True)  # Added batch number
    current_stock = Column(Numeric(12, 2), nullable=True)  # Added current stock (calculated)
    delivery_date = Column(Date, nullable=False)
    selected = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="items")


class ReceiptSourceEnum(str, enum.Enum):
    FACTORY = "FACTORY"
    DEPOT = "DEPOT"
    RETURN = "RETURN"


class ProductReceiptStatus(str, enum.Enum):
    DRAFT = "Draft"
    APPROVED = "Approved"


class ProductReceipt(Base):
    __tablename__ = "product_receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String(50), unique=True, nullable=False)
    source_type = Column(Enum(ReceiptSourceEnum), nullable=False)
    target_depot_id = Column(Integer, ForeignKey("depots.id"))
    to_address = Column(Text)
    tfa_number = Column(String(50))
    iso_number = Column(String(50))
    shipment_mode = Column(String(100))
    delivery_person = Column(String(100))
    vehicle_info = Column(String(100))
    issued_date = Column(Date)
    vat_number = Column(String(50))
    remarks = Column(Text)
    status = Column(Enum(ProductReceiptStatus), default=ProductReceiptStatus.DRAFT)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    depot = relationship("Depot")
    items = relationship("ProductReceiptItem", back_populates="receipt", cascade="all, delete-orphan")


class ProductReceiptItem(Base):
    __tablename__ = "product_receipt_items"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("product_receipts.id", ondelete="CASCADE"))
    legacy_code = Column(String(50))
    item_code = Column(String(50))
    item_name = Column(String(255))
    pack_size = Column(String(50))
    uom = Column(String(20))
    expiry_date = Column(Date)
    batch_number = Column(String(100))
    number_of_ifc = Column(Numeric(12, 2), default=0)
    depot_quantity = Column(Numeric(12, 2), default=0)
    ifc_per_full_mc = Column(Numeric(12, 2), default=0)
    number_of_full_mc = Column(Numeric(12, 2), default=0)
    ifc_in_loose_mc = Column(Numeric(12, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    receipt = relationship("ProductReceipt", back_populates="items")


class DeliveryStatusEnum(str, enum.Enum):
    DRAFT = "Draft"
    PACKING = "Packing"
    LOADING = "Loading"
    SHIPPED = "Shipped"
    DELIVERED = "Delivered"


class OrderDelivery(Base):
    __tablename__ = "delivery_orders"  # Keep table name for backward compatibility

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    delivery_number = Column(String(50), unique=True, nullable=False)
    ship_to_party = Column(String(255))
    sold_to_party = Column(String(255))
    delivery_date = Column(Date, nullable=False)
    planned_dispatch_time = Column(String(10))
    vehicle_info = Column(String(100))
    driver_name = Column(String(100))
    warehouse_no = Column(String(50))
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    status = Column(Enum(DeliveryStatusEnum), default=DeliveryStatusEnum.DRAFT)
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = relationship("Order")
    vehicle = relationship("Vehicle")
    driver = relationship("Driver")
    items = relationship("OrderDeliveryItem", back_populates="delivery", cascade="all, delete-orphan")


class OrderDeliveryItem(Base):
    __tablename__ = "delivery_order_items"  # Keep table name for backward compatibility

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("delivery_orders.id", ondelete="CASCADE"))
    order_item_id = Column(Integer, ForeignKey("order_items.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(255), nullable=False)
    legacy_code = Column(String(50))
    new_code = Column(String(50))
    pack_size = Column(String(50))
    uom = Column(String(20))
    batch_number = Column(String(100), nullable=False)
    expiry_date = Column(Date)
    ordered_quantity = Column(Numeric(10, 2), nullable=False)
    delivery_quantity = Column(Numeric(10, 2), nullable=False)
    picked_quantity = Column(Numeric(10, 2), nullable=False)
    available_stock = Column(Numeric(10, 2), default=0)
    free_goods_threshold = Column(Numeric(12, 2), default=100)
    free_goods_quantity = Column(Numeric(12, 2), default=5)
    free_goods_awarded = Column(Numeric(12, 2), default=0)
    product_rate = Column(Numeric(12, 2), default=0)
    trade_amount = Column(Numeric(14, 2), default=0)
    vat_amount = Column(Numeric(14, 2), default=0)
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    delivery = relationship("OrderDelivery", back_populates="items")
    order_item = relationship("OrderItem")
    product = relationship("Product")


class PickingOrderStatusEnum(str, enum.Enum):
    DRAFT = "Draft"
    APPROVED = "Approved"


class PickingOrder(Base):
    __tablename__ = "picking_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False)
    loading_no = Column(String(50))
    loading_date = Column(Date)
    area = Column(String(100))
    delivery_by = Column(String(150))
    vehicle_no = Column(String(100))
    remarks = Column(Text)
    status = Column(String(50), default=PickingOrderStatusEnum.DRAFT.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    deliveries = relationship(
        "PickingOrderDelivery",
        back_populates="picking_order",
        cascade="all, delete-orphan",
    )


class PickingOrderDelivery(Base):
    __tablename__ = "picking_order_deliveries"

    id = Column(Integer, primary_key=True, index=True)
    picking_order_id = Column(Integer, ForeignKey("picking_orders.id", ondelete="CASCADE"))
    delivery_id = Column(Integer, ForeignKey("delivery_orders.id", ondelete="SET NULL"))
    memo_no = Column(String(100))
    value = Column(Numeric(14, 2), default=0)
    status = Column(String(50))
    pso = Column(String(100))
    remarks = Column(Text)
    cash = Column(Numeric(14, 2), default=0)
    dues = Column(Numeric(14, 2), default=0)
    amend = Column(Numeric(14, 2), default=0)
    returns = Column(Numeric(14, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    picking_order = relationship("PickingOrder", back_populates="deliveries")
    delivery = relationship("OrderDelivery")


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


class DepotTransferStatusEnum(str, enum.Enum):
    DRAFT = "Draft"
    PENDING = "Pending"
    APPROVED = "Approved"
    IN_TRANSIT = "In Transit"
    RECEIVED = "Received"
    CANCELLED = "Cancelled"


class DepotTransfer(Base):
    __tablename__ = "depot_transfers"
    
    id = Column(Integer, primary_key=True, index=True)
    transfer_number = Column(String(50), unique=True, nullable=False)
    transfer_date = Column(Date, nullable=False)
    from_depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)
    to_depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    driver_name = Column(String(100))
    status = Column(Enum(DepotTransferStatusEnum), default=DepotTransferStatusEnum.DRAFT)
    transfer_note = Column(Text)
    remarks = Column(Text)
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    received_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    received_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    from_depot = relationship("Depot", foreign_keys=[from_depot_id])
    to_depot = relationship("Depot", foreign_keys=[to_depot_id])
    vehicle = relationship("Vehicle")
    approver = relationship("Employee", foreign_keys=[approved_by])
    receiver = relationship("Employee", foreign_keys=[received_by])
    creator = relationship("Employee", foreign_keys=[created_by])
    items = relationship("DepotTransferItem", back_populates="transfer", cascade="all, delete-orphan")


class DepotTransferItem(Base):
    __tablename__ = "depot_transfer_items"
    
    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("depot_transfers.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_number = Column(String(100))
    expiry_date = Column(Date)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(12, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    transfer = relationship("DepotTransfer", back_populates="items")
    product = relationship("Product")


class CollectionTypeEnum(str, enum.Enum):
    FULLY_COLLECTED = "Fully Collected"
    PARTIAL_COLLECTION = "Partial Collection"
    POSTPONED = "Postponed"


class DepositMethodEnum(str, enum.Enum):
    BRAC = "BRAC"
    BKASH = "bKash"
    NAGAD = "Nagad"


class CollectionDeposit(Base):
    __tablename__ = "collection_deposits"
    
    id = Column(Integer, primary_key=True, index=True)
    deposit_number = Column(String(50), unique=True, nullable=False)
    deposit_date = Column(Date, nullable=False)
    collection_person_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    deposit_method = Column(Enum(DepositMethodEnum), nullable=False)
    deposit_amount = Column(Numeric(15, 2), nullable=False)
    transaction_number = Column(String(100), nullable=False)
    attachment_url = Column(String(500))  # Path to uploaded file
    remaining_amount = Column(Numeric(15, 2), nullable=False, default=0)  # Amount to be given at depot
    total_collection_amount = Column(Numeric(15, 2), nullable=False)  # Total collection for the day
    notes = Column(Text)
    approved = Column(Boolean, default=False)
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    collection_person = relationship("Employee", foreign_keys=[collection_person_id])
    approver = relationship("Employee", foreign_keys=[approved_by])


class CollectionTransaction(Base):
    __tablename__ = "collection_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    collection_person_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    collection_date = Column(Date, nullable=False)
    collection_type = Column(Enum(CollectionTypeEnum), nullable=False)
    collected_amount = Column(Numeric(15, 2), nullable=False, default=0)
    pending_amount = Column(Numeric(15, 2), nullable=False, default=0)
    total_amount = Column(Numeric(15, 2), nullable=False)
    deposit_id = Column(Integer, ForeignKey("collection_deposits.id"), nullable=True)
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    order = relationship("Order")
    collection_person = relationship("Employee", foreign_keys=[collection_person_id])
    deposit = relationship("CollectionDeposit")


# Transport Management System (TMS) Models

class RouteStop(Base):
    """Stores route stop coordinates for distance calculation"""
    __tablename__ = "route_stops"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    stop_sequence = Column(Integer, nullable=False)  # Order of stops in route
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    customer_name = Column(String(255))
    address = Column(Text)
    latitude = Column(Numeric(10, 7))  # Decimal degrees
    longitude = Column(Numeric(10, 7))  # Decimal degrees
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    route = relationship("Route", back_populates="route_stops")
    customer = relationship("Customer")


class Trip(Base):
    """Tracks vehicle/driver assignments to delivery routes"""
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_number = Column(String(50), unique=True, nullable=False)
    delivery_id = Column(Integer, ForeignKey("orders.id"), nullable=True)  # Link to order/delivery
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    trip_date = Column(Date, nullable=False)
    distance_km = Column(Numeric(10, 2))  # Calculated distance
    estimated_fuel_cost = Column(Numeric(10, 2))  # Auto-calculated
    actual_fuel_cost = Column(Numeric(10, 2))  # Can be overridden
    status = Column(String(50), default="Scheduled")  # Scheduled, In Progress, Completed, Cancelled
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicle = relationship("Vehicle", back_populates="trips")
    driver = relationship("Driver", back_populates="trips")
    route = relationship("Route", back_populates="trips")
    order = relationship("Order")
    expenses = relationship("TransportExpense", back_populates="trip", cascade="all, delete-orphan")


class RouteShippingPoint(Base):
    """Links shipping points to routes with distance"""
    __tablename__ = "route_shipping_points"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    shipping_point_id = Column(Integer, ForeignKey("shipping_points.id"), nullable=False)
    distance_km = Column(Numeric(10, 2), nullable=False)  # Distance from route start to this shipping point
    sequence = Column(Integer, nullable=False)  # Order of shipping point in route
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    route = relationship("Route", back_populates="route_shipping_points")
    shipping_point = relationship("ShippingPoint")

class TransportExpense(Base):
    """Tracks expenses for each trip"""
    __tablename__ = "transport_expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True)  # Made nullable for route-based expenses
    trip_number = Column(String(50), nullable=True)  # Link to trip by number
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True)  # Link to route
    expense_type = Column(String(50), nullable=False)  # fuel, toll, repair, maintenance, other
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(Text)
    expense_date = Column(Date, nullable=False)
    is_auto_calculated = Column(Boolean, default=False)  # True for auto fuel costs
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    trip = relationship("Trip", back_populates="expenses")
    route = relationship("Route")
