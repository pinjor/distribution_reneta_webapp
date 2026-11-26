"""F.4D-DEV Gate A isolated picking / issue / dispatch / delivery simulator.

Provisional TEST POLICY ONLY. Not imported by main:app. No FastAPI routes.
Does not write ProductItemStock, StockLedger, invoices, or commercial allocations.
"""
from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import date, datetime
from decimal import Decimal
from threading import RLock
from typing import Literal, Optional
from uuid import uuid4

from sqlalchemy import Column, Date, DateTime, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.services.isolated_inventory_simulation import (
    D,
    IsoBase,
    IsoLotRow,
    IsoReservationAuditRow,
    IsoReservationRow,
    IsoReservationSliceRow,
    SimulationError,
    SimulationPolicy,
    _row_to_lot,
    assert_disposable_bind,
)

FulfillmentStatus = Literal[
    "PICKING",
    "PICKED",
    "ISSUED",
    "DISPATCHED",
    "DELIVERED",
    "FAILED_DELIVERY",
    "CANCELLED",
]

WRITE_ROLES = frozenset({"admin", "manager", "warehouse"})
RELEASE_ROLES = frozenset({"admin", "manager"})
VIEW_ROLES = frozenset({"admin", "manager", "warehouse", "user", "transport"})


@dataclass(frozen=True)
class FulfillmentPolicy:
    """Unsigned warehouse test policy. Not business approval."""

    require_reservation: bool = True
    require_pick_before_issue: bool = True
    require_issue_before_dispatch: bool = True
    allow_partial_pick: bool = False
    allow_release_during_pick: bool = False
    reject_expired_at_pick: bool = True
    skip_invoice: bool = True
    as_of: Optional[date] = None


@dataclass
class FulfillmentActor:
    actor_id: int
    role: str
    depot_id: Optional[int] = None


@dataclass
class PickSlice:
    lot_id: int
    batch_no: str
    expiry_date: Optional[date]
    reserved_qty: Decimal
    picked_qty: Decimal = Decimal("0")


@dataclass
class IsolatedFulfillment:
    fulfillment_id: str
    reservation_id: str
    document_kind: str
    document_id: str
    depot_id: int
    status: FulfillmentStatus
    pick_slices: list[PickSlice] = field(default_factory=list)
    issued_qty: Decimal = Decimal("0")
    dispatch_id: Optional[str] = None
    delivery_id: Optional[str] = None
    start_pick_key: Optional[str] = None
    confirm_pick_key: Optional[str] = None
    issue_key: Optional[str] = None
    dispatch_key: Optional[str] = None
    delivery_key: Optional[str] = None
    transport_ref: Optional[str] = None
    receiver_name: Optional[str] = None
    delivered_qty: Optional[Decimal] = None
    pod_ref: Optional[str] = None
    fail_reason: Optional[str] = None
    remarks: Optional[str] = None
    audit: list[dict] = field(default_factory=list)


def _as_of(policy: FulfillmentPolicy) -> date:
    return policy.as_of or date.today()


def _issue_math(quantity, available, reserved, qty):
    quantity, available, reserved, qty = D(quantity), D(available), D(reserved), D(qty)
    if reserved < qty:
        raise SimulationError("insufficient", f"Reserved {reserved} < issue {qty}")
    reserved -= qty
    quantity -= qty
    if quantity != available + reserved:
        raise SimulationError("imbalance", "issue broke quantity = available + reserved")
    if min(quantity, available, reserved) < 0:
        raise SimulationError("imbalance", "issue produced a negative quantity")
    return quantity, available, reserved


def _require_role(actor: FulfillmentActor, allowed: frozenset[str], *, hide: bool = False) -> None:
    role = (actor.role or "").lower()
    if role not in allowed:
        if hide:
            raise SimulationError("not_found", "Not found")
        raise SimulationError("forbidden", f"Role {actor.role!r} cannot perform this action")


def _require_depot(actor: FulfillmentActor, depot_id: int) -> None:
    role = (actor.role or "").lower()
    if role == "admin":
        return
    if actor.depot_id != depot_id:
        raise SimulationError("not_found", "Not found")


