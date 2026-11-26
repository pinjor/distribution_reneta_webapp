"""F.4D-DEV Gate A isolated fulfillment state machine. No live stock or HTTP routes."""
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

import pytest

from app.models import Order, ProductItemStock, ProductItemStockDetail, StockLedger
from app.models_platform import OrderBatchAllocation
from app.services.isolated_fulfillment_simulation import (
    FulfillmentActor,
    FulfillmentPolicy,
    InMemoryFulfillmentStore,
    assert_fulfillment_integrity,
)
from app.services.isolated_inventory_simulation import (
    FORBIDDEN_DATABASES,
    InMemoryInventoryStore,
    SimulationError,
    SimulationPolicy,
)

TODAY = date(2026, 11, 26)
INV = SimulationPolicy(as_of=TODAY, skip_expired=True, no_expiry="reject")
FUL = FulfillmentPolicy(as_of=TODAY)
WAREHOUSE = FulfillmentActor(actor_id=1, role="warehouse", depot_id=1)
ADMIN = FulfillmentActor(actor_id=2, role="admin", depot_id=1)
PSO = FulfillmentActor(actor_id=3, role="user", depot_id=1)
BILLING = FulfillmentActor(actor_id=4, role="billing", depot_id=1)
FOREIGN = FulfillmentActor(actor_id=5, role="warehouse", depot_id=99)


def _reserved_store(qty=Decimal("10")):
    inv = InMemoryInventoryStore()
    inv.add_lot(
        lot_id=1,
        depot_id=1,
        product_id=10,
        batch_no="EARLY",
        expiry_date=TODAY + timedelta(days=10),
        quantity=50,
        available=50,
    )
    reservation = inv.reserve(
        document_kind="sample_gift",
        document_id="SG-1",
        product_id=10,
        depot_id=1,
        qty=qty,
        idempotency_key="r1",
        policy=INV,
    )
    store = InMemoryFulfillmentStore(inv, FUL)
    return inv, store, reservation


def test_production_app_does_not_import_fulfillment_simulator():
    root = Path(__file__).resolve().parents[1]
    api = (root / "app/api_app.py").read_text()
    main = (root / "main.py").read_text()
    assert "isolated_fulfillment_simulation" not in api
    assert "isolated_fulfillment_simulation" not in main
    assert "isolated-fulfillment" not in main
    assert "create_api_app(isolated_workflow=False)" in main
    isolated_mount = api.split("if isolated_workflow:", 1)[1]
    production_prefix = api.split("if isolated_workflow:", 1)[0]
    assert "isolated-fulfillment" not in production_prefix
    assert "isolated-fulfillment" in isolated_mount


def test_refuses_live_database_name():
    assert "swift_distro_hub" in FORBIDDEN_DATABASES


def test_cannot_pick_without_reservation():
    inv = InMemoryInventoryStore()
    store = InMemoryFulfillmentStore(inv, FUL)
    with pytest.raises(SimulationError, match="Reservation not found"):
        store.start_pick("missing", WAREHOUSE, "p1")


def test_reserved_can_begin_picking_and_complete():
    inv, store, reservation = _reserved_store()
    before = inv.get_lot(1)
    pick = store.start_pick(reservation.reservation_id, WAREHOUSE, "p1")
    assert pick.status == "PICKING"
    done = store.confirm_pick(pick.fulfillment_id, WAREHOUSE, {1: Decimal("10")})
    assert done.status == "PICKED"
    after = inv.get_lot(1)
    assert after.available == before.available
    assert after.reserved == before.reserved
    assert_fulfillment_integrity(inv, done, context="pick")


def test_wrong_depot_denied():
    _inv, store, reservation = _reserved_store()
    with pytest.raises(SimulationError, match="Not found"):
        store.start_pick(reservation.reservation_id, FOREIGN, "p-foreign")


def test_pso_and_billing_cannot_pick():
    _inv, store, reservation = _reserved_store()
    with pytest.raises(SimulationError, match="cannot perform"):
        store.start_pick(reservation.reservation_id, PSO, "p-pso")
    with pytest.raises(SimulationError, match="cannot perform"):
        store.start_pick(reservation.reservation_id, BILLING, "p-bill")


