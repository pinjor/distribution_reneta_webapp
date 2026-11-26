from pydantic import BaseModel, EmailStr, Field, validator, field_validator, field_serializer
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from app.models import RoleTypeEnum, OrderStatusEnum, ReceiptSourceEnum, ProductReceiptStatus, DeliveryStatusEnum, CollectionTypeEnum, DepositMethodEnum

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
    designation: Optional[str] = None
    phone: Optional[str] = None
    depot_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class DepotSummary(BaseModel):
    id: int
    name: str
    code: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class UserProfileResponse(UserResponse):
    depot: Optional[DepotSummary] = None

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
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    is_active: Optional[bool] = None

class Company(CompanyBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Depot schemas
class DepotBase(BaseModel):
    name: str
    code: str
    company_id: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True

class DepotCreate(DepotBase):
    name: str = Field(..., min_length=1)
    code: str = Field(..., min_length=1)

class DepotUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    company_id: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None

class Depot(DepotBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
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
    role_master_id: Optional[int] = None
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(EmployeeBase):
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
    ship_to_party: Optional[str] = None
    sold_to_party: Optional[str] = None
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
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    is_active: bool = True

class VendorCreate(VendorBase):
    name: str = Field(..., min_length=1)
    code: Optional[str] = None

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    is_active: Optional[bool] = None

class Vendor(VendorBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
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
    business_unit: Optional[str] = None  # Pharma, Purnava, Animal health
    category: Optional[str] = None
    hsn_code: Optional[str] = None
    unit_of_measure: Optional[str] = None
    base_price: Decimal = Decimal("0")
    free_goods_threshold: Decimal = Decimal("100")
    free_goods_quantity: Decimal = Decimal("5")
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
    cold_chain_available: bool = False
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

# UOM schemas
class UOMBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True

class UOMCreate(UOMBase):
    pass

class UOMUpdate(UOMBase):
    pass

class UOM(UOMBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# PrimaryPackaging schemas
class PrimaryPackagingBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True

class PrimaryPackagingCreate(PrimaryPackagingBase):
    pass

class PrimaryPackagingUpdate(PrimaryPackagingBase):
    pass

class PrimaryPackaging(PrimaryPackagingBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# PriceSetup schemas
class PriceSetupBase(BaseModel):
    code: str
    product_id: int
    trade_price: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    ifc_price: Optional[Decimal] = None
    mc_price: Optional[Decimal] = None
    validity_start_date: Optional[date] = None
    validity_end_date: Optional[date] = None
    is_active: bool = True

class PriceSetupCreate(PriceSetupBase):
    pass

class PriceSetupUpdate(PriceSetupBase):
    pass

class PriceSetup(PriceSetupBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# RoleMaster schemas
class RoleMasterBase(BaseModel):
    code: str
    role_type: RoleTypeEnum
    name: str
    parent_id: Optional[int] = None
    employee_id: Optional[int] = None
    territory: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    area: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

class RoleMasterCreate(RoleMasterBase):
    pass

class RoleMasterUpdate(RoleMasterBase):
    pass

class RoleMaster(RoleMasterBase):
    id: int
    parent_name: Optional[str] = None
    employee_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class RoleHierarchyResponse(BaseModel):
    """Response model for hierarchy traversal"""
    current_role: RoleMaster
    path_to_root: List[RoleMaster] = []
    subordinates: List[RoleMaster] = []

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

class VehicleUpdate(BaseModel):
    vehicle_id: Optional[str] = None
    vehicle_type: Optional[str] = None
    registration_number: Optional[str] = None
    capacity: Optional[Decimal] = None
    depot_id: Optional[int] = None
    vendor: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

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

# Product Item Stock schemas
class ProductItemStockDetailBase(BaseModel):
    batch_no: str
    
    @validator('batch_no', pre=True)
    def validate_batch_no(cls, v):
        if not v:
            raise ValueError('Batch number is required')
        cleaned = str(v).strip()
        if not cleaned.isdigit():
            raise ValueError('Batch number must be numeric only (digits only)')
        return cleaned
    
    expiry_date: Optional[date] = None
    quantity: Decimal = Decimal("0")
    available_quantity: Decimal = Decimal("0")
    reserved_quantity: Decimal = Decimal("0")
    manufacturing_date: Optional[date] = None
    storage_type: Optional[str] = None
    status: str = "Unrestricted"
    source_type: Optional[str] = None

class ProductItemStockDetailCreate(ProductItemStockDetailBase):
    item_code: int

class ProductItemStockDetail(ProductItemStockDetailBase):
    id: int
    item_code: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ProductItemStockBase(BaseModel):
    product_id: int
    product_code: str
    sku_code: str
    gross_stock_receive: Decimal = Decimal("0")
    issue: Decimal = Decimal("0")
    stock_qty: Decimal = Decimal("0")
    adjusted_stock_in_qty: Decimal = Decimal("0")
    adjusted_stock_out_qty: Decimal = Decimal("0")
    depot_id: Optional[int] = None

class ProductItemStockCreate(ProductItemStockBase):
    pass

class ProductItemStockUpdate(ProductItemStockBase):
    pass

class ProductItemStock(ProductItemStockBase):
    id: int
    created_at: datetime
    updated_at: datetime
    details: List[ProductItemStockDetail] = []
    
    class Config:
        from_attributes = True

# Order schemas
class OrderItemBase(BaseModel):
    product_code: str  # Renamed from old_code
    product_name: str
    pack_size: Optional[str] = None
    quantity: Decimal
    free_goods: Optional[Decimal] = 0
    total_quantity: Optional[Decimal] = None
    trade_price: Decimal = 0
    unit_price: Optional[Decimal] = None
    discount_percent: Optional[Decimal] = 0
    batch_number: Optional[str] = None  # Added batch number (must be numeric for new orders)
    current_stock: Optional[Decimal] = None  # Added current stock
    delivery_date: date
    selected: bool = True


class OrderItemCreate(OrderItemBase):
    id: Optional[int] = None
    
    @validator('batch_number', pre=True, always=True)
    def validate_batch_number(cls, v):
        if v is None or v == "":
            return None
        cleaned = str(v).strip()
        if cleaned and not cleaned.isdigit():
            raise ValueError('Batch number must be numeric only (digits only)')
        return cleaned if cleaned else None


class OrderItem(OrderItemBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    depot_code: Optional[str] = None
    depot_name: Optional[str] = None
    customer_id: str
    customer_name: str
    customer_code: Optional[str] = None
    pso_id: str
    pso_name: str
    pso_code: Optional[str] = None
    route_code: Optional[str] = None
    route_name: Optional[str] = None
    delivery_date: date
    notes: Optional[str] = None
    memo_number: Optional[str] = None  # 8-digit numeric memo/invoice number


class OrderCreate(OrderBase):
    items: List[OrderItemCreate]
    status: Optional[OrderStatusEnum] = None


class OrderUpdate(BaseModel):
    depot_code: Optional[str] = None
    depot_name: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_code: Optional[str] = None
    pso_id: Optional[str] = None
    pso_name: Optional[str] = None
    pso_code: Optional[str] = None
    route_code: Optional[str] = None
    route_name: Optional[str] = None
    delivery_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[OrderStatusEnum] = None
    items: Optional[List[OrderItemCreate]] = None


class Order(OrderBase):
    id: int
    order_number: Optional[str] = None
    memo_number: Optional[str] = None  # 8-digit numeric memo/invoice number
    status: OrderStatusEnum
    created_at: datetime
    updated_at: datetime
    items: List[OrderItem]
    # Collection fields
    collection_status: Optional[str] = None
    collection_type: Optional[str] = None
    collected_amount: Optional[float] = None
    pending_amount: Optional[float] = None
    total_amount: Optional[float] = None
    collection_source: Optional[str] = None
    collection_approved: Optional[bool] = None
    collection_approved_at: Optional[datetime] = None

    @field_serializer('collection_approved_at')
    def serialize_collection_approved_at(self, value: Optional[datetime], _info) -> Optional[str]:
        if value is None:
            return None
        return value.isoformat() if isinstance(value, datetime) else str(value)

    class Config:
        from_attributes = True


# Alias for backward compatibility
OrderResponse = Order


# Collection approval specific response
class CollectionApprovalOrder(BaseModel):
    id: int
    order_number: Optional[str] = None
    memo_number: Optional[str] = None
    customer_id: str
    customer_name: str
    customer_code: Optional[str] = None
    pso_id: str
    pso_name: str
    pso_code: Optional[str] = None
    delivery_date: date
    status: OrderStatusEnum
    # Collection fields
    collection_status: Optional[str] = None
    collection_type: Optional[str] = None
    collected_amount: Optional[float] = None
    pending_amount: Optional[float] = None
    total_amount: Optional[float] = None
    collection_source: Optional[str] = None
    collection_approved: Optional[bool] = None
    collection_approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    @field_serializer('collection_approved_at')
    def serialize_collection_approved_at(self, value: Optional[datetime], _info) -> Optional[str]:
        if value is None:
            return None
        return value.isoformat() if isinstance(value, datetime) else str(value)

    class Config:
        from_attributes = True


class OrderValidationRequest(BaseModel):
    order_ids: List[int]
    order_number: Optional[str] = None


class OrderValidationResponse(BaseModel):
    order_number: str
    orders: List[Order]


# Route-wise order schemas
class RouteWiseOrderItemResponse(BaseModel):
    id: int
    order_id: int
    order_number: Optional[str] = None
    memo_number: Optional[str] = None  # 8-digit numeric memo/invoice number
    product_code: str
    size: Optional[str] = None
    free_goods: Decimal = 0
    total_quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal = 0
    total_price: Decimal
    customer_name: str
    customer_code: Optional[str] = None
    route_code: Optional[str] = None
    route_name: Optional[str] = None
    validated: bool = False
    printed: bool = False
    printed_at: Optional[datetime] = None
    postponed: bool = False
    assigned_to: Optional[int] = None
    assigned_vehicle: Optional[int] = None
    loaded: bool = False
    loaded_at: Optional[datetime] = None
    pso_name: Optional[str] = None
    pso_code: Optional[str] = None

    class Config:
        from_attributes = True


class RouteWiseOrderStats(BaseModel):
    total_order: int
    validated: int
    printed: int
    pending_print: int
    loaded: int
    postponed: int


class RouteWiseOrderResponse(BaseModel):
    route_code: Optional[str] = None
    route_name: Optional[str] = None
    items: List[RouteWiseOrderItemResponse]
    stats: RouteWiseOrderStats


class RouteWisePrintRequest(BaseModel):
    order_ids: List[int]
    route_code: Optional[str] = None


class RouteWiseValidateRequest(BaseModel):
    route_code: str
    order_ids: Optional[List[int]] = None  # If None, validate all unvalidated orders in route

class RouteWiseAssignRequest(BaseModel):
    order_ids: List[int]
    employee_id: int
    vehicle_id: int
    route_code: Optional[str] = None
    route_codes: Optional[List[str]] = None  # For multiple routes

class BarcodeAssignRequest(BaseModel):
    memo_numbers: List[str]
    employee_id: int
    vehicle_id: int


class AssignedOrderResponse(BaseModel):
    id: int
    order_id: int
    order_number: Optional[str] = None
    customer_name: str
    customer_code: Optional[str] = None
    route_code: Optional[str] = None
    route_name: Optional[str] = None
    assigned_employee_id: int
    assigned_employee_name: str
    assigned_employee_code: Optional[str] = None
    assigned_vehicle_id: int
    assigned_vehicle_registration: str
    assigned_vehicle_model: Optional[str] = None
    assignment_date: datetime
    loading_number: Optional[str] = None
    loading_date: Optional[date] = None
    area: Optional[str] = None
    status: str = "Pending"
    items_count: int
    total_value: Decimal

    class Config:
        from_attributes = True


class AssignedOrderStatusUpdate(BaseModel):
    status: str


# Stock Adjustment schemas
class StockAdjustmentItemBase(BaseModel):
    product_id: int
    batch: Optional[str] = None  # Must be numeric if provided
    
    @validator('batch', pre=True, always=True)
    def validate_batch(cls, v):
        if v is None or v == "":
            return None
        cleaned = str(v).strip()
        if cleaned and not cleaned.isdigit():
            raise ValueError('Batch number must be numeric only (digits only)')
        return cleaned if cleaned else None
    
    quantity_change: Decimal


class StockAdjustmentItemCreate(StockAdjustmentItemBase):
    pass


class StockAdjustmentItem(StockAdjustmentItemBase):
    id: int
    adjustment_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class StockAdjustmentBase(BaseModel):
    adjustment_date: date
    depot_id: int
    adjustment_type: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[str] = "Pending"


class StockAdjustmentCreate(StockAdjustmentBase):
    items: List[StockAdjustmentItemCreate]


class StockAdjustment(StockAdjustmentBase):
    id: int
    adjustment_number: str
    submitted_by: Optional[int] = None
    approved_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: List[StockAdjustmentItem] = []
    
    class Config:
        from_attributes = True


class ShippingPointBase(BaseModel):
    name: str = Field(..., min_length=1)
    code: str = Field(..., min_length=1)
    depot_id: int
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = True


class ShippingPointCreate(ShippingPointBase):
    pass


class ShippingPointUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    depot_id: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class ShippingPoint(ShippingPointBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RouteMasterBase(BaseModel):
    name: str = Field(..., min_length=1)
    depot_id: int
    stops: Optional[int] = 0
    distance: Optional[str] = None
    avg_time: Optional[str] = None
    status: Optional[str] = "Active"


class RouteMasterCreate(RouteMasterBase):
    route_id: Optional[str] = None


class RouteMasterUpdate(BaseModel):
    name: Optional[str] = None
    route_id: Optional[str] = None
    depot_id: Optional[int] = None
    stops: Optional[int] = None
    distance: Optional[str] = None
    avg_time: Optional[str] = None
    status: Optional[str] = None


class RouteMaster(RouteMasterBase):
    id: int
    route_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Product receipt schemas
class ProductReceiptItemBase(BaseModel):
    legacy_code: Optional[str] = None
    item_code: Optional[str] = None
    item_name: str
    pack_size: Optional[str] = None
    uom: Optional[str] = None
    expiry_date: Optional[date] = None
    batch_number: Optional[str] = None  # Must be numeric if provided
    
    @validator('batch_number', pre=True, always=True)
    def validate_batch_number(cls, v):
        if v is None or v == "":
            return None
        cleaned = str(v).strip()
        if cleaned and not cleaned.isdigit():
            raise ValueError('Batch number must be numeric only (digits only)')
        return cleaned if cleaned else None
    
    number_of_ifc: Decimal = Decimal("0")
    depot_quantity: Decimal = Decimal("0")
    ifc_per_full_mc: Decimal = Decimal("0")
    number_of_full_mc: Decimal = Decimal("0")
    ifc_in_loose_mc: Decimal = Decimal("0")


class ProductReceiptItemCreate(ProductReceiptItemBase):
    id: Optional[int] = None


class ProductReceiptItem(ProductReceiptItemBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProductReceiptBase(BaseModel):
    receipt_number: Optional[str] = None
    source_type: ReceiptSourceEnum
    target_depot_id: Optional[int] = None
    to_address: Optional[str] = None
    tfa_number: Optional[str] = None
    iso_number: Optional[str] = None
    shipment_mode: Optional[str] = None
    delivery_person: Optional[str] = None
    vehicle_info: Optional[str] = None
    issued_date: Optional[date] = None
    vat_number: Optional[str] = None
    remarks: Optional[str] = None


class ProductReceiptCreate(ProductReceiptBase):
    items: List[ProductReceiptItemCreate]


class ProductReceiptUpdate(BaseModel):
    source_type: Optional[ReceiptSourceEnum] = None
    target_depot_id: Optional[int] = None
    to_address: Optional[str] = None
    tfa_number: Optional[str] = None
    iso_number: Optional[str] = None
    shipment_mode: Optional[str] = None
    delivery_person: Optional[str] = None
    vehicle_info: Optional[str] = None
    issued_date: Optional[date] = None
    vat_number: Optional[str] = None
    remarks: Optional[str] = None
    items: Optional[List[ProductReceiptItemCreate]] = None


class ProductReceipt(ProductReceiptBase):
    id: int
    receipt_number: str
    status: ProductReceiptStatus
    created_at: datetime
    updated_at: datetime
    items: List[ProductReceiptItem]

    class Config:
        from_attributes = True


class ProductReceiptListResponse(BaseModel):
    data: List[ProductReceipt]
    total: int


class ProductReceiptApprovalResponse(BaseModel):
    id: int
    receipt_number: str
    status: ProductReceiptStatus
    approved_at: datetime


# Delivery Order schemas
class OrderDeliveryItemBase(BaseModel):
    order_item_id: int
    product_id: int
    product_name: str
    legacy_code: Optional[str] = None
    new_code: Optional[str] = None
    pack_size: Optional[str] = None
    uom: Optional[str] = None
    batch_number: str  # Must be numeric
    
    @validator('batch_number', pre=True)
    def validate_batch_number(cls, v):
        if not v:
            raise ValueError('Batch number is required')
        cleaned = str(v).strip()
        if not cleaned.isdigit():
            raise ValueError('Batch number must be numeric only (digits only)')
        return cleaned
    expiry_date: Optional[date] = None
    ordered_quantity: Decimal
    delivery_quantity: Decimal
    picked_quantity: Decimal
    available_stock: Decimal = Decimal("0")
    status: Optional[str] = "Pending"
    free_goods_threshold: Optional[Decimal] = None
    free_goods_quantity: Optional[Decimal] = None
    free_goods_awarded: Optional[Decimal] = None
    product_rate: Optional[Decimal] = None
    trade_amount: Optional[Decimal] = None
    vat_amount: Optional[Decimal] = None


class OrderDeliveryItemCreate(OrderDeliveryItemBase):
    pass


class OrderDeliveryItem(OrderDeliveryItemBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class OrderDeliveryBase(BaseModel):
    order_id: int
    delivery_number: Optional[str] = None
    ship_to_party: Optional[str] = None
    sold_to_party: Optional[str] = None
    delivery_date: date
    planned_dispatch_time: Optional[str] = None
    vehicle_info: Optional[str] = None
    driver_name: Optional[str] = None
    warehouse_no: Optional[str] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    status: DeliveryStatusEnum = DeliveryStatusEnum.DRAFT
    remarks: Optional[str] = None


class OrderDeliveryCreate(OrderDeliveryBase):
    items: List[OrderDeliveryItemCreate] = []


class OrderDeliveryUpdate(BaseModel):
    ship_to_party: Optional[str] = None
    sold_to_party: Optional[str] = None
    delivery_date: Optional[date] = None
    planned_dispatch_time: Optional[str] = None
    vehicle_info: Optional[str] = None
    driver_name: Optional[str] = None
    warehouse_no: Optional[str] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    status: Optional[DeliveryStatusEnum] = None
    remarks: Optional[str] = None
    items: Optional[List[OrderDeliveryItemCreate]] = None


class OrderDelivery(OrderDeliveryBase):
    id: int
    status: DeliveryStatusEnum
    created_at: datetime
    updated_at: datetime
    items: List[OrderDeliveryItem]
    order_number: Optional[str] = None  # Include order number from related Order

    class Config:
        from_attributes = True


class OrderDeliveryListResponse(BaseModel):
    data: List[OrderDelivery]
    total: int


class PickingOrderDeliveryBase(BaseModel):
    delivery_id: int
    memo_no: Optional[str] = None
    value: Optional[Decimal] = None
    status: Optional[str] = None
    pso: Optional[str] = None
    remarks: Optional[str] = None
    cash: Optional[Decimal] = None
    dues: Optional[Decimal] = None
    amend: Optional[Decimal] = None
    returns: Optional[Decimal] = None


class PickingOrderDeliveryCreate(PickingOrderDeliveryBase):
    pass


class PickingOrderDelivery(PickingOrderDeliveryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PickingOrderBase(BaseModel):
    order_number: Optional[str] = None
    loading_no: Optional[str] = None
    loading_date: Optional[date] = None
    area: Optional[str] = None
    delivery_by: Optional[str] = None
    vehicle_no: Optional[str] = None
    remarks: Optional[str] = None
    status: Optional[str] = "Draft"


class PickingOrderCreate(PickingOrderBase):
    deliveries: List[PickingOrderDeliveryCreate]


class PickingOrder(PickingOrderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deliveries: List[PickingOrderDelivery]

    class Config:
        from_attributes = True


class PickingOrderListResponse(BaseModel):
    data: List[PickingOrder]
    total: int


class DeliveryProgressNode(BaseModel):
    key: str
    label: str
    status: str
    timestamp: Optional[datetime] = None


class DeliveryTrackingResponse(BaseModel):
    order_id: int
    order_number: Optional[str]
    memo_number: Optional[str] = None
    route_code: Optional[str] = None
    delivery_number: Optional[str]
    current_status: Optional[str] = None
    current_stage: Optional[str] = None
    current_stage_label: Optional[str] = None
    steps: List[DeliveryProgressNode]


# Billing schemas
class CollectionDepositBase(BaseModel):
    deposit_date: date
    collection_person_id: int
    deposit_method: DepositMethodEnum
    deposit_amount: Decimal
    transaction_number: str
    attachment_url: Optional[str] = None
    remaining_amount: Decimal = Decimal("0")
    total_collection_amount: Decimal
    notes: Optional[str] = None


class CollectionDepositCreate(CollectionDepositBase):
    pass


class CollectionDepositUpdate(BaseModel):
    deposit_date: Optional[date] = None
    deposit_method: Optional[DepositMethodEnum] = None
    deposit_amount: Optional[Decimal] = None
    transaction_number: Optional[str] = None
    attachment_url: Optional[str] = None
    remaining_amount: Optional[Decimal] = None
    notes: Optional[str] = None


class CollectionDeposit(CollectionDepositBase):
    id: int
    deposit_number: str
    approved: bool
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    collection_person_name: Optional[str] = None
    approver_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CollectionTransactionBase(BaseModel):
    order_id: int
    collection_person_id: int
    collection_date: date
    collection_type: CollectionTypeEnum
    collected_amount: Decimal
    pending_amount: Decimal
    total_amount: Decimal
    deposit_id: Optional[int] = None
    remarks: Optional[str] = None


class CollectionTransactionCreate(CollectionTransactionBase):
    pass


class CollectionTransaction(CollectionTransactionBase):
    id: int
    order_number: Optional[str] = None
    memo_number: Optional[str] = None
    customer_name: Optional[str] = None
    collection_person_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CollectionReportResponse(BaseModel):
    collection_person_id: int
    collection_person_name: str
    total_collected: Decimal
    total_deposited: Decimal
    total_pending: Decimal
    transaction_count: int
    deposits: List[CollectionDeposit]
    transactions: List[CollectionTransaction]


# MIS Report schemas
class MISReportMemoItem(BaseModel):
    product_code: str
    product_name: str
    pack_size: Optional[str] = None
    total_quantity: Decimal
    delivered_quantity: Optional[Decimal] = None
    returned_quantity: Optional[Decimal] = None
    unit_price: Decimal
    discount_percent: Decimal
    total_price: Decimal

    class Config:
        from_attributes = True


class MISReportMemo(BaseModel):
    id: int
    order_id: int
    order_number: Optional[str] = None
    memo_number: Optional[str] = None
    customer_name: str
    customer_code: Optional[str] = None
    route_code: Optional[str] = None
    route_name: Optional[str] = None
    delivery_date: date
    validated: bool
    validated_at: Optional[datetime] = None
    printed: bool
    printed_at: Optional[datetime] = None
    postponed: bool
    assigned: bool
    assigned_at: Optional[datetime] = None
    assigned_employee_name: Optional[str] = None
    assigned_vehicle_registration: Optional[str] = None
    loaded: bool
    loaded_at: Optional[datetime] = None
    loading_number: Optional[str] = None
    collection_status: Optional[str] = None
    collection_type: Optional[str] = None
    collected_amount: Optional[Decimal] = None
    pending_amount: Optional[Decimal] = None
    collection_approved: bool
    collection_approved_at: Optional[datetime] = None
    total_amount: Decimal
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class MISReportMemoDetail(BaseModel):
    id: int
    order_id: int
    order_number: Optional[str] = None
    memo_number: Optional[str] = None
    customer_name: str
    customer_code: Optional[str] = None
    customer_id: Optional[str] = None
    route_code: Optional[str] = None
    route_name: Optional[str] = None
    delivery_date: date
    pso_name: Optional[str] = None
    pso_code: Optional[str] = None
    pso_id: Optional[str] = None
    
    # Validation info
    validated: bool
    validated_at: Optional[datetime] = None
    
    # Printing info
    printed: bool
    printed_at: Optional[datetime] = None
    
    # Postponed status
    postponed: bool
    
    # Assignment info
    assigned: bool
    assigned_at: Optional[datetime] = None
    assigned_employee_id: Optional[int] = None
    assigned_employee_name: Optional[str] = None
    assigned_employee_code: Optional[str] = None
    assigned_vehicle_id: Optional[int] = None
    assigned_vehicle_registration: Optional[str] = None
    assigned_vehicle_model: Optional[str] = None
    
    # Loading info
    loaded: bool
    loaded_at: Optional[datetime] = None
    loading_number: Optional[str] = None
    loading_date: Optional[date] = None
    
    # Delivery status
    delivery_status: Optional[str] = None  # Fully Delivered, Partial Delivered, Postponed
    
    # Collection info
    collection_status: Optional[str] = None
    collection_type: Optional[str] = None
    collected_amount: Optional[Decimal] = None
    pending_amount: Optional[Decimal] = None
    collection_approved: bool
    collection_approved_at: Optional[datetime] = None
    collection_approved_by_name: Optional[str] = None
    collection_source: Optional[str] = None
    
    # Product items
    items: List[MISReportMemoItem]
    
    # Totals
    total_amount: Decimal
    total_items_count: int
    
    # Status
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Delivery approval schemas
class DeliveryApprovalMemo(BaseModel):
    memo_number: str
    delivered_quantity: int
    returned_quantity: int


class DeliveryApprovalRequest(BaseModel):
    loading_number: str
    memos: List[DeliveryApprovalMemo]


class DeliveryApprovalResponse(BaseModel):
    message: str
    loading_number: str
    approved_count: int
    orders_moved_to_collection: List[str]  # List of memo numbers


class CollectionMemoUpdate(BaseModel):
    memo_number: str
    collected_amount: float
    remaining_amount: float
    deposited_amount: Optional[float] = None


class CollectionCollectRequest(BaseModel):
    memos: Optional[List[CollectionMemoUpdate]] = None


# Mobile App schemas
class MobileAssignedMemo(BaseModel):
    id: int
    order_id: int
    memo_number: Optional[str] = None
    order_number: Optional[str] = None
    loading_number: Optional[str] = None
    customer_name: str
    customer_code: Optional[str] = None
    route_code: Optional[str] = None
    route_name: Optional[str] = None
    delivery_date: Optional[str] = None
    assigned_employee_id: Optional[int] = None
    assigned_employee_name: Optional[str] = None
    assigned_vehicle_id: Optional[int] = None
    assigned_vehicle_registration: Optional[str] = None
    assignment_date: Optional[str] = None
    items_count: int
    total_value: float
    mobile_accepted: bool
    mobile_accepted_by: Optional[str] = None
    mobile_accepted_at: Optional[str] = None
    area: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class MobileAcceptMemoRequest(BaseModel):
    memo_number: Optional[str] = None
    order_id: Optional[int] = None
    user_id: str  # Mobile app user ID


class MobileAcceptMemoResponse(BaseModel):
    success: bool
    message: str
    memo_number: Optional[str] = None
    loading_number: Optional[str] = None
    accepted_at: Optional[str] = None
    accepted_by: Optional[str] = None


class MobileMemoStatus(BaseModel):
    memo_number: str
    order_id: int
    customer_name: str
    accepted: bool
    accepted_by: Optional[str] = None
    accepted_at: Optional[str] = None


class MobileLoadingNumberStatus(BaseModel):
    loading_number: str
    total_memos: int
    accepted_memos: int
    pending_memos: int
    acceptance_rate: float
    all_accepted: bool
    memos: List[MobileMemoStatus]


# Transport Management System (TMS) Schemas

class VehicleBase(BaseModel):
    vehicle_id: str
    vehicle_type: str
    registration_number: str
    capacity: Optional[float] = None
    depot_id: int
    vendor: Optional[str] = None
    status: str = "Active"
    fuel_type: Optional[str] = None
    fuel_rate: Optional[float] = None
    fuel_efficiency: Optional[float] = None
    model: Optional[str] = None
    year: Optional[int] = None
    maintenance_schedule_km: Optional[float] = None
    last_maintenance_date: Optional[date] = None
    last_maintenance_km: Optional[float] = None

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    vehicle_type: Optional[str] = None
    capacity: Optional[float] = None
    depot_id: Optional[int] = None
    vendor: Optional[str] = None
    status: Optional[str] = None
    fuel_type: Optional[str] = None
    fuel_rate: Optional[float] = None
    fuel_efficiency: Optional[float] = None
    model: Optional[str] = None
    year: Optional[int] = None
    maintenance_schedule_km: Optional[float] = None
    last_maintenance_date: Optional[date] = None
    last_maintenance_km: Optional[float] = None

class Vehicle(VehicleBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DriverBase(BaseModel):
    driver_id: str
    first_name: str
    last_name: Optional[str] = None
    license_number: str
    license_expiry: Optional[date] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    status: str = "Available"

class DriverCreate(DriverBase):
    pass

class DriverUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    license_expiry: Optional[date] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None

class Driver(DriverBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class RouteStopBase(BaseModel):
    route_id: int
    stop_sequence: int
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class RouteStopCreate(RouteStopBase):
    pass

class RouteStop(RouteStopBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TripBase(BaseModel):
    delivery_id: Optional[int] = None
    vehicle_id: int
    driver_id: int
    route_id: int
    trip_date: date
    distance_km: Optional[float] = None
    estimated_fuel_cost: Optional[float] = None
    actual_fuel_cost: Optional[float] = None
    status: str = "Scheduled"
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    route_id: Optional[int] = None
    trip_date: Optional[date] = None
    distance_km: Optional[float] = None
    estimated_fuel_cost: Optional[float] = None
    actual_fuel_cost: Optional[float] = None
    status: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None

class Trip(TripBase):
    id: int
    trip_number: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TripWithDetails(Trip):
    vehicle: Optional[Vehicle] = None
    driver: Optional[Driver] = None
    route: Optional[dict] = None
    total_expenses: Optional[float] = None
    
    class Config:
        from_attributes = True

class RouteShippingPointBase(BaseModel):
    route_id: int
    shipping_point_id: int
    distance_km: float
    sequence: int
    is_active: bool = True

class RouteShippingPointCreate(RouteShippingPointBase):
    pass

class RouteShippingPointUpdate(BaseModel):
    route_id: Optional[int] = None
    shipping_point_id: Optional[int] = None
    distance_km: Optional[float] = None
    sequence: Optional[int] = None
    is_active: Optional[bool] = None

class RouteShippingPoint(RouteShippingPointBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TransportExpenseBase(BaseModel):
    trip_id: Optional[int] = None
    trip_number: Optional[str] = None
    route_id: Optional[int] = None
    expense_type: str  # fuel, toll, repair, maintenance, other
    amount: float
    description: Optional[str] = None
    expense_date: date
    is_auto_calculated: bool = False

class TransportExpenseCreate(TransportExpenseBase):
    pass

class TransportExpenseUpdate(BaseModel):
    trip_id: Optional[int] = None
    trip_number: Optional[str] = None
    route_id: Optional[int] = None
    expense_type: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    expense_date: Optional[date] = None

class TransportExpense(TransportExpenseBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TripAssignmentRequest(BaseModel):
    delivery_id: Optional[int] = None
    vehicle_id: int
    driver_id: int
    route_id: int
    trip_date: date
    notes: Optional[str] = None

class TripAssignmentResponse(BaseModel):
    trip: Trip
    calculated_distance: float
    estimated_fuel_cost: float
    message: str

class TransportReportRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    route_id: Optional[int] = None

class TransportReportResponse(BaseModel):
    total_trips: int
    total_distance: float
    total_fuel_cost: float
    total_expenses: float
    trips_by_vehicle: List[dict]
    trips_by_driver: List[dict]
    monthly_stats: List[dict]
    expenses_by_trip: List[dict] = []  # Expenses grouped by trip number


class DoctorBase(BaseModel):
    name: str = Field(..., min_length=1)
    specialization: str = Field(..., min_length=1)
    registration_number: str = Field(..., min_length=1)
    qualification: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    is_active: Optional[bool] = True


class DoctorCreate(DoctorBase):
    code: Optional[str] = None


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialization: Optional[str] = None
    registration_number: Optional[str] = None
    qualification: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    is_active: Optional[bool] = None
    code: Optional[str] = None


class Doctor(DoctorBase):
    id: int
    code: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DoctorList(BaseModel):
    items: List[Doctor]


class ChemistShopBase(BaseModel):
    name: str = Field(..., min_length=1)
    owner_name: str = Field(..., min_length=1)
    license_number: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    is_active: Optional[bool] = True


class ChemistShopCreate(ChemistShopBase):
    code: Optional[str] = None


class ChemistShopUpdate(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    license_number: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    is_active: Optional[bool] = None
    code: Optional[str] = None


class ChemistShop(ChemistShopBase):
    id: int
    code: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChemistShopList(BaseModel):
    items: List[ChemistShop]


SAMPLE_GIFT_RECIPIENT_TYPES = (
    "Doctor",
    "Pharmacy",
    "Hospital",
    "Distributor",
    "Partner",
    "Other",
)
SAMPLE_GIFT_DOCUMENT_KINDS = ("sample", "gift")
SAMPLE_GIFT_STATUSES = ("Draft",)


class SampleGiftDeliveryItemCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(..., gt=0)
    gift_type: Optional[str] = Field(None, max_length=100)


class SampleGiftDeliveryItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: Decimal
    gift_type: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SampleGiftDeliveryCreate(BaseModel):
    delivery_number: Optional[str] = Field(None, max_length=50)
    depot_id: Optional[int] = None
    document_kind: str = Field(..., min_length=1, max_length=20)
    gift_type: Optional[str] = Field(None, max_length=100)
    occasion: Optional[str] = Field(None, max_length=255)
    delivery_date: date
    recipient_name: str = Field(..., min_length=1, max_length=255)
    recipient_type: str = Field(..., min_length=1, max_length=50)
    recipient_address: Optional[str] = None
    recipient_phone: Optional[str] = Field(None, max_length=50)
    recipient_email: Optional[str] = Field(None, max_length=255)
    remarks: Optional[str] = None
    items: List[SampleGiftDeliveryItemCreate]

    @validator("document_kind")
    def validate_document_kind(cls, value):
        kind = (value or "").strip().lower()
        if kind not in SAMPLE_GIFT_DOCUMENT_KINDS:
            raise ValueError("document_kind must be 'sample' or 'gift'")
        return kind

    @validator("recipient_name")
    def validate_recipient_name(cls, value):
        name = (value or "").strip()
        if not name:
            raise ValueError("recipient_name is required")
        return name

    @validator("recipient_type")
    def validate_recipient_type(cls, value):
        if value not in SAMPLE_GIFT_RECIPIENT_TYPES:
            raise ValueError(
                "recipient_type must be one of: " + ", ".join(SAMPLE_GIFT_RECIPIENT_TYPES)
            )
        return value

    @validator("items")
    def validate_items(cls, value):
        if not value:
            raise ValueError("At least one line item is required")
        return value


class SampleGiftDeliveryUpdate(SampleGiftDeliveryCreate):
    pass


class SampleGiftDeliveryResponse(BaseModel):
    id: int
    delivery_number: str
    depot_id: int
    document_kind: str
    gift_type: Optional[str] = None
    occasion: Optional[str] = None
    status: str
    delivery_date: date
    recipient_name: str
    recipient_type: str
    recipient_address: Optional[str] = None
    recipient_phone: Optional[str] = None
    recipient_email: Optional[str] = None
    remarks: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    total_items: int = 0
    total_quantity: Decimal = Decimal("0")

    class Config:
        from_attributes = True


class SampleGiftDeliveryDetailResponse(SampleGiftDeliveryResponse):
    items: List[SampleGiftDeliveryItemResponse] = []


EXPORT_INCOTERMS = ("FOB", "CIF", "CFR", "EXW", "DDP")
EXPORT_PAYMENT_TERMS = ("LC", "TT", "DP", "DA", "Advance")


class ExportDeliveryItemCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(Decimal("0"), ge=0)
    batch_number: Optional[str] = Field(None, max_length=100)
    expiry_date: Optional[date] = None
    hsn_code: Optional[str] = Field(None, max_length=50)

    @validator("batch_number", "hsn_code", pre=True)
    def empty_item_str(cls, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        return value.strip() if isinstance(value, str) else value


class ExportDeliveryItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal
    hsn_code: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExportDeliveryCreate(BaseModel):
    delivery_number: Optional[str] = Field(None, max_length=50)
    depot_id: Optional[int] = None
    delivery_date: date
    destination_country: str = Field(..., min_length=1, max_length=100)
    port_of_loading: str = Field(..., min_length=1, max_length=150)
    port_of_discharge: str = Field(..., min_length=1, max_length=150)
    shipping_line: Optional[str] = Field(None, max_length=150)
    container_number: Optional[str] = Field(None, max_length=50)
    bl_number: Optional[str] = Field(None, max_length=100)
    invoice_number: Optional[str] = Field(None, max_length=100)
    lc_number: Optional[str] = Field(None, max_length=100)
    incoterms: Optional[str] = Field(None, max_length=20)
    payment_terms: Optional[str] = Field(None, max_length=50)
    remarks: Optional[str] = None
    items: List[ExportDeliveryItemCreate]

    @validator(
        "destination_country",
        "port_of_loading",
        "port_of_discharge",
    )
    def required_trimmed(cls, value):
        text = (value or "").strip()
        if not text:
            raise ValueError("This field is required")
        return text

    @validator(
        "shipping_line",
        "container_number",
        "bl_number",
        "invoice_number",
        "lc_number",
        "remarks",
        pre=True,
    )
    def empty_optional(cls, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        return value.strip() if isinstance(value, str) else value

    @validator("incoterms", pre=True)
    def validate_incoterms(cls, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        code = value.strip().upper()
        if code not in EXPORT_INCOTERMS:
            raise ValueError("incoterms must be one of: " + ", ".join(EXPORT_INCOTERMS))
        return code

    @validator("payment_terms", pre=True)
    def validate_payment_terms(cls, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        code = value.strip()
        if code not in EXPORT_PAYMENT_TERMS:
            raise ValueError(
                "payment_terms must be one of: " + ", ".join(EXPORT_PAYMENT_TERMS)
            )
        return code

    @validator("items")
    def validate_items(cls, value):
        if not value:
            raise ValueError("At least one line item is required")
        return value


class ExportDeliveryUpdate(ExportDeliveryCreate):
    pass


class ExportDeliveryResponse(BaseModel):
    id: int
    delivery_number: str
    depot_id: int
    status: str
    delivery_date: date
    destination_country: str
    port_of_loading: str
    port_of_discharge: str
    shipping_line: Optional[str] = None
    container_number: Optional[str] = None
    bl_number: Optional[str] = None
    invoice_number: Optional[str] = None
    lc_number: Optional[str] = None
    incoterms: Optional[str] = None
    payment_terms: Optional[str] = None
    remarks: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    total_items: int = 0
    total_quantity: Decimal = Decimal("0")
    total_value: Decimal = Decimal("0")

    class Config:
        from_attributes = True


class ExportDeliveryDetailResponse(ExportDeliveryResponse):
    items: List[ExportDeliveryItemResponse] = []


class DraftWorkflowActionRequest(BaseModel):
    """Isolated Submit/Approve/Reject body. Production does not mount these routes."""

    reason: Optional[str] = None
    remarks: Optional[str] = None


class IsolatedReserveRequest(BaseModel):
    """Isolated inventory reserve body. Production does not mount these routes."""

    idempotency_key: str = Field(..., min_length=1, max_length=128)
    remarks: Optional[str] = Field(None, max_length=500)


class IsolatedReservationLineResponse(BaseModel):
    document_item_id: int
    product_id: int
    requested_quantity: Decimal
    reserved_quantity: Decimal


class IsolatedReservationSliceResponse(BaseModel):
    lot_id: int
    batch_no: str
    expiry_date: Optional[date] = None
    allocated_quantity: Decimal
    depot_id: int
    product_id: Optional[int] = None
    document_item_id: Optional[int] = None


class IsolatedReservationResponse(BaseModel):
    reservation_id: str
    document_kind: str
    document_id: int
    depot_id: Optional[int] = None
    status: str
    idempotency_key: str
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    released_by: Optional[int] = None
    released_at: Optional[datetime] = None
    remarks: Optional[str] = None
    lines: List[IsolatedReservationLineResponse] = []
    slices: List[IsolatedReservationSliceResponse] = []


class IsolatedFulfillmentActionRequest(BaseModel):
    idempotency_key: str = Field(..., min_length=1, max_length=128)
    remarks: Optional[str] = Field(None, max_length=500)


class IsolatedPickSliceInput(BaseModel):
    lot_id: int
    picked_quantity: Decimal


class IsolatedConfirmPickRequest(IsolatedFulfillmentActionRequest):
    slices: List[IsolatedPickSliceInput]


class IsolatedDispatchRequest(IsolatedFulfillmentActionRequest):
    transport_ref: Optional[str] = Field(None, max_length=150)


class IsolatedDeliveryConfirmRequest(IsolatedFulfillmentActionRequest):
    receiver_name: Optional[str] = Field(None, max_length=255)
    delivered_quantity: Optional[Decimal] = None
    confirmation_date: Optional[date] = None
    pod_ref: Optional[str] = Field(None, max_length=150)


class IsolatedDeliveryFailRequest(IsolatedFulfillmentActionRequest):
    reason: str = Field(..., min_length=1, max_length=500)


class IsolatedFulfillmentSliceResponse(BaseModel):
    lot_id: int
    batch_no: str
    expiry_date: Optional[date] = None
    reserved_quantity: Decimal
    picked_quantity: Decimal


class IsolatedFulfillmentResponse(BaseModel):
    fulfillment_id: str
    reservation_id: str
    document_kind: str
    document_id: int
    depot_id: int
    status: str
    issued_quantity: Decimal
    dispatch_id: Optional[str] = None
    delivery_id: Optional[str] = None
    transport_ref: Optional[str] = None
    receiver_name: Optional[str] = None
    delivered_quantity: Optional[Decimal] = None
    pod_ref: Optional[str] = None
    fail_reason: Optional[str] = None
    remarks: Optional[str] = None
    slices: List[IsolatedFulfillmentSliceResponse] = []


class IsolatedFulfillmentAuditResponse(BaseModel):
    action: str
    actor_id: Optional[int] = None
    from_status: Optional[str] = None
    to_status: str
    created_at: Optional[datetime] = None