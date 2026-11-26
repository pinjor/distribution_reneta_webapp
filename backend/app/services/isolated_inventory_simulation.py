"""F.4C-DEV isolated inventory allocation simulator.

Not imported by main:app. HTTP adapters live in isolated_document_reservation.
Does not mutate ProductItemStock / StockLedger / order_batch_allocations.
Proposed FEFO rules are TEST POLICY ONLY.
"""
from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import date, datetime
from decimal import Decimal
from threading import RLock
from typing import Iterable, Literal, Optional
from uuid import uuid4

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Integer,
    MetaData,
    Numeric,
    String,
    UniqueConstraint,
    create_engine,
    func,
)
from sqlalchemy.orm import Session, declarative_base, sessionmaker

FORBIDDEN_DATABASES = frozenset({"swift_distro_hub"})
DISPOSABLE_NAMES = frozenset({"reneta_e2e", "f4b1b_iso"})
DISPOSABLE_PREFIXES = ("f4c", "f4b2", "f4d", "reneta_e2e")

DocumentKind = Literal["sample_gift", "export", "commercial_sim"]
NoExpiryPolicy = Literal["reject", "last"]
ReservationStatus = Literal["RESERVED", "RELEASED", "ISSUED"]


def D(value) -> Decimal:
    return Decimal(str(value if value is not None else 0))


class SimulationError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class SimulationPolicy:
    """Unsigned warehouse test policy. Not business approval."""

    skip_expired: bool = True
    no_expiry: NoExpiryPolicy = "reject"
    allowed_statuses: frozenset[str] = frozenset({"Unrestricted"})
    require_active_product: bool = True
    allow_partial: bool = False
    as_of: Optional[date] = None


@dataclass
class IsolatedLot:
    lot_id: int
    depot_id: int
    product_id: int
    batch_no: str
    expiry_date: Optional[date]
    quantity: Decimal
    available: Decimal
    reserved: Decimal
    status: str = "Unrestricted"
    product_active: bool = True

    def balanced(self) -> bool:
        return D(self.quantity) == D(self.available) + D(self.reserved)


@dataclass(frozen=True)
class AllocationSlice:
    lot_id: int
    qty: Decimal
    batch_no: str
    expiry_date: Optional[date]
    depot_id: int


@dataclass
class IsolatedReservation:
    reservation_id: str
    document_kind: DocumentKind
    document_id: str
    idempotency_key: str
    status: ReservationStatus
    slices: list[AllocationSlice] = field(default_factory=list)


def _as_of(policy: SimulationPolicy) -> date:
    return policy.as_of or date.today()


def eligible_lot(lot: IsolatedLot, policy: SimulationPolicy) -> Optional[str]:
    """Return a skip reason, or None if the lot may be allocated."""
    if policy.require_active_product and not lot.product_active:
        return "inactive_product"
    if lot.status not in policy.allowed_statuses:
        return "status"
    if D(lot.available) <= 0:
        return "no_available"
    if policy.skip_expired and lot.expiry_date is not None and lot.expiry_date < _as_of(policy):
        return "expired"
    if lot.expiry_date is None and policy.no_expiry == "reject":
        return "no_expiry"
    return None


def plan_fefo(
    lots: Iterable[IsolatedLot],
    *,
    product_id: int,
    depot_id: int,
    qty: Decimal,
    policy: SimulationPolicy,
) -> list[AllocationSlice]:
    need = D(qty)
    if need <= 0:
        raise SimulationError("invalid_qty", "Reservation quantity must be positive")
    candidates = [
        lot
        for lot in lots
        if lot.product_id == product_id and lot.depot_id == depot_id and eligible_lot(lot, policy) is None
    ]
    dated = [lot for lot in candidates if lot.expiry_date is not None]
    undated = [lot for lot in candidates if lot.expiry_date is None]
    dated.sort(key=lambda lot: (lot.expiry_date, lot.batch_no, lot.lot_id))
    undated.sort(key=lambda lot: (lot.batch_no, lot.lot_id))
    ordered = dated + undated if policy.no_expiry == "last" else dated

    slices: list[AllocationSlice] = []
    remaining = need
    for lot in ordered:
        take = min(D(lot.available), remaining)
        if take <= 0:
            continue
        slices.append(
            AllocationSlice(
                lot_id=lot.lot_id,
                qty=take,
                batch_no=lot.batch_no,
                expiry_date=lot.expiry_date,
                depot_id=lot.depot_id,
            )
        )
        remaining -= take
        if remaining == 0:
            break
    if remaining > 0:
        if not policy.allow_partial:
            raise SimulationError(
                "insufficient",
                f"Insufficient eligible stock at depot {depot_id} for product {product_id}: short {remaining}",
            )
    return slices