class IsoFulfillmentRow(IsoBase):
    __tablename__ = "f4d_iso_fulfillments"
    __table_args__ = (
        UniqueConstraint("reservation_id", name="uq_f4d_iso_fulfillment_reservation"),
        UniqueConstraint("start_pick_key", name="uq_f4d_iso_fulfillment_pick_key"),
        UniqueConstraint("confirm_pick_key", name="uq_f4d_iso_fulfillment_confirm_key"),
        UniqueConstraint("issue_key", name="uq_f4d_iso_fulfillment_issue_key"),
        UniqueConstraint("dispatch_key", name="uq_f4d_iso_fulfillment_dispatch_key"),
        UniqueConstraint("delivery_key", name="uq_f4d_iso_fulfillment_delivery_key"),
    )

    id = Column(String(36), primary_key=True)
    reservation_id = Column(String(36), nullable=False)
    document_kind = Column(String(32), nullable=False)
    document_id = Column(String(64), nullable=False)
    depot_id = Column(Integer, nullable=False)
    status = Column(String(32), nullable=False)
    start_pick_key = Column(String(128), nullable=True)
    confirm_pick_key = Column(String(128), nullable=True)
    issue_key = Column(String(128), nullable=True)
    dispatch_key = Column(String(128), nullable=True)
    delivery_key = Column(String(128), nullable=True)
    start_pick_hash = Column(String(64), nullable=True)
    confirm_pick_hash = Column(String(64), nullable=True)
    issue_hash = Column(String(64), nullable=True)
    dispatch_hash = Column(String(64), nullable=True)
    delivery_hash = Column(String(64), nullable=True)
    transport_ref = Column(String(150), nullable=True)
    receiver_name = Column(String(255), nullable=True)
    delivered_qty = Column(Numeric(15, 4), nullable=True)
    pod_ref = Column(String(150), nullable=True)
    fail_reason = Column(String(500), nullable=True)
    remarks = Column(String(500), nullable=True)
    dispatch_id = Column(String(36), nullable=True)
    delivery_id = Column(String(36), nullable=True)
    issued_qty = Column(Numeric(15, 4), nullable=False, default=0)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())


class IsoPickSliceRow(IsoBase):
    __tablename__ = "f4d_iso_pick_slices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fulfillment_id = Column(String(36), nullable=False, index=True)
    lot_id = Column(Integer, nullable=False)
    batch_no = Column(String(100), nullable=False)
    expiry_date = Column(Date, nullable=True)
    reserved_qty = Column(Numeric(15, 4), nullable=False)
    picked_qty = Column(Numeric(15, 4), nullable=False, default=0)


class IsoFulfillmentAuditRow(IsoBase):
    __tablename__ = "f4d_iso_fulfillment_audit"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fulfillment_id = Column(String(36), nullable=False, index=True)
    action = Column(String(40), nullable=False)
    actor_id = Column(Integer, nullable=True)
    from_status = Column(String(32), nullable=True)
    to_status = Column(String(32), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())


