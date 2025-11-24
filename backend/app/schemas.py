from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from app.models import RoleTypeEnum, OrderStatusEnum, ReceiptSourceEnum, ProductReceiptStatus, DeliveryStatusEnum

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


# Order schemas
class OrderItemBase(BaseModel):
    old_code: str
    new_code: Optional[str] = None
    product_name: str
    pack_size: Optional[str] = None
    quantity: Decimal
    trade_price: Decimal = 0
    delivery_date: date
    selected: bool = True


class OrderItemCreate(OrderItemBase):
    id: Optional[int] = None


class OrderItem(OrderItemBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    depot_code: str
    depot_name: str
    customer_id: str
    customer_name: str
    customer_code: Optional[str] = None
    pso_id: str
    pso_name: str
    pso_code: Optional[str] = None
    delivery_date: date
    notes: Optional[str] = None


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
    delivery_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[OrderStatusEnum] = None
    items: Optional[List[OrderItemCreate]] = None


class Order(OrderBase):
    id: int
    order_number: Optional[str] = None
    status: OrderStatusEnum
    created_at: datetime
    updated_at: datetime
    items: List[OrderItem]

    class Config:
        from_attributes = True


class OrderApprovalRequest(BaseModel):
    order_ids: List[int]
    order_number: Optional[str] = None


class OrderApprovalResponse(BaseModel):
    order_number: str
    orders: List[Order]


# Stock Adjustment schemas
class StockAdjustmentItemBase(BaseModel):
    product_id: int
    batch: Optional[str] = None
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
    created_at: datetime
    updated_at: datetime
    items: List[StockAdjustmentItem] = []
    
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
    batch_number: Optional[str] = None
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


# Delivery order schemas
class DeliveryOrderItemBase(BaseModel):
    order_item_id: int
    product_id: int
    product_name: str
    legacy_code: Optional[str] = None
    new_code: Optional[str] = None
    pack_size: Optional[str] = None
    uom: Optional[str] = None
    batch_number: str
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


class DeliveryOrderItemCreate(DeliveryOrderItemBase):
    pass


class DeliveryOrderItem(DeliveryOrderItemBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DeliveryOrderBase(BaseModel):
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


class DeliveryOrderCreate(DeliveryOrderBase):
    items: List[DeliveryOrderItemCreate] = []


class DeliveryOrderUpdate(BaseModel):
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
    items: Optional[List[DeliveryOrderItemCreate]] = None


class DeliveryOrder(DeliveryOrderBase):
    id: int
    status: DeliveryStatusEnum
    created_at: datetime
    updated_at: datetime
    items: List[DeliveryOrderItem]

    class Config:
        from_attributes = True


class DeliveryOrderListResponse(BaseModel):
    data: List[DeliveryOrder]
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
    delivery_number: Optional[str]
    current_status: DeliveryStatusEnum
    steps: List[DeliveryProgressNode]
 