def test_duplicate_start_pick_same_key_is_idempotent():
    _inv, store, reservation = _reserved_store()
    first = store.start_pick(reservation.reservation_id, WAREHOUSE, "same")
    second = store.start_pick(reservation.reservation_id, WAREHOUSE, "same")
    assert first.fulfillment_id == second.fulfillment_id


def test_duplicate_start_pick_different_key_denied():
    _inv, store, reservation = _reserved_store()
    store.start_pick(reservation.reservation_id, WAREHOUSE, "a")
    with pytest.raises(SimulationError, match="already started"):
        store.start_pick(reservation.reservation_id, WAREHOUSE, "b")


def test_insufficient_picked_quantity():
    _inv, store, reservation = _reserved_store()
    pick = store.start_pick(reservation.reservation_id, WAREHOUSE, "p-short")
    with pytest.raises(SimulationError) as exc:
        store.confirm_pick(pick.fulfillment_id, WAREHOUSE, {1: Decimal("4")})
    assert exc.value.code == "insufficient_picked"


def test_expired_batch_at_pick_time():
    inv = InMemoryInventoryStore()
    inv.add_lot(
        lot_id=7,
        depot_id=1,
        product_id=11,
        batch_no="WAS-OK",
        expiry_date=TODAY + timedelta(days=1),
        quantity=8,
        available=8,
    )
    reservation = inv.reserve(
        document_kind="export",
        document_id="EX-EXP",
        product_id=11,
        depot_id=1,
        qty=Decimal("5"),
        idempotency_key="ex",
        policy=INV,
    )
    expired_policy = FulfillmentPolicy(as_of=TODAY + timedelta(days=3), reject_expired_at_pick=True)
    store = InMemoryFulfillmentStore(inv, expired_policy)
    with pytest.raises(SimulationError) as exc:
        store.start_pick(reservation.reservation_id, WAREHOUSE, "p-exp")
    assert exc.value.code == "expired"


def test_release_while_picking_denied_by_default():
    _inv, store, reservation = _reserved_store()
    pick = store.start_pick(reservation.reservation_id, ADMIN, "p-rel")
    with pytest.raises(SimulationError) as exc:
        store.cancel_pick_and_release(pick.fulfillment_id, ADMIN)
    assert exc.value.code == "conflict"


def test_issue_before_picking_denied():
    _inv, store, reservation = _reserved_store()
    pick = store.start_pick(reservation.reservation_id, WAREHOUSE, "p-early-issue")
    with pytest.raises(SimulationError, match="Issuance requires completed picking"):
        store.issue(pick.fulfillment_id, WAREHOUSE, "i1")


def test_issue_once_only_and_stock_identity():
    inv, store, reservation = _reserved_store(Decimal("30"))
    pick = store.start_pick(reservation.reservation_id, WAREHOUSE, "p-iss")
    store.confirm_pick(pick.fulfillment_id, WAREHOUSE, {1: Decimal("30")})
    issued = store.issue(pick.fulfillment_id, WAREHOUSE, "issue-1")
    assert issued.status == "ISSUED"
    lot = inv.get_lot(1)
    assert lot.quantity == Decimal("20")
    assert lot.available == Decimal("20")
    assert lot.reserved == Decimal("0")
    assert_fulfillment_integrity(inv, issued, context="issue")
    with pytest.raises(SimulationError, match="already issued"):
        store.issue(pick.fulfillment_id, WAREHOUSE, "issue-2")
    again = store.issue(pick.fulfillment_id, WAREHOUSE, "issue-1")
    assert again.fulfillment_id == issued.fulfillment_id


def test_dispatch_before_issue_denied():
    _inv, store, reservation = _reserved_store()
    pick = store.start_pick(reservation.reservation_id, WAREHOUSE, "p-d")
    store.confirm_pick(pick.fulfillment_id, WAREHOUSE, {1: Decimal("10")})
    with pytest.raises(SimulationError, match="Dispatch requires issuance"):
        store.dispatch(pick.fulfillment_id, WAREHOUSE, "d1")


