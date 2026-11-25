"""F.3 export draft document tables.

Revision ID: f3_export_draft
Revises: f2_sample_gift_draft
Create Date: 2026-11-25

Additive only. Do not apply to live swift_distro_hub until separately approved.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f3_export_draft"
down_revision: Union[str, None] = "f2_sample_gift_draft"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "export_deliveries",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("delivery_number", sa.String(length=50), nullable=False),
        sa.Column("depot_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="Draft"),
        sa.Column("delivery_date", sa.Date(), nullable=False),
        sa.Column("destination_country", sa.String(length=100), nullable=False),
        sa.Column("port_of_loading", sa.String(length=150), nullable=False),
        sa.Column("port_of_discharge", sa.String(length=150), nullable=False),
        sa.Column("shipping_line", sa.String(length=150), nullable=True),
        sa.Column("container_number", sa.String(length=50), nullable=True),
        sa.Column("bl_number", sa.String(length=100), nullable=True),
        sa.Column("invoice_number", sa.String(length=100), nullable=True),
        sa.Column("lc_number", sa.String(length=100), nullable=True),
        sa.Column("incoterms", sa.String(length=20), nullable=True),
        sa.Column("payment_terms", sa.String(length=50), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["depot_id"], ["depots.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["employees.id"]),
    )
    op.create_index("ix_export_deliveries_id", "export_deliveries", ["id"])
    op.create_index(
        "ix_export_deliveries_delivery_number",
        "export_deliveries",
        ["delivery_number"],
        unique=True,
    )
    op.create_index("ix_export_deliveries_depot_id", "export_deliveries", ["depot_id"])
    op.create_index("ix_export_deliveries_status", "export_deliveries", ["status"])
    op.create_index(
        "ix_export_deliveries_depot_status",
        "export_deliveries",
        ["depot_id", "status"],
    )

    op.create_table(
        "export_delivery_items",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("delivery_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("batch_number", sa.String(length=100), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("quantity", sa.Numeric(12, 2), nullable=False),
        sa.Column("unit_price", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("hsn_code", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["delivery_id"],
            ["export_deliveries.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.CheckConstraint("quantity > 0", name="ck_export_item_quantity_positive"),
        sa.CheckConstraint("unit_price >= 0", name="ck_export_item_unit_price_non_negative"),
    )
    op.create_index("ix_export_delivery_items_id", "export_delivery_items", ["id"])
    op.create_index(
        "ix_export_delivery_items_delivery_id",
        "export_delivery_items",
        ["delivery_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_export_delivery_items_delivery_id", table_name="export_delivery_items")
    op.drop_index("ix_export_delivery_items_id", table_name="export_delivery_items")
    op.drop_table("export_delivery_items")
    op.drop_index("ix_export_deliveries_depot_status", table_name="export_deliveries")
    op.drop_index("ix_export_deliveries_status", table_name="export_deliveries")
    op.drop_index("ix_export_deliveries_depot_id", table_name="export_deliveries")
    op.drop_index("ix_export_deliveries_delivery_number", table_name="export_deliveries")
    op.drop_index("ix_export_deliveries_id", table_name="export_deliveries")
    op.drop_table("export_deliveries")
