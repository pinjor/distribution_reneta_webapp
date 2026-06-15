"""Platform extension models: audit, validation, status, finance, integrations, sync, devices."""
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Index,
    JSON,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base

JSONType = JSON().with_variant(JSONB(), "postgresql")


# --- Enums ---


class DeliveryStatusEnum(str, enum.Enum):
    ORDER_CREATED = "ORDER_CREATED"
    REJECTED = "REJECTED"
    VALIDATED = "VALIDATED"
    PICKING_IN_PROGRESS = "PICKING_IN_PROGRESS"
    PACKING_IN_PROGRESS = "PACKING_IN_PROGRESS"
    PLANNED_FOR_DELIVERY = "PLANNED_FOR_DELIVERY"
    READY_TO_DISPATCH = "READY_TO_DISPATCH"
    IN_DELIVERY = "IN_DELIVERY"
    DELIVERY_IN_PROGRESS = "DELIVERY_IN_PROGRESS"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    POSTPONED = "POSTPONED"


class CollectionStatusEnum(str, enum.Enum):
    NOT_YET_DELIVERED = "NOT_YET_DELIVERED"
    DELIVERED_NOT_COLLECTED = "DELIVERED_NOT_COLLECTED"
    COLLECTION_IN_PROGRESS = "COLLECTION_IN_PROGRESS"
    COLLECTED = "COLLECTED"
    DUE_COLLECTION = "DUE_COLLECTION"
    CANCELLED = "CANCELLED"


class OrderSourceEnum(str, enum.Enum):
    MANUAL_DMS = "MANUAL_DMS"
    FIELD_FORCE = "FIELD_FORCE"
    DEX_CRP = "DEX_CRP"
    INTEGRATION = "INTEGRATION"


class OrderTypeEnum(str, enum.Enum):
    COD = "COD"
    CREDIT = "CREDIT"
    INVOICE = "INVOICE"


class ValidationStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    VALIDATED = "VALIDATED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    REJECTED = "REJECTED"
    FAILED = "FAILED"


class RiskLevelEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class PromotionStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    REJECTED = "REJECTED"


class ReconciliationStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CLOSED = "CLOSED"


class IntegrationJobStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    RETRY = "RETRY"


class SyncEventStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    CONFLICT = "CONFLICT"


class DeviceStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    BLOCKED = "BLOCKED"
    PENDING = "PENDING"


# --- Audit ---


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(64), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(100), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)
    old_value = Column(JSONType, nullable=True)
    new_value = Column(JSONType, nullable=True)
    user_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    user_name = Column(String(255), nullable=True)
    role_id = Column(String(50), nullable=True)
    role_name = Column(String(100), nullable=True)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=True)
    depot_code = Column(String(50), nullable=True)
    device_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    geo_latitude = Column(Numeric(10, 7), nullable=True)
    geo_longitude = Column(Numeric(10, 7), nullable=True)
    reason = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    attachment_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


