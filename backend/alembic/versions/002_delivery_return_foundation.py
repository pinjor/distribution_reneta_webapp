"""Delivery allocation outcomes and return verification.

Revision ID: 002_delivery_return
Revises: 001_platform
Create Date: 2026-11-19

This revision is source only. Do not run it against swift_distro_hub.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_delivery_return"
down_revision: Union[str, None] = "001_platform"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "delivery_allocation_outcomes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_item_id", sa.Integer(), sa.ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("allocation_id", sa.Integer(), sa.ForeignKey("order_batch_allocations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("depot_id", sa.Integer(), sa.ForeignKey("depots.id"), nullable=False),
        sa.Column("batch_no", sa.String(length=100), nullable=False),
        sa.Column("reserved_quantity", sa.Numeric(12, 2), nullable=False),
        sa.Column("delivered_quantity", sa.Numeric(12, 2), nullable=False),
        sa.Column("undelivered_quantity", sa.Numeric(12, 2), nullable=False),
        sa.Column("delivery_reference", sa.String(length=100), nullable=False),
        sa.Column("custody_status", sa.String(length=50), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("allocation_id", name="uq_delivery_outcome_allocation"),
        sa.CheckConstraint("reserved_quantity >= 0", name="ck_delivery_outcome_reserved_nonneg"),
        sa.CheckConstraint("delivered_quantity >= 0", name="ck_delivery_outcome_delivered_nonneg"),
        sa.CheckConstraint("undelivered_quantity >= 0", name="ck_delivery_outcome_undelivered_nonneg"),
        sa.CheckConstraint(
            "delivered_quantity + undelivered_quantity = reserved_quantity",
            name="ck_delivery_outcome_quantities",
        ),
    )
    op.create_index("ix_delivery_outcomes_order", "delivery_allocation_outcomes", ["order_id"])
    op.create_index("ix_delivery_outcomes_depot_batch", "delivery_allocation_outcomes", ["depot_id", "batch_no"])

    op.create_table(
        "return_verifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("verification_number", sa.String(length=50), nullable=False),
        sa.Column("outcome_id", sa.Integer(), sa.ForeignKey("delivery_allocation_outcomes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("allocation_id", sa.Integer(), sa.ForeignKey("order_batch_allocations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("depot_id", sa.Integer(), sa.ForeignKey("depots.id"), nullable=False),
        sa.Column("batch_no", sa.String(length=100), nullable=False),
        sa.Column("expected_return_quantity", sa.Numeric(12, 2), nullable=False),
        sa.Column("received_quantity", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("verified_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("verification_number", name="uq_return_verification_number"),
        sa.CheckConstraint("expected_return_quantity >= 0", name="ck_return_expected_nonneg"),
        sa.CheckConstraint("received_quantity >= 0", name="ck_return_received_nonneg"),
        sa.CheckConstraint("received_quantity <= expected_return_quantity", name="ck_return_received_within_expected"),
    )
    op.create_index("ix_return_verifications_allocation", "return_verifications", ["allocation_id"])
    op.create_index("ix_return_verifications_status", "return_verifications", ["status"])
    op.create_index(
        "uq_return_verifications_open_allocation",
        "return_verifications",
        ["allocation_id"],
        unique=True,
        postgresql_where=sa.text("status = 'REQUESTED'"),
    )


def downgrade() -> None:
    op.drop_index("uq_return_verifications_open_allocation", table_name="return_verifications")
    op.drop_index("ix_return_verifications_status", table_name="return_verifications")
    op.drop_index("ix_return_verifications_allocation", table_name="return_verifications")
    op.drop_table("return_verifications")
    op.drop_index("ix_delivery_outcomes_depot_batch", table_name="delivery_allocation_outcomes")
    op.drop_index("ix_delivery_outcomes_order", table_name="delivery_allocation_outcomes")
    op.drop_table("delivery_allocation_outcomes")