class InMemoryInventoryStore:
    """Thread-safe synthetic lots. Never connected to live PostgreSQL."""

    def __init__(self):
        self._lock = RLock()
        self._lots: dict[int, IsolatedLot] = {}
        self._reservations: dict[str, IsolatedReservation] = {}
        self._by_key: dict[tuple[str, str, str], str] = {}
        self._seq = 1

    def add_lot(self, **kwargs) -> IsolatedLot:
        with self._lock:
            lot_id = kwargs.pop("lot_id", None) or self._seq
            self._seq = max(self._seq, int(lot_id) + 1)
            lot = IsolatedLot(
                lot_id=int(lot_id),
                quantity=D(kwargs.pop("quantity")),
                available=D(kwargs.pop("available")),
                reserved=D(kwargs.pop("reserved", 0)),
                **kwargs,
            )
            if not lot.balanced():
                raise SimulationError("imbalance", "quantity must equal available + reserved")
            self._lots[lot.lot_id] = lot
            return replace(lot)

    def lots(self) -> list[IsolatedLot]:
        with self._lock:
            return [replace(lot) for lot in self._lots.values()]

    def get_lot(self, lot_id: int) -> IsolatedLot:
        with self._lock:
            return replace(self._lots[lot_id])

    def reserve(
        self,
        *,
        document_kind: DocumentKind,
        document_id: str,
        product_id: int,
        depot_id: int,
        qty: Decimal,
        idempotency_key: str,
        policy: SimulationPolicy,
    ) -> IsolatedReservation:
        key = (document_kind, document_id, idempotency_key)
        with self._lock:
            existing = self._by_key.get(key)
            if existing:
                return self._reservations[existing]
            slices = plan_fefo(
                self._lots.values(),
                product_id=product_id,
                depot_id=depot_id,
                qty=qty,
                policy=policy,
            )
            for slice_ in slices:
                lot = self._lots[slice_.lot_id]
                quantity, available, reserved = _reserve_math(lot.quantity, lot.available, lot.reserved, slice_.qty)
                self._lots[slice_.lot_id] = replace(lot, quantity=quantity, available=available, reserved=reserved)
            reservation = IsolatedReservation(
                reservation_id=str(uuid4()),
                document_kind=document_kind,
                document_id=document_id,
                idempotency_key=idempotency_key,
                status="RESERVED",
                slices=slices,
            )
            self._reservations[reservation.reservation_id] = reservation
            self._by_key[key] = reservation.reservation_id
            return reservation

    def release(self, reservation_id: str) -> IsolatedReservation:
        with self._lock:
            row = self._reservations[reservation_id]
            if row.status == "RELEASED":
                return row
            if row.status != "RESERVED":
                raise SimulationError("invalid_status", f"Cannot release a {row.status} reservation")
            for slice_ in row.slices:
                lot = self._lots[slice_.lot_id]
                self._lots[slice_.lot_id] = replace(
                    lot,
                    available=D(lot.available) + slice_.qty,
                    reserved=D(lot.reserved) - slice_.qty,
                )
            row.status = "RELEASED"
            return row

    def issue(self, reservation_id: str) -> IsolatedReservation:
        with self._lock:
            row = self._reservations[reservation_id]
            if row.status == "ISSUED":
                return row
            if row.status != "RESERVED":
                raise SimulationError("invalid_status", f"Cannot issue a {row.status} reservation")
            for slice_ in row.slices:
                lot = self._lots[slice_.lot_id]
                if D(lot.reserved) < slice_.qty:
                    raise SimulationError("conflict", "Reserved quantity changed before issue")
                self._lots[slice_.lot_id] = replace(
                    lot,
                    quantity=D(lot.quantity) - slice_.qty,
                    reserved=D(lot.reserved) - slice_.qty,
                )
            row.status = "ISSUED"
            return row

    def transfer_available(self, lot_id: int, qty: Decimal, dest_lot_id: int) -> None:
        need = D(qty)
        with self._lock:
            src = self._lots[lot_id]
            dest = self._lots[dest_lot_id]
            if D(src.available) < need:
                raise SimulationError("insufficient", "Cannot transfer reserved or missing available units")
            self._lots[lot_id] = replace(
                src,
                quantity=D(src.quantity) - need,
                available=D(src.available) - need,
            )
            self._lots[dest_lot_id] = replace(
                dest,
                quantity=D(dest.quantity) + need,
                available=D(dest.available) + need,
            )


