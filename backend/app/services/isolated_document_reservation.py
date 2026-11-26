"""F.4C-DEV Gate B isolated reservation adapter.

Calls the Gate A simulator. Mounted only through isolated FastAPI routes.
Does not write ProductItemStock, StockLedger, invoices, or commercial allocations.
Proposed W1–W15 rules are TEST ASSUMPTIONS ONLY.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.depot_scope import hide_foreign_depot
from app.models import Employee, ExportDelivery, SampleGiftDelivery
from app.services.draft_document_lock import load_document_for_update
from app.services.draft_product_eligibility import (
    category_for_sample_gift,
    require_eligible_products,
)
from app.services.isolated_inventory_simulation import (
    D,
    AllocationSlice,
    IsolatedLot,
    IsoLotRow,
    IsoReservationAuditRow,
    IsoReservationLineRow,
    IsoReservationRow,
    IsoReservationSliceRow,
    SimulationError,
    SimulationPolicy,
    _reserve_math,
    _row_to_lot,
    assert_disposable_bind,
    create_isolated_schema,
    plan_fefo,
)

DocumentKind = Literal["sample_gift", "export"]
MODEL = {"sample_gift": SampleGiftDelivery, "export": ExportDelivery}
APPROVED = "Approved"
RERESERVE_AFTER_RELEASE = False
DEFAULT_POLICY = SimulationPolicy(skip_expired=True, no_expiry="reject")


def ensure_isolated_inventory_schema(bind) -> None:
    assert_disposable_bind(bind)
    create_isolated_schema(bind)


def _http(exc: SimulationError) -> HTTPException:
    code = status.HTTP_422_UNPROCESSABLE_ENTITY if exc.code == "invalid_qty" else status.HTTP_409_CONFLICT
    return HTTPException(status_code=code, detail=exc.message)


def assert_synthetic_inventory_integrity(session: Session, *, context: str = "") -> None:
    """Fail closed with lot/reservation ids. Unissued lots must keep quantity = available + reserved."""
    prefix = f"{context}: " if context else ""
    lots = session.query(IsoLotRow).order_by(IsoLotRow.id).all()
    reserved_by_lot = {
        lot_id: D(total)
        for lot_id, total in (
            session.query(IsoReservationSliceRow.lot_id, func.coalesce(func.sum(IsoReservationSliceRow.qty), 0))
            .join(IsoReservationRow, IsoReservationRow.id == IsoReservationSliceRow.reservation_id)
            .filter(IsoReservationRow.status == "RESERVED")
            .group_by(IsoReservationSliceRow.lot_id)
            .all()
        )
    }
    for lot in lots:
        quantity, available, reserved = D(lot.quantity), D(lot.available), D(lot.reserved)
        if min(quantity, available, reserved) < 0:
            raise AssertionError(
                f"{prefix}lot {lot.id} batch {lot.batch_no!r} has a negative quantity "
                f"(qty={quantity} available={available} reserved={reserved})"
            )
        if quantity != available + reserved:
            raise AssertionError(
                f"{prefix}lot {lot.id} batch {lot.batch_no!r} broke quantity = available + reserved "
                f"({quantity} != {available} + {reserved})"
            )
        slice_total = reserved_by_lot.get(lot.id, Decimal("0"))
        if reserved != slice_total:
            raise AssertionError(
                f"{prefix}lot {lot.id} batch {lot.batch_no!r} reserved {reserved} "
                f"!= active slice total {slice_total}"
            )

    headers = session.query(IsoReservationRow).order_by(IsoReservationRow.id).all()
    for header in headers:
        lines = session.query(IsoReservationLineRow).filter_by(reservation_id=header.id).all()
        slices = session.query(IsoReservationSliceRow).filter_by(reservation_id=header.id).all()
        line_req = sum((D(row.requested_qty) for row in lines), Decimal("0"))
        line_res = sum((D(row.reserved_qty) for row in lines), Decimal("0"))
        slice_qty = sum((D(row.qty) for row in slices), Decimal("0"))
        if header.status == "RESERVED" and lines and line_req != line_res:
            raise AssertionError(
                f"{prefix}reservation {header.id} requested {line_req} != reserved {line_res}"
            )
        if header.status == "RESERVED" and lines and line_res != slice_qty:
            raise AssertionError(
                f"{prefix}reservation {header.id} line reserved {line_res} != slice total {slice_qty}"
            )
        if header.status == "RESERVED" and not slices:
            raise AssertionError(f"{prefix}reservation {header.id} is RESERVED without batch slices")


def _serialize(session: Session, reservation_id: str) -> dict:
    header = session.get(IsoReservationRow, reservation_id)
    if header is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    lines = (
        session.query(IsoReservationLineRow)
        .filter_by(reservation_id=reservation_id)
        .order_by(IsoReservationLineRow.id)
        .all()
    )
    slices = (
        session.query(IsoReservationSliceRow)
        .filter_by(reservation_id=reservation_id)
        .order_by(IsoReservationSliceRow.id)
        .all()
    )
    return {
        "reservation_id": header.id,
        "document_kind": header.document_kind,
        "document_id": int(header.document_id),
        "depot_id": header.depot_id,
        "status": header.status,
        "idempotency_key": header.idempotency_key,
        "created_by": header.created_by,
        "created_at": header.created_at,
        "released_by": header.released_by,
        "released_at": header.released_at,
        "remarks": header.remarks,
        "lines": [
            {
                "document_item_id": row.document_item_id,
                "product_id": row.product_id,
                "requested_quantity": D(row.requested_qty),
                "reserved_quantity": D(row.reserved_qty),
            }
            for row in lines
        ],
        "slices": [
            {
                "lot_id": row.lot_id,
                "batch_no": row.batch_no,
                "expiry_date": row.expiry_date,
                "allocated_quantity": D(row.qty),
                "depot_id": row.depot_id,
                "product_id": row.product_id,
                "document_item_id": row.document_item_id,
            }
            for row in slices
        ],
    }


def _lock_document_reservations(session: Session, document_kind: str, document_id: int):
    return (
        session.query(IsoReservationRow)
        .filter_by(document_kind=document_kind, document_id=str(document_id))
        .order_by(IsoReservationRow.id)
        .with_for_update()
        .all()
    )


def _lock_lots(session: Session, lot_ids: list[int]) -> dict[int, IsoLotRow]:
    ids = sorted(set(lot_ids))
    if not ids:
        return {}
    rows = (
        session.query(IsoLotRow)
        .filter(IsoLotRow.id.in_(ids))
        .order_by(IsoLotRow.id)
        .with_for_update()
        .all()
    )
    return {row.id: row for row in rows}


def _lots_for_products(session: Session, depot_id: int, product_ids: list[int]) -> list[IsolatedLot]:
    rows = (
        session.query(IsoLotRow)
        .filter(IsoLotRow.depot_id == depot_id, IsoLotRow.product_id.in_(product_ids))
        .order_by(IsoLotRow.id)
        .all()
    )
    return [_row_to_lot(row) for row in rows]


def _assign_slices_to_lines(
    items,
    planned: dict[int, list[AllocationSlice]],
) -> tuple[list[tuple], list[tuple]]:
    remaining: dict[int, list[list]] = {
        product_id: [[slice_, D(slice_.qty)] for slice_ in slices]
        for product_id, slices in planned.items()
    }
    line_payload = []
    slice_payload = []
    for item in items:
        need = D(item.quantity)
        reserved = Decimal("0")
        pool = remaining.get(item.product_id, [])
        for entry in pool:
            slice_, left = entry
            if need <= 0 or left <= 0:
                continue
            take = min(need, left)
            slice_payload.append((item, slice_, take))
            entry[1] = left - take
            need -= take
            reserved += take
        if need > 0:
            raise SimulationError("insufficient", "FEFO could not cover every document line")
        line_payload.append((item, D(item.quantity), reserved))
    return line_payload, slice_payload


def _plan_all(lots: list[IsolatedLot], demand: dict[int, Decimal], depot_id: int, policy: SimulationPolicy):
    planned: dict[int, list[AllocationSlice]] = {}
    for product_id, qty in demand.items():
        planned[product_id] = plan_fefo(
            lots,
            product_id=product_id,
            depot_id=depot_id,
            qty=qty,
            policy=policy,
        )
    return planned


def reserve_for_document(
    session: Session,
    document_kind: DocumentKind,
    document_id: int,
    actor: Employee,
    idempotency_key: str,
    remarks: Optional[str] = None,
    policy: Optional[SimulationPolicy] = None,
) -> dict:
    bind = session.get_bind()
    ensure_isolated_inventory_schema(bind)
    key = (idempotency_key or "").strip()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="idempotency_key is required",
        )
    policy = policy or DEFAULT_POLICY
    model = MODEL[document_kind]
    row = load_document_for_update(session, model, document_id)
    hide_foreign_depot(actor, row.depot_id)
    if (row.status or "") != APPROVED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot reserve a {row.status} document",
        )
    items = list(row.items or [])
    if not items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Document has no items",
        )
    for item in items:
        if D(item.quantity) <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Item quantity must be positive",
            )
    category = "export" if document_kind == "export" else category_for_sample_gift(row.document_kind)
    require_eligible_products(session, [item.product_id for item in items], category)

    headers = _lock_document_reservations(session, document_kind, document_id)
    same_key = next((h for h in headers if h.idempotency_key == key), None)
    active = [h for h in headers if h.status == "RESERVED"]
    if same_key and same_key.status == "RESERVED":
        return _serialize(session, same_key.id)
    if active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document already has an active reservation",
        )
    if same_key and same_key.status == "ISSUED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Issued reservation cannot be replaced",
        )
    if any(h.status == "RELEASED" for h in headers) and not RERESERVE_AFTER_RELEASE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Re-reservation after release is not enabled until warehouse policy is signed",
        )

    demand: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    for item in items:
        demand[int(item.product_id)] += D(item.quantity)

    lots = _lots_for_products(session, row.depot_id, list(demand))
    try:
        planned = _plan_all(lots, demand, row.depot_id, policy)
    except SimulationError as exc:
        raise _http(exc) from exc

    lot_ids = [slice_.lot_id for slices in planned.values() for slice_ in slices]
    locked = _lock_lots(session, lot_ids)
    locked_lots = [_row_to_lot(locked[lot_id]) for lot_id in sorted(locked)]
    try:
        planned = _plan_all(locked_lots, demand, row.depot_id, policy)
        line_payload, slice_payload = _assign_slices_to_lines(items, planned)
        for slices in planned.values():
            for slice_ in slices:
                lot_row = locked[slice_.lot_id]
                quantity, available, reserved = _reserve_math(
                    lot_row.quantity, lot_row.available, lot_row.reserved, slice_.qty
                )
                lot_row.quantity, lot_row.available, lot_row.reserved = quantity, available, reserved
    except SimulationError as exc:
        raise _http(exc) from exc

    reservation_id = str(uuid4())
    session.add(
        IsoReservationRow(
            id=reservation_id,
            document_kind=document_kind,
            document_id=str(document_id),
            idempotency_key=key,
            status="RESERVED",
            depot_id=row.depot_id,
            created_by=actor.id,
            remarks=remarks,
            created_at=datetime.utcnow(),
        )
    )
    for item, requested, reserved_qty in line_payload:
        session.add(
            IsoReservationLineRow(
                reservation_id=reservation_id,
                document_item_id=item.id,
                product_id=item.product_id,
                requested_qty=requested,
                reserved_qty=reserved_qty,
            )
        )
    for item, slice_, take in slice_payload:
        session.add(
            IsoReservationSliceRow(
                reservation_id=reservation_id,
                lot_id=slice_.lot_id,
                qty=take,
                batch_no=slice_.batch_no,
                expiry_date=slice_.expiry_date,
                depot_id=slice_.depot_id,
                product_id=item.product_id,
                document_item_id=item.id,
            )
        )
    session.add(
        IsoReservationAuditRow(
            reservation_id=reservation_id,
            action="RESERVE",
            actor_id=actor.id,
            from_status=None,
            to_status="RESERVED",
            created_at=datetime.utcnow(),
        )
    )
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        recovered = (
            session.query(IsoReservationRow)
            .filter_by(document_kind=document_kind, document_id=str(document_id), idempotency_key=key)
            .one_or_none()
        )
        if recovered is not None:
            return _serialize(session, recovered.id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reservation could not be saved",
        )
    assert_synthetic_inventory_integrity(session, context=f"reserve {reservation_id}")
    return _serialize(session, reservation_id)


def list_reservations_for_document(
    session: Session,
    document_kind: DocumentKind,
    document_id: int,
    actor: Employee,
) -> list[dict]:
    ensure_isolated_inventory_schema(session.get_bind())
    model = MODEL[document_kind]
    row = session.query(model).filter(model.id == document_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    hide_foreign_depot(actor, row.depot_id)
    headers = (
        session.query(IsoReservationRow)
        .filter_by(document_kind=document_kind, document_id=str(document_id))
        .order_by(IsoReservationRow.created_at, IsoReservationRow.id)
        .all()
    )
    return [_serialize(session, header.id) for header in headers]


def release_reservation(
    session: Session,
    reservation_id: str,
    actor: Employee,
) -> dict:
    ensure_isolated_inventory_schema(session.get_bind())
    peek = session.query(IsoReservationRow).filter_by(id=reservation_id).first()
    if peek is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    document_kind, document_id = peek.document_kind, peek.document_id
    session.expire(peek)
    if document_kind in MODEL:
        document = load_document_for_update(session, MODEL[document_kind], int(document_id))
        hide_foreign_depot(actor, document.depot_id)
    from app.services.isolated_fulfillment_simulation import IsoFulfillmentRow

    fulfillment = (
        session.query(IsoFulfillmentRow)
        .filter_by(reservation_id=reservation_id)
        .order_by(IsoFulfillmentRow.id)
        .with_for_update()
        .first()
    )
    if fulfillment is not None and fulfillment.status not in {"CANCELLED"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reservation cannot be released during fulfillment",
        )
    header = (
        session.query(IsoReservationRow)
        .populate_existing()
        .filter_by(id=reservation_id)
        .with_for_update()
        .first()
    )
    if header is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    hide_foreign_depot(actor, header.depot_id)
    if header.status == "RELEASED":
        return _serialize(session, reservation_id)
    if header.status == "ISSUED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Issued reservation cannot be released",
        )
    if header.status != "RESERVED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot release a {header.status} reservation",
        )
    slices = (
        session.query(IsoReservationSliceRow)
        .filter_by(reservation_id=reservation_id)
        .order_by(IsoReservationSliceRow.lot_id, IsoReservationSliceRow.id)
        .all()
    )
    locked = _lock_lots(session, [row.lot_id for row in slices])
    for slice_row in slices:
        lot_row = locked[slice_row.lot_id]
        qty = D(slice_row.qty)
        if D(lot_row.reserved) < qty:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"lot {lot_row.id} reserved quantity changed before release",
            )
        lot_row.available = D(lot_row.available) + qty
        lot_row.reserved = D(lot_row.reserved) - qty
        if D(lot_row.reserved) < 0 or D(lot_row.available) < 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"lot {lot_row.id} would go negative on release",
            )
        if D(lot_row.quantity) != D(lot_row.available) + D(lot_row.reserved):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"lot {lot_row.id} imbalance after release",
            )
    header.status = "RELEASED"
    header.released_by = actor.id
    header.released_at = datetime.utcnow()
    session.add(
        IsoReservationAuditRow(
            reservation_id=reservation_id,
            action="RELEASE",
            actor_id=actor.id,
            from_status="RESERVED",
            to_status="RELEASED",
            created_at=datetime.utcnow(),
        )
    )
    session.flush()
    assert_synthetic_inventory_integrity(session, context=f"release {reservation_id}")
    return _serialize(session, reservation_id)


def seed_synthetic_lots(
    session: Session,
    *,
    depot_id: int,
    sample_product_id: int,
    export_product_id: int,
    insufficient_product_id: Optional[int] = None,
    as_of: Optional[date] = None,
) -> dict[str, IsoLotRow]:
    """Disposable lots for isolated tests. Never called against swift_distro_hub."""
    ensure_isolated_inventory_schema(session.get_bind())
    today = as_of or date.today()
    specs = [
        ("sg_expired", depot_id, sample_product_id, "SG-EXPIRED", today.replace(year=today.year - 1), 100, 100, 0, "Unrestricted", 1),
        ("sg_early", depot_id, sample_product_id, "SG-EARLY", date(today.year + 1, 1, 15), 20, 20, 0, "Unrestricted", 1),
        ("sg_late", depot_id, sample_product_id, "SG-LATE", date(today.year + 2, 6, 1), 80, 80, 0, "Unrestricted", 1),
        ("sg_null", depot_id, sample_product_id, "SG-NULL", None, 40, 40, 0, "Unrestricted", 1),
        ("sg_restricted", depot_id, sample_product_id, "SG-HOLD", date(today.year + 1, 3, 1), 30, 30, 0, "Restricted", 1),
        ("ex_early", depot_id, export_product_id, "EX-EARLY", date(today.year + 1, 2, 1), 15, 15, 0, "Unrestricted", 1),
        ("ex_late", depot_id, export_product_id, "EX-LATE", date(today.year + 3, 1, 1), 60, 60, 0, "Unrestricted", 1),
        ("ex_expired", depot_id, export_product_id, "EX-EXPIRED", date(today.year - 1, 5, 1), 50, 50, 0, "Unrestricted", 1),
    ]
    if insufficient_product_id:
        specs.append(
            (
                "thin",
                depot_id,
                insufficient_product_id,
                "THIN",
                date(today.year + 1, 4, 1),
                1,
                1,
                0,
                "Unrestricted",
                1,
            )
        )
    created = {}
    for key, depot, product, batch, expiry, qty, available, reserved, status_name, active in specs:
        row = IsoLotRow(
            depot_id=depot,
            product_id=product,
            batch_no=batch,
            expiry_date=expiry,
            quantity=qty,
            available=available,
            reserved=reserved,
            status=status_name,
            product_active=active,
        )
        session.add(row)
        session.flush()
        created[key] = row
    return created
