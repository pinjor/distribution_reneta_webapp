"""F.4C-DEV Gate A isolated FEFO / reservation simulator. No live stock."""
from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.services.isolated_inventory_simulation import (
    FORBIDDEN_DATABASES,
    InMemoryInventoryStore,
    PostgresInventoryStore,
    SimulationError,
    SimulationPolicy,
    assert_disposable_bind,
    eligible_lot,
    plan_fefo,
    sqlite_session_factory,
)

TODAY = date(2026, 11, 26)
POLICY = SimulationPolicy(as_of=TODAY, no_expiry="reject", skip_expired=True)


def _store_with_standard_lots():
    store = InMemoryInventoryStore()
    store.add_lot(
        lot_id=1,
        depot_id=1,
        product_id=10,
        batch_no="EARLY",
        expiry_date=TODAY + timedelta(days=10),
        quantity=50,
        available=50,
    )
    store.add_lot(
        lot_id=2,
        depot_id=1,
        product_id=10,
        batch_no="LATER",
        expiry_date=TODAY + timedelta(days=40),
        quantity=50,
        available=50,
    )
    store.add_lot(
        lot_id=3,
        depot_id=1,
        product_id=10,
        batch_no="EXPIRED",
        expiry_date=TODAY - timedelta(days=5),
        quantity=80,
        available=80,
    )
    store.add_lot(
        lot_id=4,
        depot_id=1,
        product_id=10,
        batch_no="NOEXP",
        expiry_date=None,
        quantity=30,
        available=30,
    )
    store.add_lot(
        lot_id=5,
        depot_id=1,
        product_id=10,
        batch_no="HELD",
        expiry_date=TODAY + timedelta(days=8),
        quantity=20,
        available=0,
        reserved=20,
    )
    store.add_lot(
        lot_id=6,
        depot_id=2,
        product_id=10,
        batch_no="OTHERDEPOT",
        expiry_date=TODAY + timedelta(days=3),
        quantity=100,
        available=100,
    )
    store.add_lot(
        lot_id=7,
        depot_id=1,
        product_id=10,
        batch_no="QUAR",
        expiry_date=TODAY + timedelta(days=2),
        quantity=15,
        available=15,
        status="Quarantine",
    )
    store.add_lot(
        lot_id=8,
        depot_id=1,
        product_id=99,
        batch_no="INACTIVE",
        expiry_date=TODAY + timedelta(days=2),
        quantity=40,
        available=40,
        product_active=False,
    )
    store.add_lot(
        lot_id=9,
        depot_id=1,
        product_id=10,
        batch_no="TWIN-A",
        expiry_date=TODAY + timedelta(days=15),
        quantity=12,
        available=12,
    )
    store.add_lot(
        lot_id=10,
        depot_id=1,
        product_id=10,
        batch_no="TWIN-B",
        expiry_date=TODAY + timedelta(days=15),
        quantity=12,
        available=12,
    )
    return store


def test_production_app_factory_does_not_import_simulator():
    from pathlib import Path

    api_app = Path(__file__).resolve().parents[1] / "app" / "api_app.py"
    main = Path(__file__).resolve().parents[1] / "main.py"
    isolated = Path(__file__).resolve().parents[1] / "isolated_workflow_app.py"
    for path in (api_app, main, isolated):
        text = path.read_text()
        assert "isolated_inventory_simulation" not in text


def test_refuses_live_database_name():
    assert "swift_distro_hub" in FORBIDDEN_DATABASES

    class _Url:
        database = "swift_distro_hub"

    class _Bind:
        url = _Url()

    with pytest.raises(RuntimeError, match="swift_distro_hub"):
        assert_disposable_bind(_Bind())


def test_expired_batch_is_not_allocated():
    store = _store_with_standard_lots()
    reserved = store.reserve(
        document_kind="sample_gift",
        document_id="SG-1",
        product_id=10,
        depot_id=1,
        qty=Decimal("10"),
        idempotency_key="k1",
        policy=POLICY,
    )
    assert reserved.slices[0].batch_no == "EARLY"
    assert all(s.batch_no != "EXPIRED" for s in reserved.slices)