class InMemoryFulfillmentStore:
    """Thread-safe in-process store. Synthetic lots live in the paired inventory store."""

    def __init__(self, inventory_store, policy: Optional[FulfillmentPolicy] = None):
        self.inventory = inventory_store
        self.policy = policy or FulfillmentPolicy()
        self._lock = RLock()
        self._rows: dict[str, IsolatedFulfillment] = {}
        self._by_reservation: dict[str, str] = {}
        self._by_pick_key: dict[str, str] = {}
        self._by_issue_key: dict[str, str] = {}
        self._by_dispatch_key: dict[str, str] = {}
        self._by_delivery_key: dict[str, str] = {}

    def _audit(self, row: IsolatedFulfillment, action: str, actor: FulfillmentActor, to_status: str) -> None:
        row.audit.append(
            {
                "action": action,
                "actor_id": actor.actor_id,
                "from_status": row.status,
                "to_status": to_status,
                "at": datetime.utcnow().isoformat(),
            }
        )

    def _reservation(self, reservation_id: str):
        try:
            return self.inventory._reservations[reservation_id]
        except KeyError as exc:
            raise SimulationError("not_found", "Reservation not found") from exc

    def start_pick(
        self,
        reservation_id: str,
        actor: FulfillmentActor,
        idempotency_key: str,
        depot_id: Optional[int] = None,
    ) -> IsolatedFulfillment:
        _require_role(actor, WRITE_ROLES)
        key = (idempotency_key or "").strip()
        if not key:
            raise SimulationError("invalid_qty", "idempotency_key is required")
        with self._lock:
            if key in self._by_pick_key:
                return replace(self._rows[self._by_pick_key[key]])
            reserved = self._reservation(reservation_id)
            _require_depot(actor, reserved.slices[0].depot_id if reserved.slices else (depot_id or -1))
            if depot_id is not None and reserved.slices and depot_id != reserved.slices[0].depot_id:
                raise SimulationError("not_found", "Not found")
            if reserved.status != "RESERVED":
                raise SimulationError("invalid_status", "Picking requires an active reservation")
            if reservation_id in self._by_reservation:
                existing = self._rows[self._by_reservation[reservation_id]]
                if existing.start_pick_key == key:
                    return replace(existing)
                raise SimulationError("conflict", "Picking already started for this reservation")
            if self.policy.reject_expired_at_pick:
                today = _as_of(self.policy)
                for slice_ in reserved.slices:
                    if slice_.expiry_date is not None and slice_.expiry_date < today:
                        raise SimulationError("expired", f"Reserved batch {slice_.batch_no} is expired at pick")
                    if slice_.expiry_date is None:
                        raise SimulationError("expired", f"Reserved batch {slice_.batch_no} has no expiry at pick")
            fid = str(uuid4())
            depot = reserved.slices[0].depot_id if reserved.slices else int(depot_id or 0)
            row = IsolatedFulfillment(
                fulfillment_id=fid,
                reservation_id=reservation_id,
                document_kind=reserved.document_kind,
                document_id=reserved.document_id,
                depot_id=depot,
                status="PICKING",
                pick_slices=[
                    PickSlice(
                        lot_id=s.lot_id,
                        batch_no=s.batch_no,
                        expiry_date=s.expiry_date,
                        reserved_qty=D(s.qty),
                    )
                    for s in reserved.slices
                ],
                start_pick_key=key,
            )
            self._audit(row, "START_PICK", actor, "PICKING")
            row.status = "PICKING"
            self._rows[fid] = row
            self._by_reservation[reservation_id] = fid
            self._by_pick_key[key] = fid
            return replace(row)

    def confirm_pick(
        self,
        fulfillment_id: str,
        actor: FulfillmentActor,
        picked: dict[int, Decimal],
    ) -> IsolatedFulfillment:
        _require_role(actor, WRITE_ROLES)
        with self._lock:
            row = self._rows[fulfillment_id]
            _require_depot(actor, row.depot_id)
            if row.status == "PICKED":
                return replace(row)
            if row.status != "PICKING":
                raise SimulationError("invalid_status", f"Cannot confirm pick from {row.status}")
            for slice_ in row.pick_slices:
                got = D(picked.get(slice_.lot_id, 0))
                if got < 0:
                    raise SimulationError("invalid_qty", "Picked quantity cannot be negative")
                if got > D(slice_.reserved_qty):
                    raise SimulationError("invalid_qty", "Cannot pick more than reserved")
                if not self.policy.allow_partial_pick and got != D(slice_.reserved_qty):
                    raise SimulationError("insufficient_picked", "Partial picking is not enabled")
                slice_.picked_qty = got
            self._audit(row, "CONFIRM_PICK", actor, "PICKED")
            row.status = "PICKED"
            return replace(row)

    def issue(self, fulfillment_id: str, actor: FulfillmentActor, idempotency_key: str) -> IsolatedFulfillment:
        _require_role(actor, WRITE_ROLES)
        key = (idempotency_key or "").strip()
        if not key:
            raise SimulationError("invalid_qty", "idempotency_key is required")
        with self._lock:
            if key in self._by_issue_key:
                return replace(self._rows[self._by_issue_key[key]])
            row = self._rows[fulfillment_id]
            _require_depot(actor, row.depot_id)
            if row.status == "ISSUED" or row.status in {"DISPATCHED", "DELIVERED"}:
                if row.issue_key == key:
                    return replace(row)
                if row.status == "ISSUED":
                    raise SimulationError("conflict", "Stock already issued")
            if self.policy.require_pick_before_issue and row.status != "PICKED":
                raise SimulationError("invalid_status", "Issuance requires completed picking")
            reserved = self._reservation(row.reservation_id)
            issued = Decimal("0")
            for slice_ in row.pick_slices:
                qty = D(slice_.picked_qty)
                if qty <= 0:
                    continue
                lot = self.inventory._lots[slice_.lot_id]
                quantity, available, reserved_qty = _issue_math(lot.quantity, lot.available, lot.reserved, qty)
                self.inventory._lots[slice_.lot_id] = replace(
                    lot, quantity=quantity, available=available, reserved=reserved_qty
                )
                issued += qty
            reserved.status = "ISSUED"
            self._audit(row, "ISSUE", actor, "ISSUED")
            row.status = "ISSUED"
            row.issued_qty = issued
            row.issue_key = key
            self._by_issue_key[key] = row.fulfillment_id
            return replace(row)

    def dispatch(self, fulfillment_id: str, actor: FulfillmentActor, idempotency_key: str) -> IsolatedFulfillment:
        _require_role(actor, WRITE_ROLES)
        key = (idempotency_key or "").strip()
        if not key:
            raise SimulationError("invalid_qty", "idempotency_key is required")
        with self._lock:
            if key in self._by_dispatch_key:
                return replace(self._rows[self._by_dispatch_key[key]])
            row = self._rows[fulfillment_id]
            _require_depot(actor, row.depot_id)
            if row.status == "DISPATCHED" or row.status == "DELIVERED":
                if row.dispatch_key == key:
                    return replace(row)
                raise SimulationError("conflict", "Already dispatched")
            if self.policy.require_issue_before_dispatch and row.status != "ISSUED":
                raise SimulationError("invalid_status", "Dispatch requires issuance")
            self._audit(row, "DISPATCH", actor, "DISPATCHED")
            row.status = "DISPATCHED"
            row.dispatch_id = str(uuid4())
            row.dispatch_key = key
            self._by_dispatch_key[key] = row.fulfillment_id
            return replace(row)

    def confirm_delivery(
        self,
        fulfillment_id: str,
        actor: FulfillmentActor,
        idempotency_key: str,
        *,
        failed: bool = False,
    ) -> IsolatedFulfillment:
        _require_role(actor, WRITE_ROLES)
        key = (idempotency_key or "").strip()
        if not key:
            raise SimulationError("invalid_qty", "idempotency_key is required")
        with self._lock:
            if key in self._by_delivery_key:
                return replace(self._rows[self._by_delivery_key[key]])
            row = self._rows[fulfillment_id]
            _require_depot(actor, row.depot_id)
            if row.status in {"DELIVERED", "FAILED_DELIVERY"}:
                if row.delivery_key == key:
                    return replace(row)
                raise SimulationError("conflict", "Delivery already confirmed")
            if row.status != "DISPATCHED":
                raise SimulationError("invalid_status", "Delivery confirmation requires dispatch")
            new_status: FulfillmentStatus = "FAILED_DELIVERY" if failed else "DELIVERED"
            self._audit(row, "FAIL_DELIVERY" if failed else "CONFIRM_DELIVERY", actor, new_status)
            row.status = new_status
            row.delivery_id = str(uuid4())
            row.delivery_key = key
            self._by_delivery_key[key] = row.fulfillment_id
            return replace(row)

    def cancel_pick_and_release(self, fulfillment_id: str, actor: FulfillmentActor) -> IsolatedFulfillment:
        _require_role(actor, RELEASE_ROLES)
        with self._lock:
            row = self._rows[fulfillment_id]
            _require_depot(actor, row.depot_id)
            if row.status not in {"PICKING"}:
                raise SimulationError("invalid_status", f"Cannot release during {row.status}")
            if not self.policy.allow_release_during_pick:
                raise SimulationError("conflict", "Release during picking is not enabled")
            self.inventory.release(row.reservation_id)
            self._audit(row, "CANCEL_PICK", actor, "CANCELLED")
            row.status = "CANCELLED"
            return replace(row)

    def get(self, fulfillment_id: str) -> IsolatedFulfillment:
        return replace(self._rows[fulfillment_id])


