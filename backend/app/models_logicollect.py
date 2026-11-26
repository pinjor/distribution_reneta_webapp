"""LogiCollect field-app persistence. Additive tables only. Not used by web routers."""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Index,
)

from app.database import Base


class LcSession(Base):
    __tablename__ = "lc_sessions"

    id = Column(String(36), primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    refresh_token_hash = Column(String(64), unique=True, nullable=False)
    access_jti = Column(String(36), nullable=False, index=True)
    refresh_jti = Column(String(36), nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    refresh_expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class LcEmployeeProfile(Base):
    __tablename__ = "lc_employee_profiles"

    employee_id = Column(Integer, ForeignKey("employees.id"), primary_key=True)
    display_name = Column(String(200), nullable=True)
    photo_id = Column(String(36), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class LcMedia(Base):
    __tablename__ = "lc_media"

    id = Column(String(36), primary_key=True)
    owner_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    kind = Column(String(40), nullable=False)
    content_type = Column(String(80), nullable=False)
    original_name = Column(String(255), nullable=True)
    data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class LcMemoState(Base):
    __tablename__ = "lc_memo_states"

    order_id = Column(Integer, ForeignKey("orders.id"), primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="pending")
    payment_status = Column(String(32), nullable=False, default="due")
    paid_amount = Column(Numeric(15, 2), nullable=False, default=0)
    delivered_amount = Column(Numeric(15, 2), nullable=False, default=0)
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    credit_due_at = Column(Date, nullable=True)
    postpone_reason = Column(Text, nullable=True)
    cancel_reason = Column(Text, nullable=True)
    collection_postpone_reason = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (Index("ix_lc_memo_emp_status", "employee_id", "status"),)


class LcMemoLine(Base):
    __tablename__ = "lc_memo_lines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id"), nullable=False)
    delivered_qty = Column(Numeric(15, 2), nullable=False, default=0)
    short_reason = Column(Text, nullable=True)
    __table_args__ = (UniqueConstraint("order_item_id", name="uq_lc_memo_line_item"),)


class LcRouteVisit(Base):
    __tablename__ = "lc_route_visits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    business_date = Column(Date, nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    sequence = Column(Integer, nullable=False, default=1)
    stop_status = Column(String(32), nullable=False, default="pending")
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        UniqueConstraint("employee_id", "business_date", "order_id", name="uq_lc_visit_day_order"),
        Index("ix_lc_visit_emp_day", "employee_id", "business_date"),
    )


class LcWallet(Base):
    __tablename__ = "lc_wallets"

    employee_id = Column(Integer, ForeignKey("employees.id"), primary_key=True)
    cash_balance = Column(Numeric(15, 2), nullable=False, default=0)
    credit_balance = Column(Numeric(15, 2), nullable=False, default=0)
    total_collected = Column(Numeric(15, 2), nullable=False, default=0)
    total_deposited = Column(Numeric(15, 2), nullable=False, default=0)
    version = Column(Integer, nullable=False, default=0)


class LcMovement(Base):
    __tablename__ = "lc_movements"

    id = Column(String(36), primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    kind = Column(String(16), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    payment_mode = Column(String(16), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    deposit_id = Column(String(36), nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class LcDeposit(Base):
    __tablename__ = "lc_deposits"

    id = Column(String(36), primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    method = Column(String(16), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    transaction_id = Column(String(120), nullable=False)
    media_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    __table_args__ = (UniqueConstraint("employee_id", "transaction_id", name="uq_lc_deposit_txn"),)


class LcReturnLine(Base):
    __tablename__ = "lc_return_lines"

    id = Column(String(40), primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    remaining_qty = Column(Numeric(15, 2), nullable=False)
    adjusted = Column(Boolean, nullable=False, default=False)
    return_memo_id = Column(Integer, nullable=True)
    __table_args__ = (UniqueConstraint("order_item_id", name="uq_lc_return_item"),)


class LcReturnMemo(Base):
    __tablename__ = "lc_return_memos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    return_memo_no = Column(String(32), unique=True, nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    original_invoice_no = Column(String(32), nullable=False)
    customer_name = Column(String(255), nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


class LcChemist(Base):
    __tablename__ = "lc_chemists"

    id = Column(String(36), primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    legacy_code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String(80), nullable=True)
    location = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    owner_name = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    division = Column(String(80), nullable=False)
    district = Column(String(80), nullable=False)
    thana = Column(String(80), nullable=False)
    photo_id = Column(String(36), nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class LcPerformanceTarget(Base):
    __tablename__ = "lc_performance_targets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    period_from = Column(Date, nullable=False)
    period_to = Column(Date, nullable=False)
    target_deliveries = Column(Integer, nullable=False, default=0)
    target_collections = Column(Integer, nullable=False, default=0)
    target_amount = Column(Numeric(15, 2), nullable=False, default=0)
    __table_args__ = (Index("ix_lc_perf_emp", "employee_id", "period_from"),)


class LcIdempotency(Base):
    __tablename__ = "lc_idempotency"

    key = Column(String(80), primary_key=True)
    employee_id = Column(Integer, nullable=False)
    operation = Column(String(80), nullable=False)
    payload_hash = Column(String(64), nullable=False)
    status_code = Column(Integer, nullable=False)
    response_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