# --- RBAC ---


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    module = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_code", "permission_id", name="uq_role_permission"),)

    id = Column(Integer, primary_key=True, index=True)
    role_code = Column(String(50), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LoginAudit(Base):
    __tablename__ = "login_audits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    email = Column(String(255), nullable=True)
    success = Column(Boolean, default=False)
    failure_reason = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    device_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# --- Order Validation ---


class ValidationRuleConfig(Base):
    __tablename__ = "validation_rule_configs"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(100), unique=True, nullable=False)
    rule_name = Column(String(255), nullable=False)
    enabled = Column(Boolean, default=True)
    severity = Column(String(20), default="ERROR")  # ERROR, WARNING, INFO
    config_json = Column(JSONType, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OrderValidationRun(Base):
    __tablename__ = "order_validation_runs"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    validation_status = Column(Enum(ValidationStatusEnum), nullable=False)
    risk_level = Column(Enum(RiskLevelEnum), default=RiskLevelEnum.LOW)
    total_requested_value = Column(Numeric(15, 2), default=0)
    total_validated_value = Column(Numeric(15, 2), default=0)
    total_short_stock_value = Column(Numeric(15, 2), default=0)
    credit_limit = Column(Numeric(15, 2), nullable=True)
    outstanding_amount = Column(Numeric(15, 2), nullable=True)
    credit_exposure_after_order = Column(Numeric(15, 2), nullable=True)
    requires_approval = Column(Boolean, default=False)
    approval_reason = Column(Text, nullable=True)
    validated_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    validated_at = Column(DateTime, nullable=True)
    is_current = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    messages = relationship("OrderValidationMessage", back_populates="validation_run", cascade="all, delete-orphan")
    batch_allocations = relationship("OrderBatchAllocation", back_populates="validation_run", cascade="all, delete-orphan")


class OrderValidationMessage(Base):
    __tablename__ = "order_validation_messages"

    id = Column(Integer, primary_key=True, index=True)
    validation_run_id = Column(Integer, ForeignKey("order_validation_runs.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    order_item_id = Column(Integer, ForeignKey("order_items.id", ondelete="SET NULL"), nullable=True)
    severity = Column(String(20), nullable=False)
    rule_code = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    blocking = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    validation_run = relationship("OrderValidationRun", back_populates="messages")


class OrderBatchAllocation(Base):
    __tablename__ = "order_batch_allocations"

    id = Column(Integer, primary_key=True, index=True)
    validation_run_id = Column(Integer, ForeignKey("order_validation_runs.id", ondelete="CASCADE"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_no = Column(String(100), nullable=False)
    expiry_date = Column(Date, nullable=True)
    allocated_qty = Column(Numeric(12, 2), nullable=False)
    stock_source_id = Column(Integer, nullable=True)
    allocation_status = Column(String(50), default="ALLOCATED")
    created_at = Column(DateTime, default=datetime.utcnow)

    validation_run = relationship("OrderValidationRun", back_populates="batch_allocations")


# --- Status History ---


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    from_delivery_status = Column(String(50), nullable=True)
    to_delivery_status = Column(String(50), nullable=True)
    from_collection_status = Column(String(50), nullable=True)
    to_collection_status = Column(String(50), nullable=True)
    event_code = Column(String(100), nullable=False)
    changed_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow, index=True)
    reason = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    geo_latitude = Column(Numeric(10, 7), nullable=True)
    geo_longitude = Column(Numeric(10, 7), nullable=True)
    source_system = Column(String(50), default="DMS_WEB")


# --- Promotions ---


class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    promotion_code = Column(String(50), unique=True, nullable=False)
    promotion_name = Column(String(255), nullable=False)
    promotion_type = Column(String(50), nullable=False)  # DISCOUNT, BONUS, OFFER, SCHEME
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(Enum(PromotionStatusEnum), default=PromotionStatusEnum.DRAFT)
    approval_status = Column(String(50), default="DRAFT")
    created_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    rules = relationship("PromotionRule", back_populates="promotion", cascade="all, delete-orphan")


class PromotionRule(Base):
    __tablename__ = "promotion_rules"

    id = Column(Integer, primary_key=True, index=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False)
    rule_type = Column(String(50), nullable=False)
    condition_json = Column(JSONType, nullable=True)
    benefit_json = Column(JSONType, nullable=True)
    priority = Column(Integer, default=0)
    combinable = Column(Boolean, default=True)
    max_usage = Column(Integer, nullable=True)

    promotion = relationship("Promotion", back_populates="rules")


class PromotionProduct(Base):
    __tablename__ = "promotion_products"
    __table_args__ = (UniqueConstraint("promotion_id", "product_id", name="uq_promo_product"),)

    id = Column(Integer, primary_key=True, index=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)


class PromotionDepot(Base):
    __tablename__ = "promotion_depots"
    __table_args__ = (UniqueConstraint("promotion_id", "depot_id", name="uq_promo_depot"),)

    id = Column(Integer, primary_key=True, index=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)


class PromotionCustomer(Base):
    __tablename__ = "promotion_customers"
    __table_args__ = (UniqueConstraint("promotion_id", "customer_id", name="uq_promo_customer"),)

    id = Column(Integer, primary_key=True, index=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)


class PromotionUsageLog(Base):
    __tablename__ = "promotion_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    benefit_amount = Column(Numeric(15, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


# --- Reconciliation ---


class ReconciliationRun(Base):
    __tablename__ = "reconciliation_runs"

    id = Column(Integer, primary_key=True, index=True)
    reconciliation_no = Column(String(50), unique=True, nullable=False)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=True)
    loading_number = Column(String(50), nullable=True, index=True)
    delivery_man_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    total_delivered_value = Column(Numeric(15, 2), default=0)
    total_collection_value = Column(Numeric(15, 2), default=0)
    total_return_value = Column(Numeric(15, 2), default=0)
    total_adjustment_value = Column(Numeric(15, 2), default=0)
    cash_in_hand = Column(Numeric(15, 2), default=0)
    deposit_value = Column(Numeric(15, 2), default=0)
    variance_amount = Column(Numeric(15, 2), default=0)
    status = Column(Enum(ReconciliationStatusEnum), default=ReconciliationStatusEnum.DRAFT)
    prepared_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    checked_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)

    lines = relationship("ReconciliationLine", back_populates="reconciliation_run", cascade="all, delete-orphan")
    variances = relationship("ReconciliationVariance", back_populates="reconciliation_run", cascade="all, delete-orphan")


class ReconciliationLine(Base):
    __tablename__ = "reconciliation_lines"

    id = Column(Integer, primary_key=True, index=True)
    reconciliation_run_id = Column(Integer, ForeignKey("reconciliation_runs.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    invoice_no = Column(String(50), nullable=True)
    delivered_value = Column(Numeric(15, 2), default=0)
    collected_value = Column(Numeric(15, 2), default=0)
    return_value = Column(Numeric(15, 2), default=0)
    adjustment_value = Column(Numeric(15, 2), default=0)
    variance_amount = Column(Numeric(15, 2), default=0)
    collection_status = Column(String(50), nullable=True)
    delivery_status = Column(String(50), nullable=True)

    reconciliation_run = relationship("ReconciliationRun", back_populates="lines")


class ReconciliationVariance(Base):
    __tablename__ = "reconciliation_variances"

    id = Column(Integer, primary_key=True, index=True)
    reconciliation_run_id = Column(Integer, ForeignKey("reconciliation_runs.id", ondelete="CASCADE"), nullable=False)
    variance_type = Column(String(100), nullable=False)
    variance_amount = Column(Numeric(15, 2), default=0)
    reason = Column(Text, nullable=True)
    responsible_user_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    resolution_status = Column(String(50), default="OPEN")

    reconciliation_run = relationship("ReconciliationRun", back_populates="variances")


class DayEndClosing(Base):
    __tablename__ = "day_end_closings"

    id = Column(Integer, primary_key=True, index=True)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)
    closing_date = Column(Date, nullable=False)
    total_assignments = Column(Integer, default=0)
    total_delivered_value = Column(Numeric(15, 2), default=0)
    total_collection_value = Column(Numeric(15, 2), default=0)
    total_return_value = Column(Numeric(15, 2), default=0)
    total_deposit_value = Column(Numeric(15, 2), default=0)
    total_variance = Column(Numeric(15, 2), default=0)
    status = Column(String(50), default="DRAFT")
    closed_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)


# --- Refund Liability ---


class RefundLiability(Base):
    __tablename__ = "refund_liabilities"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    return_id = Column(String(50), nullable=True)
    cn_no = Column(String(50), nullable=True)
    liability_amount = Column(Numeric(15, 2), nullable=False)
    remaining_amount = Column(Numeric(15, 2), nullable=False)
    status = Column(String(50), default="OPEN")
    created_at = Column(DateTime, default=datetime.utcnow)


class RefundSettlement(Base):
    __tablename__ = "refund_settlements"

    id = Column(Integer, primary_key=True, index=True)
    liability_id = Column(Integer, ForeignKey("refund_liabilities.id"), nullable=False)
    settlement_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    settlement_amount = Column(Numeric(15, 2), nullable=False)
    settled_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    settled_at = Column(DateTime, default=datetime.utcnow)


class CustomerCreditBalance(Base):
    __tablename__ = "customer_credit_balances"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), unique=True, nullable=False)
    balance_amount = Column(Numeric(15, 2), default=0)
    last_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# --- Integrations ---