def assert_fulfillment_integrity(inventory_store, fulfillment: IsolatedFulfillment, *, context: str = "") -> None:
    prefix = f"{context}: " if context else ""
    for lot in inventory_store.lots():
        if min(D(lot.quantity), D(lot.available), D(lot.reserved)) < 0:
            raise AssertionError(
                f"{prefix}lot {lot.lot_id} batch {lot.batch_no!r} negative "
                f"qty={lot.quantity} available={lot.available} reserved={lot.reserved}"
            )
        if D(lot.quantity) != D(lot.available) + D(lot.reserved):
            raise AssertionError(
                f"{prefix}lot {lot.lot_id} batch {lot.batch_no!r} broke quantity = available + reserved "
                f"({lot.quantity} != {lot.available} + {lot.reserved})"
            )
    if fulfillment.status == "ISSUED" and D(fulfillment.issued_qty) <= 0:
        raise AssertionError(f"{prefix}fulfillment {fulfillment.fulfillment_id} issued with zero quantity")


class PostgresFulfillmentStore:
    """Row-locked fulfillment on disposable PostgreSQL only."""

    def __init__(self, session: Session, policy: Optional[FulfillmentPolicy] = None):
        assert_disposable_bind(session.get_bind())
        self.session = session
        self.policy = policy or FulfillmentPolicy()

    def _lock_reservation(self, reservation_id: str) -> IsoReservationRow:
        header = (
            self.session.query(IsoReservationRow)
            .filter_by(id=reservation_id)
            .with_for_update()
            .first()
        )
        if header is None:
            raise SimulationError("not_found", "Reservation not found")
        return header

    def _lock_fulfillment(self, fulfillment_id: str) -> IsoFulfillmentRow:
        header = (
            self.session.query(IsoFulfillmentRow)
            .filter_by(id=fulfillment_id)
            .with_for_update()
            .first()
        )
        if header is None:
            raise SimulationError("not_found", "Fulfillment not found")
        return header

    def _lock_lots(self, lot_ids: list[int]) -> dict[int, IsoLotRow]:
        ids = sorted(set(lot_ids))
        if not ids:
            return {}
        rows = (
            self.session.query(IsoLotRow)
            .filter(IsoLotRow.id.in_(ids))
            .order_by(IsoLotRow.id)
            .with_for_update()
            .all()
        )
        return {row.id: row for row in rows}

    def _slices(self, reservation_id: str) -> list[IsoReservationSliceRow]:
        return (
            self.session.query(IsoReservationSliceRow)
            .filter_by(reservation_id=reservation_id)
            .order_by(IsoReservationSliceRow.id)
            .all()
        )

    def _audit(self, fulfillment_id: str, action: str, actor: FulfillmentActor, from_status, to_status) -> None:
        self.session.add(
            IsoFulfillmentAuditRow(
                fulfillment_id=fulfillment_id,
                action=action,
                actor_id=actor.actor_id,
                from_status=from_status,
                to_status=to_status,
                created_at=datetime.utcnow(),
            )
        )

    def _load(self, fulfillment_id: str) -> IsolatedFulfillment:
        header = self.session.get(IsoFulfillmentRow, fulfillment_id)
        slices = (
            self.session.query(IsoPickSliceRow)
            .filter_by(fulfillment_id=fulfillment_id)
            .order_by(IsoPickSliceRow.id)
            .all()
        )
        audit = (
            self.session.query(IsoFulfillmentAuditRow)
            .filter_by(fulfillment_id=fulfillment_id)
            .order_by(IsoFulfillmentAuditRow.id)
            .all()
        )
        return IsolatedFulfillment(
            fulfillment_id=header.id,
            reservation_id=header.reservation_id,
            document_kind=header.document_kind,
            document_id=header.document_id,
            depot_id=header.depot_id,
            status=header.status,  # type: ignore[arg-type]
            pick_slices=[
                PickSlice(
                    lot_id=row.lot_id,
                    batch_no=row.batch_no,
                    expiry_date=row.expiry_date,
                    reserved_qty=D(row.reserved_qty),
                    picked_qty=D(row.picked_qty),
                )
                for row in slices
            ],
            issued_qty=D(header.issued_qty),
            dispatch_id=header.dispatch_id,
            delivery_id=header.delivery_id,
            start_pick_key=header.start_pick_key,
            confirm_pick_key=header.confirm_pick_key,
            issue_key=header.issue_key,
            dispatch_key=header.dispatch_key,
            delivery_key=header.delivery_key,
            transport_ref=header.transport_ref,
            receiver_name=header.receiver_name,
            delivered_qty=None if header.delivered_qty is None else D(header.delivered_qty),
            pod_ref=header.pod_ref,
            fail_reason=header.fail_reason,
            remarks=header.remarks,
            audit=[
                {
                    "action": row.action,
                    "actor_id": row.actor_id,
                    "from_status": row.from_status,
                    "to_status": row.to_status,
                }
                for row in audit
            ],
        )

    def _reject_hash(self, stored_key, stored_hash, key, payload_hash, already_msg: str) -> None:
        if stored_key and stored_key == key and stored_hash and payload_hash and stored_hash != payload_hash:
            raise SimulationError("conflict", "Idempotency key reused with a different payload")
        if stored_key and stored_key != key:
            raise SimulationError("conflict", already_msg)

    def start_pick(
        self,
        reservation_id: str,
        actor: FulfillmentActor,
        idempotency_key: str,
        depot_id=None,
        payload_hash: Optional[str] = None,
    ):
        _require_role(actor, WRITE_ROLES)
        key = (idempotency_key or "").strip()
        if not key:
            raise SimulationError("invalid_qty", "idempotency_key is required")
        existing_key = self.session.query(IsoFulfillmentRow).filter_by(start_pick_key=key).one_or_none()
        if existing_key:
            if existing_key.reservation_id != reservation_id:
                raise SimulationError("conflict", "Idempotency key reused with a different payload")
            self.session.query(IsoFulfillmentRow).filter_by(id=existing_key.id).with_for_update().first()
            self._lock_reservation(reservation_id)
            self._reject_hash(
                existing_key.start_pick_key,
                existing_key.start_pick_hash,
                key,
                payload_hash,
                "Picking already started for this reservation",
            )
            return self._load(existing_key.id)
        self.session.query(IsoFulfillmentRow).filter_by(reservation_id=reservation_id).order_by(
            IsoFulfillmentRow.id
        ).with_for_update().all()
        header = self._lock_reservation(reservation_id)
        slices = self._slices(reservation_id)
        if not slices:
            raise SimulationError("not_found", "Reservation has no slices")
        _require_depot(actor, header.depot_id or slices[0].depot_id)
        if depot_id is not None and depot_id != (header.depot_id or slices[0].depot_id):
            raise SimulationError("not_found", "Not found")
        if header.status != "RESERVED":
            raise SimulationError("invalid_status", "Picking requires an active reservation")
        existing = self.session.query(IsoFulfillmentRow).filter_by(reservation_id=reservation_id).one_or_none()
        if existing:
            if existing.start_pick_key == key:
                return self._load(existing.id)
            raise SimulationError("conflict", "Picking already started for this reservation")
        if self.policy.reject_expired_at_pick:
            today = _as_of(self.policy)
            for slice_ in slices:
                if slice_.expiry_date is not None and slice_.expiry_date < today:
                    raise SimulationError("expired", f"Reserved batch {slice_.batch_no} is expired at pick")
                if slice_.expiry_date is None:
                    raise SimulationError("expired", f"Reserved batch {slice_.batch_no} has no expiry at pick")
        fid = str(uuid4())
        self.session.add(
            IsoFulfillmentRow(
                id=fid,
                reservation_id=reservation_id,
                document_kind=header.document_kind,
                document_id=header.document_id,
                depot_id=header.depot_id or slices[0].depot_id,
                status="PICKING",
                start_pick_key=key,
                start_pick_hash=payload_hash,
                created_by=actor.actor_id,
                created_at=datetime.utcnow(),
            )
        )
        for slice_ in slices:
            self.session.add(
                IsoPickSliceRow(
                    fulfillment_id=fid,
                    lot_id=slice_.lot_id,
                    batch_no=slice_.batch_no,
                    expiry_date=slice_.expiry_date,
                    reserved_qty=slice_.qty,
                    picked_qty=0,
                )
            )
        self._audit(fid, "START_PICK", actor, None, "PICKING")
        try:
            self.session.flush()
        except IntegrityError as exc:
            self.session.rollback()
            recovered = (
                self.session.query(IsoFulfillmentRow).filter_by(reservation_id=reservation_id).one_or_none()
            )
            if recovered is not None and recovered.start_pick_key == key:
                return self._load(recovered.id)
            raise SimulationError("conflict", "Picking already started for this reservation") from exc
        return self._load(fid)

    def confirm_pick(
        self,
        fulfillment_id: str,
        actor: FulfillmentActor,
        picked: dict[int, Decimal],
        idempotency_key: Optional[str] = None,
        payload_hash: Optional[str] = None,
    ):
        _require_role(actor, WRITE_ROLES)
        header = self._lock_fulfillment(fulfillment_id)
        self._lock_reservation(header.reservation_id)
        _require_depot(actor, header.depot_id)
        key = (idempotency_key or "").strip() or None
        if header.status == "PICKED":
            if key:
                self._reject_hash(
                    header.confirm_pick_key,
                    header.confirm_pick_hash,
                    key,
                    payload_hash,
                    "Pick already confirmed",
                )
            return self._load(fulfillment_id)
        if header.status != "PICKING":
            raise SimulationError("invalid_status", f"Cannot confirm pick from {header.status}")
        rows = (
            self.session.query(IsoPickSliceRow)
            .filter_by(fulfillment_id=fulfillment_id)
            .order_by(IsoPickSliceRow.id)
            .all()
        )
        for row in rows:
            got = D(picked.get(row.lot_id, 0))
            if got < 0 or got > D(row.reserved_qty):
                raise SimulationError("invalid_qty", "Picked quantity is invalid")
            if not self.policy.allow_partial_pick and got != D(row.reserved_qty):
                raise SimulationError("insufficient_picked", "Partial picking is not enabled")
            row.picked_qty = got
        self._audit(fulfillment_id, "CONFIRM_PICK", actor, header.status, "PICKED")
        header.status = "PICKED"
        header.confirm_pick_key = key
        header.confirm_pick_hash = payload_hash
        self.session.flush()
        return self._load(fulfillment_id)

    def issue(
        self,
        fulfillment_id: str,
        actor: FulfillmentActor,
        idempotency_key: str,
        payload_hash: Optional[str] = None,
    ):
        _require_role(actor, WRITE_ROLES)
        key = (idempotency_key or "").strip()
        if not key:
            raise SimulationError("invalid_qty", "idempotency_key is required")
        existing_key = self.session.query(IsoFulfillmentRow).filter_by(issue_key=key).one_or_none()
        if existing_key:
            self._reject_hash(
                existing_key.issue_key,
                existing_key.issue_hash,
                key,
                payload_hash,
                "Stock already issued",
            )
            return self._load(existing_key.id)
        header = self._lock_fulfillment(fulfillment_id)
        _require_depot(actor, header.depot_id)
        if header.status in {"ISSUED", "DISPATCHED", "DELIVERED", "FAILED_DELIVERY"}:
            self._reject_hash(header.issue_key, header.issue_hash, key, payload_hash, "Stock already issued")
            if header.issue_key == key:
                return self._load(fulfillment_id)
            raise SimulationError("conflict", "Stock already issued")
        if self.policy.require_pick_before_issue and header.status != "PICKED":
            raise SimulationError("invalid_status", "Issuance requires completed picking")
        res = self._lock_reservation(header.reservation_id)
        pick_rows = (
            self.session.query(IsoPickSliceRow)
            .filter_by(fulfillment_id=fulfillment_id)
            .order_by(IsoPickSliceRow.lot_id)
            .all()
        )
        locked = self._lock_lots([row.lot_id for row in pick_rows])
        issued = Decimal("0")
        for row in pick_rows:
            qty = D(row.picked_qty)
            if qty <= 0:
                continue
            lot = locked[row.lot_id]
            quantity, available, reserved = _issue_math(lot.quantity, lot.available, lot.reserved, qty)
            lot.quantity, lot.available, lot.reserved = quantity, available, reserved
            issued += qty
        res.status = "ISSUED"
        self.session.add(
            IsoReservationAuditRow(
                reservation_id=res.id,
                action="ISSUE",
                actor_id=actor.actor_id,
                from_status="RESERVED",
                to_status="ISSUED",
                created_at=datetime.utcnow(),
            )
        )
        self._audit(fulfillment_id, "ISSUE", actor, header.status, "ISSUED")
        header.status = "ISSUED"
        header.issued_qty = issued
        header.issue_key = key
        header.issue_hash = payload_hash
        try:
            self.session.flush()
        except IntegrityError as exc:
            self.session.rollback()
            recovered = self.session.query(IsoFulfillmentRow).filter_by(issue_key=key).one_or_none()
            if recovered is not None:
                return self._load(recovered.id)
            raise SimulationError("conflict", "Stock already issued") from exc
        return self._load(fulfillment_id)

    def dispatch(
        self,
        fulfillment_id: str,
        actor: FulfillmentActor,
        idempotency_key: str,
        transport_ref: Optional[str] = None,
        remarks: Optional[str] = None,
        payload_hash: Optional[str] = None,
    ):
        _require_role(actor, WRITE_ROLES)
        key = (idempotency_key or "").strip()
        if not key:
            raise SimulationError("invalid_qty", "idempotency_key is required")
        existing_key = self.session.query(IsoFulfillmentRow).filter_by(dispatch_key=key).one_or_none()
        if existing_key:
            self._reject_hash(
                existing_key.dispatch_key,
                existing_key.dispatch_hash,
                key,
                payload_hash,
                "Already dispatched",
            )
            return self._load(existing_key.id)
        header = self._lock_fulfillment(fulfillment_id)
        _require_depot(actor, header.depot_id)
        if header.status in {"DISPATCHED", "DELIVERED", "FAILED_DELIVERY"}:
            self._reject_hash(header.dispatch_key, header.dispatch_hash, key, payload_hash, "Already dispatched")
            if header.dispatch_key == key:
                return self._load(fulfillment_id)
            raise SimulationError("conflict", "Already dispatched")
        if self.policy.require_issue_before_dispatch and header.status != "ISSUED":
            raise SimulationError("invalid_status", "Dispatch requires issuance")
        self._audit(fulfillment_id, "DISPATCH", actor, header.status, "DISPATCHED")
        header.status = "DISPATCHED"
        header.dispatch_id = str(uuid4())
        header.dispatch_key = key
        header.dispatch_hash = payload_hash
        header.transport_ref = transport_ref
        header.remarks = remarks
        self.session.flush()
        return self._load(fulfillment_id)

    def confirm_delivery(
        self,
        fulfillment_id: str,
        actor: FulfillmentActor,
        idempotency_key: str,
        *,
        failed=False,
        reason: Optional[str] = None,
        receiver_name: Optional[str] = None,
        delivered_qty: Optional[Decimal] = None,
        pod_ref: Optional[str] = None,
        remarks: Optional[str] = None,
        payload_hash: Optional[str] = None,
    ):
        _require_role(actor, WRITE_ROLES)
        key = (idempotency_key or "").strip()
        if not key:
            raise SimulationError("invalid_qty", "idempotency_key is required")
        if failed and not (reason or "").strip():
            raise SimulationError("invalid_qty", "Failure reason is required")
        existing_key = self.session.query(IsoFulfillmentRow).filter_by(delivery_key=key).one_or_none()
        if existing_key:
            self._reject_hash(
                existing_key.delivery_key,
                existing_key.delivery_hash,
                key,
                payload_hash,
                "Delivery already confirmed",
            )
            return self._load(existing_key.id)
        header = self._lock_fulfillment(fulfillment_id)
        _require_depot(actor, header.depot_id)
        if header.status in {"DELIVERED", "FAILED_DELIVERY"}:
            self._reject_hash(
                header.delivery_key,
                header.delivery_hash,
                key,
                payload_hash,
                "Delivery already confirmed",
            )
            if header.delivery_key == key:
                return self._load(fulfillment_id)
            raise SimulationError("conflict", "Delivery already confirmed")
        if header.status != "DISPATCHED":
            raise SimulationError("invalid_status", "Delivery confirmation requires dispatch")
        if not failed:
            expected = D(header.issued_qty)
            got = expected if delivered_qty is None else D(delivered_qty)
            if got != expected:
                raise SimulationError("invalid_qty", "Delivered quantity must equal issued quantity")
            header.delivered_qty = got
            header.receiver_name = receiver_name
            header.pod_ref = pod_ref
        else:
            header.fail_reason = reason
        if remarks:
            header.remarks = remarks
        new_status = "FAILED_DELIVERY" if failed else "DELIVERED"
        self._audit(
            fulfillment_id,
            "FAIL_DELIVERY" if failed else "CONFIRM_DELIVERY",
            actor,
            header.status,
            new_status,
        )
        header.status = new_status
        header.delivery_id = str(uuid4())
        header.delivery_key = key
        header.delivery_hash = payload_hash
        self.session.flush()
        return self._load(fulfillment_id)
