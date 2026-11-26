"""Opening stock request documents. Do not write ProductItemStock from these models."""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


class OpeningStockRequest(Base):
    __tablename__ = "opening_stock_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String(50), unique=True, nullable=False, index=True)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False, index=True)
    opening_date = Column(Date, nullable=False)
    remarks = Column(Text)
    status = Column(String(32), nullable=False, default="Draft", index=True)
    posting_status = Column(String(32), nullable=False, default="not_posted", index=True)
    posting_blocked_reason = Column(Text)
    requested_by = Column(Integer, ForeignKey("employees.id"), nullable=False)
    reviewed_by = Column(Integer, ForeignKey("employees.id"))
    reviewed_at = Column(DateTime)
    review_reason = Column(Text)
    submitted_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    depot = relationship("Depot")
    requester = relationship("Employee", foreign_keys=[requested_by])
    reviewer = relationship("Employee", foreign_keys=[reviewed_by])
    items = relationship(
        "OpeningStockRequestItem",
        back_populates="request",
        cascade="all, delete-orphan",
        order_by="OpeningStockRequestItem.id",
    )
    history = relationship(
        "OpeningStockApprovalHistory",
        back_populates="request",
        cascade="all, delete-orphan",
        order_by="OpeningStockApprovalHistory.id",
    )


class OpeningStockRequestItem(Base):
    __tablename__ = "opening_stock_request_items"
    __table_args__ = (UniqueConstraint("request_id", "product_id", "batch_number", name="uq_os_item_product_batch"),)

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("opening_stock_requests.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_number = Column(String(100), nullable=False)
    manufacturing_date = Column(Date)
    expiry_date = Column(Date, nullable=False)
    quantity = Column(Numeric(15, 2), nullable=False)
    unit_of_measure = Column(String(50))
    unit_cost = Column(Numeric(15, 4))
    remarks = Column(Text)

    request = relationship("OpeningStockRequest", back_populates="items")
    product = relationship("Product")


class OpeningStockApprovalHistory(Base):
    __tablename__ = "opening_stock_approval_history"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("opening_stock_requests.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(40), nullable=False)
    from_status = Column(String(32))
    to_status = Column(String(32))
    actor_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    request = relationship("OpeningStockRequest", back_populates="history")
    actor = relationship("Employee")


class OpeningStockPostingReference(Base):
    """Reserved for a future authorized posting. Never written to commercial ledgers from this table today."""

    __tablename__ = "opening_stock_posting_references"
    __table_args__ = (UniqueConstraint("request_id", name="uq_os_posting_request"),)

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("opening_stock_requests.id"), nullable=False)
    posted = Column(Boolean, nullable=False, default=False)
    simulation_only = Column(Boolean, nullable=False, default=True)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    request = relationship("OpeningStockRequest")