class IntegrationSystem(Base):
    __tablename__ = "integration_systems"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    adapter_class = Column(String(255), nullable=True)
    config_json = Column(JSONType, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class IntegrationJob(Base):
    __tablename__ = "integration_jobs"

    id = Column(Integer, primary_key=True, index=True)
    system_id = Column(Integer, ForeignKey("integration_systems.id"), nullable=False)
    job_type = Column(String(100), nullable=False)
    idempotency_key = Column(String(100), unique=True, nullable=True, index=True)
    status = Column(Enum(IntegrationJobStatusEnum), default=IntegrationJobStatusEnum.PENDING)
    payload_json = Column(JSONType, nullable=True)
    result_json = Column(JSONType, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class IntegrationJobLog(Base):
    __tablename__ = "integration_job_logs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("integration_jobs.id", ondelete="CASCADE"), nullable=False)
    level = Column(String(20), default="INFO")
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class IntegrationFailure(Base):
    __tablename__ = "integration_failures"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("integration_jobs.id"), nullable=True)
    system_code = Column(String(50), nullable=False)
    error_code = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=False)
    payload_json = Column(JSONType, nullable=True)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# --- Devices ---


class MobileDevice(Base):
    __tablename__ = "mobile_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    device_id = Column(String(100), nullable=False, index=True)
    imei_or_hardware_id = Column(String(100), nullable=True)
    device_name = Column(String(255), nullable=True)
    platform = Column(String(50), nullable=True)
    app_version = Column(String(50), nullable=True)
    status = Column(Enum(DeviceStatusEnum), default=DeviceStatusEnum.ACTIVE)
    registered_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, nullable=True)
    blocked_at = Column(DateTime, nullable=True)
    blocked_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    block_reason = Column(Text, nullable=True)

    __table_args__ = (UniqueConstraint("user_id", "device_id", name="uq_user_device"),)


