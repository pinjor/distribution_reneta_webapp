"""F.2 sample/gift draft document tables.

Revision ID: f2_sample_gift_draft
Revises: d4_baseline
Create Date: 2026-11-25

Additive only. Do not apply to live swift_distro_hub until separately approved.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f2_sample_gift_draft"
down_revision: Union[str, None] = "d4_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sample_gift_deliveries",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("delivery_number", sa.String(length=50), nullable=False),
        sa.Column("depot_id", sa.Integer(), nullable=False),
        sa.Column("document_kind", sa.String(length=20), nullable=False),
        sa.Column("gift_type", sa.String(length=100), nullable=True),
        sa.Column("occasion", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="Draft"),
        sa.Column("delivery_date", sa.Date(), nullable=False),
        sa.Column("recipient_name", sa.String(length=255), nullable=False),
        sa.Column("recipient_type", sa.String(length=50), nullable=False),
        sa.Column("recipient_address", sa.Text(), nullable=True),
        sa.Column("recipient_phone", sa.String(length=50), nullable=True),
        sa.Column("recipient_email", sa.String(length=255), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["depot_id"], ["depots.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["employees.id"]),
        sa.CheckConstraint(
            "document_kind IN ('sample', 'gift')",
            name="ck_sample_gift_document_kind",
        ),
    )
    op.create_index("ix_sample_gift_deliveries_id", "sample_gift_deliveries", ["id"])
    op.create_index(
        "ix_sample_gift_deliveries_delivery_number",
        "sample_gift_deliveries",
        ["delivery_number"],
        unique=True,
    )
    op.create_index("ix_sample_gift_deliveries_depot_id", "sample_gift_deliveries", ["depot_id"])
    op.create_index("ix_sample_gift_deliveries_status", "sample_gift_deliveries", ["status"])
    op.create_index(
        "ix_sample_gift_deliveries_depot_status",
        "sample_gift_deliveries",
        ["depot_id", "status"],
    )

    op.create_table(
        "sample_gift_delivery_items",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("delivery_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 2), nullable=False),
        sa.Column("gift_type", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["delivery_id"],
            ["sample_gift_deliveries.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.CheckConstraint("quantity > 0", name="ck_sample_gift_item_quantity_positive"),
    )
    op.create_index("ix_sample_gift_delivery_items_id", "sample_gift_delivery_items", ["id"])
    op.create_index(
        "ix_sample_gift_delivery_items_delivery_id",
        "sample_gift_delivery_items",
        ["delivery_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_sample_gift_delivery_items_delivery_id", table_name="sample_gift_delivery_items")
    op.drop_index("ix_sample_gift_delivery_items_id", table_name="sample_gift_delivery_items")
    op.drop_table("sample_gift_delivery_items")
    op.drop_index("ix_sample_gift_deliveries_depot_status", table_name="sample_gift_deliveries")
    op.drop_index("ix_sample_gift_deliveries_status", table_name="sample_gift_deliveries")
    op.drop_index("ix_sample_gift_deliveries_depot_id", table_name="sample_gift_deliveries")
    op.drop_index("ix_sample_gift_deliveries_delivery_number", table_name="sample_gift_deliveries")
    op.drop_index("ix_sample_gift_deliveries_id", table_name="sample_gift_deliveries")
    op.drop_table("sample_gift_deliveries")