def _reserve_math(quantity, available, reserved, qty):
    quantity, available, reserved, qty = D(quantity), D(available), D(reserved), D(qty)
    if available < qty:
        raise SimulationError("insufficient", f"Available {available} < {qty}")
    available -= qty
    reserved += qty
    if quantity != available + reserved:
        raise SimulationError("imbalance", "reserve broke quantity = available + reserved")
    return quantity, available, reserved


# --- Disposable PostgreSQL store (isolated metadata, never on live Base) ---

IsoBase = declarative_base(metadata=MetaData())


class IsoLotRow(IsoBase):
    __tablename__ = "f4c_iso_lots"

    id = Column(Integer, primary_key=True)
    depot_id = Column(Integer, nullable=False)
    product_id = Column(Integer, nullable=False)
    batch_no = Column(String(100), nullable=False)
    expiry_date = Column(Date, nullable=True)
    quantity = Column(Numeric(15, 4), nullable=False)
    available = Column(Numeric(15, 4), nullable=False)
    reserved = Column(Numeric(15, 4), nullable=False, default=0)
    status = Column(String(50), nullable=False, default="Unrestricted")
    product_active = Column(Integer, nullable=False, default=1)


class IsoReservationRow(IsoBase):
    __tablename__ = "f4c_iso_reservations"
    __table_args__ = (
        UniqueConstraint(
            "document_kind",
            "document_id",
            "idempotency_key",
            name="uq_f4c_iso_reservation_idempotency",
        ),
    )

    id = Column(String(36), primary_key=True)
    document_kind = Column(String(32), nullable=False)
    document_id = Column(String(64), nullable=False)
    idempotency_key = Column(String(128), nullable=False)
    status = Column(String(20), nullable=False)
    depot_id = Column(Integer, nullable=True)
    created_by = Column(Integer, nullable=True)
    released_by = Column(Integer, nullable=True)
    remarks = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    released_at = Column(DateTime, nullable=True)


class IsoReservationLineRow(IsoBase):
    __tablename__ = "f4c_iso_reservation_lines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reservation_id = Column(String(36), nullable=False, index=True)
    document_item_id = Column(Integer, nullable=False)
    product_id = Column(Integer, nullable=False)
    requested_qty = Column(Numeric(15, 4), nullable=False)
    reserved_qty = Column(Numeric(15, 4), nullable=False)


class IsoReservationSliceRow(IsoBase):
    __tablename__ = "f4c_iso_reservation_slices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reservation_id = Column(String(36), nullable=False, index=True)
    lot_id = Column(Integer, nullable=False)
    qty = Column(Numeric(15, 4), nullable=False)
    batch_no = Column(String(100), nullable=False)
    expiry_date = Column(Date, nullable=True)
    depot_id = Column(Integer, nullable=False)
    product_id = Column(Integer, nullable=True)
    document_item_id = Column(Integer, nullable=True)