def test_dispatch_and_delivery_once_only_no_second_stock_move():
    inv, store, reservation = _reserved_store()
    pick = store.start_pick(reservation.reservation_id, WAREHOUSE, "p-full")
    store.confirm_pick(pick.fulfillment_id, WAREHOUSE, {1: Decimal("10")})
    store.issue(pick.fulfillment_id, WAREHOUSE, "i-full")
    before = inv.get_lot(1)
    dispatched = store.dispatch(pick.fulfillment_id, WAREHOUSE, "d-full")
    assert dispatched.status == "DISPATCHED"
    assert dispatched.dispatch_id
    with pytest.raises(SimulationError, match="Already dispatched"):
        store.dispatch(pick.fulfillment_id, WAREHOUSE, "d-other")
    delivered = store.confirm_delivery(pick.fulfillment_id, WAREHOUSE, "del-1")
    assert delivered.status == "DELIVERED"
    with pytest.raises(SimulationError, match="already confirmed"):
        store.confirm_delivery(pick.fulfillment_id, WAREHOUSE, "del-2")
    after = inv.get_lot(1)
    assert after.quantity == before.quantity
    assert after.available == before.available
    assert after.reserved == before.reserved
    assert_fulfillment_integrity(inv, delivered, context="delivery")


def test_invalid_terminal_transition():
    _inv, store, reservation = _reserved_store()
    pick = store.start_pick(reservation.reservation_id, WAREHOUSE, "p-term")
    store.confirm_pick(pick.fulfillment_id, WAREHOUSE, {1: Decimal("10")})
    store.issue(pick.fulfillment_id, WAREHOUSE, "i-term")
    store.dispatch(pick.fulfillment_id, WAREHOUSE, "d-term")
    store.confirm_delivery(pick.fulfillment_id, WAREHOUSE, "c-term")
    with pytest.raises(SimulationError):
        store.confirm_pick(pick.fulfillment_id, WAREHOUSE, {1: Decimal("10")})


def test_failed_delivery_does_not_reverse_issue():
    inv, store, reservation = _reserved_store()
    pick = store.start_pick(reservation.reservation_id, WAREHOUSE, "p-fail")
    store.confirm_pick(pick.fulfillment_id, WAREHOUSE, {1: Decimal("10")})
    store.issue(pick.fulfillment_id, WAREHOUSE, "i-fail")
    store.dispatch(pick.fulfillment_id, WAREHOUSE, "d-fail")
    before = inv.get_lot(1)
    failed = store.confirm_delivery(pick.fulfillment_id, WAREHOUSE, "fail-1", failed=True)
    assert failed.status == "FAILED_DELIVERY"
    after = inv.get_lot(1)
    assert after.quantity == before.quantity
    assert after.reserved == before.reserved


def test_audit_entries_recorded():
    _inv, store, reservation = _reserved_store()
    pick = store.start_pick(reservation.reservation_id, WAREHOUSE, "p-aud")
    store.confirm_pick(pick.fulfillment_id, WAREHOUSE, {1: Decimal("10")})
    store.issue(pick.fulfillment_id, WAREHOUSE, "i-aud")
    row = store.get(pick.fulfillment_id)
    actions = [a["action"] for a in row.audit]
    assert actions == ["START_PICK", "CONFIRM_PICK", "ISSUE"]


def test_no_commercial_inventory_tables_touched(db_session):
    before = {
        "ledger": db_session.query(StockLedger).count(),
        "pisd": db_session.query(ProductItemStockDetail).count(),
        "pis": db_session.query(ProductItemStock).count(),
        "alloc": db_session.query(OrderBatchAllocation).count(),
        "orders": db_session.query(Order).count(),
    }
    inv, store, reservation = _reserved_store()
    pick = store.start_pick(reservation.reservation_id, WAREHOUSE, "p-comm")
    store.confirm_pick(pick.fulfillment_id, WAREHOUSE, {1: Decimal("10")})
    store.issue(pick.fulfillment_id, WAREHOUSE, "i-comm")
    store.dispatch(pick.fulfillment_id, WAREHOUSE, "d-comm")
    store.confirm_delivery(pick.fulfillment_id, WAREHOUSE, "c-comm")
    after = {
        "ledger": db_session.query(StockLedger).count(),
        "pisd": db_session.query(ProductItemStockDetail).count(),
        "pis": db_session.query(ProductItemStock).count(),
        "alloc": db_session.query(OrderBatchAllocation).count(),
        "orders": db_session.query(Order).count(),
    }
    assert after == before