def test_valid_earliest_expiring_batch_wins():
    store = _store_with_standard_lots()
    reserved = store.reserve(
        document_kind="export",
        document_id="EX-1",
        product_id=10,
        depot_id=1,
        qty=Decimal("5"),
        idempotency_key="k2",
        policy=POLICY,
    )
    assert reserved.slices[0].batch_no == "EARLY"
    assert store.get_lot(1).available == Decimal("45")
    assert store.get_lot(1).reserved == Decimal("5")
    assert store.get_lot(1).quantity == Decimal("50")


def test_same_expiry_batches_are_ordered_by_batch_then_id():
    store = _store_with_standard_lots()
    store.reserve(
        document_kind="sample_gift",
        document_id="SG-2",
        product_id=10,
        depot_id=1,
        qty=Decimal("50"),
        idempotency_key="drain-early",
        policy=POLICY,
    )
    reserved = store.reserve(
        document_kind="sample_gift",
        document_id="SG-3",
        product_id=10,
        depot_id=1,
        qty=Decimal("12"),
        idempotency_key="twins",
        policy=POLICY,
    )
    assert reserved.slices[0].batch_no == "TWIN-A"


def test_missing_expiry_rejected_by_default_policy():
    lot = _store_with_standard_lots().get_lot(4)
    assert eligible_lot(lot, POLICY) == "no_expiry"


def test_insufficient_available_quantity():
    store = _store_with_standard_lots()
    with pytest.raises(SimulationError) as exc:
        store.reserve(
            document_kind="sample_gift",
            document_id="SG-4",
            product_id=10,
            depot_id=1,
            qty=Decimal("1000"),
            idempotency_key="too-much",
            policy=POLICY,
        )
    assert exc.value.code == "insufficient"


def test_already_reserved_quantity_is_excluded():
    store = _store_with_standard_lots()
    with pytest.raises(SimulationError):
        plan_fefo(
            [store.get_lot(5)],
            product_id=10,
            depot_id=1,
            qty=Decimal("1"),
            policy=POLICY,
        )


def test_other_depot_stock_is_not_used():
    store = _store_with_standard_lots()
    reserved = store.reserve(
        document_kind="sample_gift",
        document_id="SG-5",
        product_id=10,
        depot_id=1,
        qty=Decimal("50"),
        idempotency_key="depot",
        policy=POLICY,
    )
    assert all(s.depot_id == 1 for s in reserved.slices)
    assert store.get_lot(6).available == Decimal("100")


def test_multiple_batches_spillover():
    store = _store_with_standard_lots()
    reserved = store.reserve(
        document_kind="export",
        document_id="EX-2",
        product_id=10,
        depot_id=1,
        qty=Decimal("60"),
        idempotency_key="spill",
        policy=POLICY,
    )
    batches = [s.batch_no for s in reserved.slices]
    assert batches[0] == "EARLY"
    assert "LATER" in batches or "TWIN-A" in batches
    assert sum((s.qty for s in reserved.slices), Decimal("0")) == Decimal("60")


def test_inactive_product_cannot_be_reserved():
    store = _store_with_standard_lots()
    with pytest.raises(SimulationError) as exc:
        store.reserve(
            document_kind="sample_gift",
            document_id="SG-6",
            product_id=99,
            depot_id=1,
            qty=Decimal("1"),
            idempotency_key="dead",
            policy=POLICY,
        )
    assert exc.value.code == "insufficient"


def test_quarantine_status_skipped():
    store = _store_with_standard_lots()
    reserved = store.reserve(
        document_kind="sample_gift",
        document_id="SG-7",
        product_id=10,
        depot_id=1,
        qty=Decimal("5"),
        idempotency_key="no-quar",
        policy=POLICY,
    )
    assert all(s.batch_no != "QUAR" for s in reserved.slices)


def test_idempotent_duplicate_reservation():
    store = _store_with_standard_lots()
    first = store.reserve(
        document_kind="sample_gift",
        document_id="SG-8",
        product_id=10,
        depot_id=1,
        qty=Decimal("7"),
        idempotency_key="same",
        policy=POLICY,
    )
    second = store.reserve(
        document_kind="sample_gift",
        document_id="SG-8",
        product_id=10,
        depot_id=1,
        qty=Decimal("7"),
        idempotency_key="same",
        policy=POLICY,
    )
    assert first.reservation_id == second.reservation_id
    assert store.get_lot(1).reserved == Decimal("7")