class IsoReservationAuditRow(IsoBase):
    __tablename__ = "f4c_iso_reservation_audit"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reservation_id = Column(String(36), nullable=False, index=True)
    action = Column(String(40), nullable=False)
    actor_id = Column(Integer, nullable=True)
    from_status = Column(String(20), nullable=True)
    to_status = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())


def assert_disposable_bind(bind) -> None:
    url = str(getattr(bind, "url", bind) or "")
    name = getattr(getattr(bind, "url", None), "database", None) or ""
    if "swift_distro_hub" in url or name in FORBIDDEN_DATABASES:
        raise RuntimeError("isolated inventory simulator refuses swift_distro_hub")
    if str(url).startswith("sqlite"):
        return
    if name in DISPOSABLE_NAMES or any(name.startswith(prefix) for prefix in DISPOSABLE_PREFIXES):
        return
    raise RuntimeError(f"isolated inventory simulator refuses database {name!r}")


def create_isolated_schema(engine) -> None:
    assert_disposable_bind(engine)
    from app.services import isolated_fulfillment_simulation  # noqa: F401

    IsoBase.metadata.create_all(bind=engine)


def drop_isolated_schema(engine) -> None:
    assert_disposable_bind(engine)
    IsoBase.metadata.drop_all(bind=engine)


def _row_to_lot(row: IsoLotRow) -> IsolatedLot:
    return IsolatedLot(
        lot_id=row.id,
        depot_id=row.depot_id,
        product_id=row.product_id,
        batch_no=row.batch_no,
        expiry_date=row.expiry_date,
        quantity=D(row.quantity),
        available=D(row.available),
        reserved=D(row.reserved),
        status=row.status,
        product_active=bool(row.product_active),
    )


