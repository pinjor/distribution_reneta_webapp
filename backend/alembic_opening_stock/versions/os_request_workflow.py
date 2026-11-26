"""Opening stock request/review tables (development schema).

Revision ID: os_request_workflow
Revises: none (separate alembic_opening_stock.ini; commercial head stays f3_export_draft)

Do NOT apply to live swift_distro_hub. Disposable databases only.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "os_request_workflow"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = ("opening_stock",)
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "opening_stock_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("request_number", sa.String(50), nullable=False),
        sa.Column("depot_id", sa.Integer(), sa.ForeignKey("depots.id"), nullable=False),
        sa.Column("opening_date", sa.Date(), nullable=False),
        sa.Column("remarks", sa.Text()),
        sa.Column("status", sa.String(32), nullable=False, server_default="Draft"),
        sa.Column("posting_status", sa.String(32), nullable=False, server_default="not_posted"),
        sa.Column("posting_blocked_reason", sa.Text()),
        sa.Column("requested_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("employees.id")),
        sa.Column("reviewed_at", sa.DateTime()),
        sa.Column("review_reason", sa.Text()),
        sa.Column("submitted_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_opening_stock_requests_request_number", "opening_stock_requests", ["request_number"], unique=True)
    op.create_index("ix_opening_stock_requests_depot_id", "opening_stock_requests", ["depot_id"])
    op.create_index("ix_opening_stock_requests_status", "opening_stock_requests", ["status"])
    op.create_table(
        "opening_stock_request_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("request_id", sa.Integer(), sa.ForeignKey("opening_stock_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("batch_number", sa.String(100), nullable=False),
        sa.Column("manufacturing_date", sa.Date()),
        sa.Column("expiry_date", sa.Date(), nullable=False),
        sa.Column("quantity", sa.Numeric(15, 2), nullable=False),
        sa.Column("unit_of_measure", sa.String(50)),
        sa.Column("unit_cost", sa.Numeric(15, 4)),
        sa.Column("remarks", sa.Text()),
        sa.UniqueConstraint("request_id", "product_id", "batch_number", name="uq_os_item_product_batch"),
    )
    op.create_table(
        "opening_stock_approval_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("request_id", sa.Integer(), sa.ForeignKey("opening_stock_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("from_status", sa.String(32)),
        sa.Column("to_status", sa.String(32)),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "opening_stock_posting_references",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("request_id", sa.Integer(), sa.ForeignKey("opening_stock_requests.id"), nullable=False),
        sa.Column("posted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("simulation_only", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("request_id", name="uq_os_posting_request"),
    )


def downgrade() -> None:
    op.drop_table("opening_stock_posting_references")
    op.drop_table("opening_stock_approval_history")
    op.drop_table("opening_stock_request_items")
    op.drop_table("opening_stock_requests")