class DeviceLoginAttempt(Base):
    __tablename__ = "device_login_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    device_id = Column(String(100), nullable=True)
    attempt_status = Column(String(50), nullable=False)
    ip_address = Column(String(45), nullable=True)
    geo_latitude = Column(Numeric(10, 7), nullable=True)
    geo_longitude = Column(Numeric(10, 7), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# --- Sync ---


class SyncCheckpoint(Base):
    __tablename__ = "sync_checkpoints"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    device_id = Column(String(100), nullable=True)
    source_system = Column(String(50), nullable=False)
    last_sync_at = Column(DateTime, nullable=True)
    last_version = Column(String(50), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SyncEvent(Base):
    __tablename__ = "sync_events"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String(100), unique=True, nullable=False, index=True)
    source_system = Column(String(50), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    event_type = Column(String(100), nullable=False)
    payload_json = Column(JSONType, nullable=True)
    client_version = Column(String(50), nullable=True)
    status = Column(Enum(SyncEventStatusEnum), default=SyncEventStatusEnum.PENDING)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class SyncQueue(Base):
    __tablename__ = "sync_queue"

    id = Column(Integer, primary_key=True, index=True)
    sync_event_id = Column(Integer, ForeignKey("sync_events.id"), nullable=False)
    retry_count = Column(Integer, default=0)
    next_retry_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="PENDING")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SyncConflict(Base):
    __tablename__ = "sync_conflicts"

    id = Column(Integer, primary_key=True, index=True)
    sync_event_id = Column(Integer, ForeignKey("sync_events.id"), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False)
    server_version = Column(String(50), nullable=True)
    client_version = Column(String(50), nullable=True)
    resolution = Column(String(50), default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)


# --- External order tracking ---


class ExternalOrderRef(Base):
    __tablename__ = "external_order_refs"
    __table_args__ = (
        UniqueConstraint("source_system", "external_order_id", name="uq_external_order"),
    )

    id = Column(Integer, primary_key=True, index=True)
    source_system = Column(String(50), nullable=False)
    external_order_id = Column(String(100), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