class PostgresInventoryStore:
    """Row-locked simulator on disposable PostgreSQL only."""

    def __init__(self, session: Session):
        bind = session.get_bind()
        assert_disposable_bind(bind)
        self.session = session

    def add_lot(self, **kwargs) -> IsolatedLot:
        row = IsoLotRow(
            id=kwargs.get("lot_id"),
            depot_id=kwargs["depot_id"],
            product_id=kwargs["product_id"],
            batch_no=kwargs["batch_no"],
            expiry_date=kwargs.get("expiry_date"),
            quantity=D(kwargs["quantity"]),
            available=D(kwargs["available"]),
            reserved=D(kwargs.get("reserved", 0)),
            status=kwargs.get("status", "Unrestricted"),
            product_active=1 if kwargs.get("product_active", True) else 0,
        )
        if D(row.quantity) != D(row.available) + D(row.reserved):
            raise SimulationError("imbalance", "quantity must equal available + reserved")
        self.session.add(row)
        self.session.flush()
        return _row_to_lot(row)

    def _lock_lots(self, lot_ids: Iterable[int]) -> dict[int, IsoLotRow]:
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

    def reserve(
        self,
        *,
        document_kind: DocumentKind,
        document_id: str,
        product_id: int,
        depot_id: int,
        qty: Decimal,
        idempotency_key: str,
        policy: SimulationPolicy,
    ) -> IsolatedReservation:
        existing = (
            self.session.query(IsoReservationRow)
            .filter_by(
                document_kind=document_kind,
                document_id=document_id,
                idempotency_key=idempotency_key,
            )
            .one_or_none()
        )
        if existing:
            return self._load_reservation(existing.id)

        lots = [
            _row_to_lot(row)
            for row in self.session.query(IsoLotRow)
            .filter_by(product_id=product_id, depot_id=depot_id)
            .order_by(IsoLotRow.id)
            .all()
        ]
        slices = plan_fefo(lots, product_id=product_id, depot_id=depot_id, qty=qty, policy=policy)
        locked = self._lock_lots(s.lot_id for s in slices)
        for slice_ in slices:
            row = locked[slice_.lot_id]
            quantity, available, reserved = _reserve_math(row.quantity, row.available, row.reserved, slice_.qty)
            row.quantity, row.available, row.reserved = quantity, available, reserved
        reservation_id = str(uuid4())
        self.session.add(
            IsoReservationRow(
                id=reservation_id,
                document_kind=document_kind,
                document_id=document_id,
                idempotency_key=idempotency_key,
                status="RESERVED",
            )
        )
        for slice_ in slices:
            self.session.add(
                IsoReservationSliceRow(
                    reservation_id=reservation_id,
                    lot_id=slice_.lot_id,
                    qty=slice_.qty,
                    batch_no=slice_.batch_no,
                    expiry_date=slice_.expiry_date,
                    depot_id=slice_.depot_id,
                )
            )
        self.session.flush()
        return IsolatedReservation(
            reservation_id=reservation_id,
            document_kind=document_kind,
            document_id=document_id,
            idempotency_key=idempotency_key,
            status="RESERVED",
            slices=slices,
        )

    def _load_reservation(self, reservation_id: str) -> IsolatedReservation:
        header = self.session.get(IsoReservationRow, reservation_id)
        slices = (
            self.session.query(IsoReservationSliceRow)
            .filter_by(reservation_id=reservation_id)
            .order_by(IsoReservationSliceRow.id)
            .all()
        )
        return IsolatedReservation(
            reservation_id=header.id,
            document_kind=header.document_kind,  # type: ignore[arg-type]
            document_id=header.document_id,
            idempotency_key=header.idempotency_key,
            status=header.status,  # type: ignore[arg-type]
            slices=[
                AllocationSlice(
                    lot_id=row.lot_id,
                    qty=D(row.qty),
                    batch_no=row.batch_no,
                    expiry_date=row.expiry_date,
                    depot_id=row.depot_id,
                )
                for row in slices
            ],
        )

    def release(self, reservation_id: str) -> IsolatedReservation:
        header = (
            self.session.query(IsoReservationRow)
            .filter_by(id=reservation_id)
            .with_for_update()
            .one()
        )
        if header.status == "RELEASED":
            return self._load_reservation(reservation_id)
        if header.status != "RESERVED":
            raise SimulationError("invalid_status", f"Cannot release a {header.status} reservation")
        loaded = self._load_reservation(reservation_id)
        locked = self._lock_lots(s.lot_id for s in loaded.slices)
        for slice_ in loaded.slices:
            row = locked[slice_.lot_id]
            row.available = D(row.available) + slice_.qty
            row.reserved = D(row.reserved) - slice_.qty
        header.status = "RELEASED"
        self.session.flush()
        return self._load_reservation(reservation_id)

    def issue(self, reservation_id: str) -> IsolatedReservation:
        header = (
            self.session.query(IsoReservationRow)
            .filter_by(id=reservation_id)
            .with_for_update()
            .one()
        )
        if header.status == "ISSUED":
            return self._load_reservation(reservation_id)
        if header.status != "RESERVED":
            raise SimulationError("invalid_status", f"Cannot issue a {header.status} reservation")
        loaded = self._load_reservation(reservation_id)
        locked = self._lock_lots(s.lot_id for s in loaded.slices)
        for slice_ in loaded.slices:
            row = locked[slice_.lot_id]
            if D(row.reserved) < slice_.qty:
                raise SimulationError("conflict", "Reserved quantity changed before issue")
            row.quantity = D(row.quantity) - slice_.qty
            row.reserved = D(row.reserved) - slice_.qty
        header.status = "ISSUED"
        self.session.flush()
        return self._load_reservation(reservation_id)

    def transfer_available(self, lot_id: int, qty: Decimal, dest_lot_id: int) -> None:
        need = D(qty)
        locked = self._lock_lots([lot_id, dest_lot_id])
        src, dest = locked[lot_id], locked[dest_lot_id]
        if D(src.available) < need:
            raise SimulationError("insufficient", "Cannot transfer reserved or missing available units")
        src.quantity = D(src.quantity) - need
        src.available = D(src.available) - need
        dest.quantity = D(dest.quantity) + need
        dest.available = D(dest.available) + need
        self.session.flush()


def sqlite_session_factory():
    """In-process SQLite for unit tests of the SQL store without Docker."""
    engine = create_engine("sqlite:///:memory:")
    IsoBase.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False), engine