def test_release_restores_available():
    store = _store_with_standard_lots()
    reserved = store.reserve(
        document_kind="sample_gift",
        document_id="SG-9",
        product_id=10,
        depot_id=1,
        qty=Decimal("8"),
        idempotency_key="rel",
        policy=POLICY,
    )
    store.release(reserved.reservation_id)
    assert store.get_lot(1).available == Decimal("50")
    assert store.get_lot(1).reserved == Decimal("0")


def test_issue_deducts_on_hand_from_reserved():
    store = _store_with_standard_lots()
    reserved = store.reserve(
        document_kind="export",
        document_id="EX-3",
        product_id=10,
        depot_id=1,
        qty=Decimal("8"),
        idempotency_key="iss",
        policy=POLICY,
    )
    store.issue(reserved.reservation_id)
    lot = store.get_lot(1)
    assert lot.quantity == Decimal("42")
    assert lot.reserved == Decimal("0")
    assert lot.available == Decimal("42")


def test_cannot_transfer_reserved_units():
    store = _store_with_standard_lots()
    with pytest.raises(SimulationError) as exc:
        store.transfer_available(5, Decimal("1"), 1)
    assert exc.value.code == "insufficient"


def test_release_then_issue_is_rejected():
    store = _store_with_standard_lots()
    reserved = store.reserve(
        document_kind="sample_gift",
        document_id="SG-10",
        product_id=10,
        depot_id=1,
        qty=Decimal("3"),
        idempotency_key="ri",
        policy=POLICY,
    )
    store.release(reserved.reservation_id)
    with pytest.raises(SimulationError) as exc:
        store.issue(reserved.reservation_id)
    assert exc.value.code == "invalid_status"


def test_sqlite_store_rollback_leaves_stock():
    Factory, engine = sqlite_session_factory()
    db = Factory()
    try:
        store = PostgresInventoryStore(db)
        store.add_lot(
            lot_id=1,
            depot_id=1,
            product_id=1,
            batch_no="S",
            expiry_date=TODAY + timedelta(days=20),
            quantity=10,
            available=10,
        )
        db.commit()
    finally:
        db.close()

    db = Factory()
    store = PostgresInventoryStore(db)
    try:
        store.reserve(
            document_kind="sample_gift",
            document_id="SG-SQL",
            product_id=1,
            depot_id=1,
            qty=Decimal("4"),
            idempotency_key="sql-1",
            policy=POLICY,
        )
        raise RuntimeError("force rollback")
    except RuntimeError:
        db.rollback()
    finally:
        db.close()

    db = Factory()
    try:
        store = PostgresInventoryStore(db)
        from app.services.isolated_inventory_simulation import IsoLotRow

        row = db.get(IsoLotRow, 1)
        assert Decimal(str(row.available)) == Decimal("10")
        assert Decimal(str(row.reserved)) == Decimal("0")
    finally:
        db.close()
        engine.dispose()


def test_concurrent_in_memory_reserves_do_not_oversell():
    from concurrent.futures import ThreadPoolExecutor

    store = InMemoryInventoryStore()
    store.add_lot(
        lot_id=1,
        depot_id=1,
        product_id=1,
        batch_no="ONE",
        expiry_date=TODAY + timedelta(days=30),
        quantity=90,
        available=90,
    )

    def attempt(i):
        try:
            return store.reserve(
                document_kind="sample_gift",
                document_id=f"C-{i}",
                product_id=1,
                depot_id=1,
                qty=Decimal("50"),
                idempotency_key=f"c-{i}",
                policy=POLICY,
            )
        except SimulationError as exc:
            return exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, (1, 2)))
    ok = [r for r in results if not isinstance(r, str)]
    fail = [r for r in results if r == "insufficient"]
    assert len(ok) == 1
    assert len(fail) == 1
    assert store.get_lot(1).available == Decimal("40")
    assert store.get_lot(1).reserved == Decimal("50")


def test_no_expiry_last_policy_only_after_dated_stock():
    store = _store_with_standard_lots()
    policy = SimulationPolicy(as_of=TODAY, no_expiry="last", skip_expired=True)
    reserved = store.reserve(
        document_kind="sample_gift",
        document_id="SG-11",
        product_id=10,
        depot_id=1,
        qty=Decimal("125"),
        idempotency_key="last-undated",
        policy=policy,
    )
    assert any(s.batch_no == "NOEXP" for s in reserved.slices)
    assert reserved.slices[-1].batch_no == "NOEXP"
