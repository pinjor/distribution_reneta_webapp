"""LogiCollect field API tables (development schema).

Revision ID: lc_field_api
Revises: none (separate alembic_logicollect.ini; commercial head stays f3_export_draft)

Do NOT apply to live swift_distro_hub. Disposable databases only.
Requires commercial tables from `alembic upgrade f3_export_draft` on the same disposable DB.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "lc_field_api"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = ("logicollect",)
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lc_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("refresh_token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("access_jti", sa.String(36), nullable=False),
        sa.Column("refresh_jti", sa.String(36), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("refresh_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "lc_employee_profiles",
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), primary_key=True),
        sa.Column("display_name", sa.String(200)),
        sa.Column("photo_id", sa.String(36)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "lc_media",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("content_type", sa.String(80), nullable=False),
        sa.Column("original_name", sa.String(255)),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "lc_memo_states",
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("payment_status", sa.String(32), nullable=False),
        sa.Column("paid_amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("delivered_amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("checked_in_at", sa.DateTime(timezone=True)),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        sa.Column("credit_due_at", sa.Date()),
        sa.Column("postpone_reason", sa.Text()),
        sa.Column("cancel_reason", sa.Text()),
        sa.Column("collection_postpone_reason", sa.Text()),
        sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "lc_memo_lines",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("order_item_id", sa.Integer(), sa.ForeignKey("order_items.id"), nullable=False),
        sa.Column("delivered_qty", sa.Numeric(15, 2), nullable=False),
        sa.Column("short_reason", sa.Text()),
        sa.UniqueConstraint("order_item_id", name="uq_lc_memo_line_item"),
    )
    op.create_table(
        "lc_route_visits",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("business_date", sa.Date(), nullable=False),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("stop_status", sa.String(32), nullable=False),
        sa.Column("checked_in_at", sa.DateTime(timezone=True)),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("employee_id", "business_date", "order_id", name="uq_lc_visit_day_order"),
    )
    op.create_table(
        "lc_wallets",
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), primary_key=True),
        sa.Column("cash_balance", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("credit_balance", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_collected", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_deposited", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "lc_movements",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("payment_mode", sa.String(16)),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id")),
        sa.Column("deposit_id", sa.String(36)),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "lc_deposits",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("method", sa.String(16), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("transaction_id", sa.String(120), nullable=False),
        sa.Column("media_id", sa.String(36)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("employee_id", "transaction_id", name="uq_lc_deposit_txn"),
    )
    op.create_table(
        "lc_return_lines",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("order_item_id", sa.Integer(), sa.ForeignKey("order_items.id"), nullable=False),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("remaining_qty", sa.Numeric(15, 2), nullable=False),
        sa.Column("adjusted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("return_memo_id", sa.Integer()),
        sa.UniqueConstraint("order_item_id", name="uq_lc_return_item"),
    )
    op.create_table(
        "lc_return_memos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("return_memo_no", sa.String(32), nullable=False, unique=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("original_invoice_no", sa.String(32), nullable=False),
        sa.Column("customer_name", sa.String(255), nullable=False),
        sa.Column("total_amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "lc_chemists",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id")),
        sa.Column("legacy_code", sa.String(50), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(80)),
        sa.Column("location", sa.String(255)),
        sa.Column("phone", sa.String(50)),
        sa.Column("email", sa.String(255)),
        sa.Column("owner_name", sa.String(255)),
        sa.Column("address", sa.Text()),
        sa.Column("division", sa.String(80), nullable=False),
        sa.Column("district", sa.String(80), nullable=False),
        sa.Column("thana", sa.String(80), nullable=False),
        sa.Column("photo_id", sa.String(36)),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "lc_performance_targets",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("period_from", sa.Date(), nullable=False),
        sa.Column("period_to", sa.Date(), nullable=False),
        sa.Column("target_deliveries", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("target_collections", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("target_amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
    )
    op.create_table(
        "lc_idempotency",
        sa.Column("key", sa.String(80), primary_key=True),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("operation", sa.String(80), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("response_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    for table in (
        "lc_idempotency",
        "lc_performance_targets",
        "lc_chemists",
        "lc_return_memos",
        "lc_return_lines",
        "lc_deposits",
        "lc_movements",
        "lc_wallets",
        "lc_route_visits",
        "lc_memo_lines",
        "lc_memo_states",
        "lc_media",
        "lc_employee_profiles",
        "lc_sessions",
    ):
        op.drop_table(table)
