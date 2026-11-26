"""F.4D-DEV Gate B isolated fulfillment adapter.

Mounted only through isolated FastAPI routes. Document.status stays Approved.
Lock order: document → fulfillment → reservation → lots (id ascending).
"""
from __future__ import annotations

import hashlib
import json
from datetime import date
from decimal import Decimal
from typing import Literal, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.depot_scope import hide_foreign_depot
from app.models import Employee, ExportDelivery, SampleGiftDelivery
from app.services.draft_document_lock import load_document_for_update
from app.services.isolated_document_reservation import (
    MODEL,
    ensure_isolated_inventory_schema,
    assert_synthetic_inventory_integrity,
)
from app.services.isolated_fulfillment_simulation import (
    FulfillmentActor,
    FulfillmentPolicy,
    IsoFulfillmentAuditRow,
    IsoFulfillmentRow,
    IsolatedFulfillment,
    PostgresFulfillmentStore,
    SimulationError,
)
from app.services.isolated_inventory_simulation import D, IsoReservationRow

DocumentKind = Literal["sample_gift", "export"]
APPROVED = "Approved"
BLOCKED_RELEASE = frozenset({"PICKING", "PICKED", "ISSUED", "DISPATCHED", "DELIVERED", "FAILED_DELIVERY"})


def payload_hash(body: dict) -> str:
    return hashlib.sha256(json.dumps(body, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def _http(exc: SimulationError) -> HTTPException:
    if exc.code == "forbidden":
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=exc.message)
    if exc.code == "not_found":
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if exc.code == "invalid_qty":
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.message)
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message)


def _actor(user: Employee) -> FulfillmentActor:
    return FulfillmentActor(actor_id=user.id, role=(user.role or "user"), depot_id=user.depot_id)


def _store(session: Session) -> PostgresFulfillmentStore:
    ensure_isolated_inventory_schema(session.get_bind())
    return PostgresFulfillmentStore(session, FulfillmentPolicy())


def serialize_fulfillment(row: IsolatedFulfillment) -> dict:
    return {
        "fulfillment_id": row.fulfillment_id,
        "reservation_id": row.reservation_id,
        "document_kind": row.document_kind,
        "document_id": int(row.document_id),
        "depot_id": row.depot_id,
        "status": row.status,
        "issued_quantity": row.issued_qty,
        "dispatch_id": row.dispatch_id,
        "delivery_id": row.delivery_id,
        "transport_ref": row.transport_ref,
        "receiver_name": row.receiver_name,
        "delivered_quantity": row.delivered_qty,
        "pod_ref": row.pod_ref,
        "fail_reason": row.fail_reason,
        "remarks": row.remarks,
        "slices": [
            {
                "lot_id": s.lot_id,
                "batch_no": s.batch_no,
                "expiry_date": s.expiry_date,
                "reserved_quantity": s.reserved_qty,
                "picked_quantity": s.picked_qty,
            }
            for s in row.pick_slices
        ],
    }


def _lock_document(session: Session, document_kind: DocumentKind, document_id: int, user: Employee):
    model = MODEL[document_kind]
    row = load_document_for_update(session, model, document_id)
    hide_foreign_depot(user, row.depot_id)
    return row


def _lock_fulfillment_for_reservation(session: Session, reservation_id: str) -> Optional[IsoFulfillmentRow]:
    return (
        session.query(IsoFulfillmentRow)
        .filter_by(reservation_id=reservation_id)
        .order_by(IsoFulfillmentRow.id)
        .with_for_update()
        .first()
    )


def _active_reservation(session: Session, document_kind: str, document_id: int) -> IsoReservationRow:
    rows = (
        session.query(IsoReservationRow)
        .filter_by(document_kind=document_kind, document_id=str(document_id), status="RESERVED")
        .order_by(IsoReservationRow.id)
        .with_for_update()
        .all()
    )
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Picking requires an active reservation",
        )
    if len(rows) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Multiple active reservations exist for this document",
        )
    return rows[0]


def start_picking_for_document(
    session: Session,
    document_kind: DocumentKind,
    document_id: int,
    user: Employee,
    idempotency_key: str,
) -> dict:
    doc = _lock_document(session, document_kind, document_id, user)
    if (doc.status or "") != APPROVED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot pick a {doc.status} document",
        )
    session.query(IsoFulfillmentRow).filter_by(
        document_kind=document_kind,
        document_id=str(document_id),
    ).order_by(IsoFulfillmentRow.id).with_for_update().all()
    reservation = _active_reservation(session, document_kind, document_id)
    hashed = payload_hash(
        {"document_kind": document_kind, "document_id": document_id, "reservation_id": reservation.id}
    )
    try:
        result = _store(session).start_pick(
            reservation.id,
            _actor(user),
            idempotency_key,
            depot_id=doc.depot_id,
            payload_hash=hashed,
        )
    except SimulationError as exc:
        raise _http(exc) from exc
    return serialize_fulfillment(result)


def get_fulfillment_for_document(
    session: Session,
    document_kind: DocumentKind,
    document_id: int,
    user: Employee,
) -> dict:
    ensure_isolated_inventory_schema(session.get_bind())
    model = MODEL[document_kind]
    row = session.query(model).filter(model.id == document_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    hide_foreign_depot(user, row.depot_id)
    header = (
        session.query(IsoFulfillmentRow)
        .filter_by(document_kind=document_kind, document_id=str(document_id))
        .order_by(IsoFulfillmentRow.created_at.desc(), IsoFulfillmentRow.id.desc())
        .first()
    )
    if header is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    hide_foreign_depot(user, header.depot_id)
    return serialize_fulfillment(_store(session)._load(header.id))


def _prep_action(session: Session, fulfillment_id: str, user: Employee) -> IsoFulfillmentRow:
    ensure_isolated_inventory_schema(session.get_bind())
    header = session.query(IsoFulfillmentRow).filter_by(id=fulfillment_id).first()
    if header is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    kind = header.document_kind
    if kind not in MODEL:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    _lock_document(session, kind, int(header.document_id), user)  # type: ignore[arg-type]
    locked = (
        session.query(IsoFulfillmentRow)
        .filter_by(id=fulfillment_id)
        .with_for_update()
        .first()
    )
    hide_foreign_depot(user, locked.depot_id)
    return locked


def confirm_picking(
    session: Session,
    fulfillment_id: str,
    user: Employee,
    idempotency_key: str,
    slices: list[dict],
) -> dict:
    _prep_action(session, fulfillment_id, user)
    picked = {int(item["lot_id"]): D(item["picked_quantity"]) for item in slices}
    hashed = payload_hash({"slices": sorted(slices, key=lambda s: int(s["lot_id"]))})
    try:
        result = _store(session).confirm_pick(
            fulfillment_id,
            _actor(user),
            picked,
            idempotency_key=idempotency_key,
            payload_hash=hashed,
        )
    except SimulationError as exc:
        raise _http(exc) from exc
    return serialize_fulfillment(result)


def issue_fulfillment(session: Session, fulfillment_id: str, user: Employee, idempotency_key: str) -> dict:
    _prep_action(session, fulfillment_id, user)
    hashed = payload_hash({"fulfillment_id": fulfillment_id})
    try:
        result = _store(session).issue(
            fulfillment_id,
            _actor(user),
            idempotency_key,
            payload_hash=hashed,
        )
    except SimulationError as exc:
        raise _http(exc) from exc
    assert_synthetic_inventory_integrity(session, context=f"issue {fulfillment_id}")
    return serialize_fulfillment(result)


def dispatch_fulfillment(
    session: Session,
    fulfillment_id: str,
    user: Employee,
    idempotency_key: str,
    transport_ref: Optional[str] = None,
    remarks: Optional[str] = None,
) -> dict:
    _prep_action(session, fulfillment_id, user)
    hashed = payload_hash({"transport_ref": transport_ref or "", "remarks": remarks or ""})
    try:
        result = _store(session).dispatch(
            fulfillment_id,
            _actor(user),
            idempotency_key,
            transport_ref=transport_ref,
            remarks=remarks,
            payload_hash=hashed,
        )
    except SimulationError as exc:
        raise _http(exc) from exc
    return serialize_fulfillment(result)


def confirm_delivery_fulfillment(
    session: Session,
    fulfillment_id: str,
    user: Employee,
    idempotency_key: str,
    *,
    receiver_name: Optional[str],
    delivered_quantity: Optional[Decimal],
    confirmation_date: Optional[date],
    pod_ref: Optional[str],
    remarks: Optional[str],
) -> dict:
    _prep_action(session, fulfillment_id, user)
    hashed = payload_hash(
        {
            "receiver_name": receiver_name or "",
            "delivered_quantity": str(delivered_quantity) if delivered_quantity is not None else "",
            "confirmation_date": str(confirmation_date or ""),
            "pod_ref": pod_ref or "",
            "remarks": remarks or "",
        }
    )
    try:
        result = _store(session).confirm_delivery(
            fulfillment_id,
            _actor(user),
            idempotency_key,
            receiver_name=receiver_name,
            delivered_qty=delivered_quantity,
            pod_ref=pod_ref,
            remarks=remarks,
            payload_hash=hashed,
        )
    except SimulationError as exc:
        raise _http(exc) from exc
    return serialize_fulfillment(result)


def fail_delivery_fulfillment(
    session: Session,
    fulfillment_id: str,
    user: Employee,
    idempotency_key: str,
    reason: str,
    remarks: Optional[str] = None,
) -> dict:
    _prep_action(session, fulfillment_id, user)
    hashed = payload_hash({"failed": True, "reason": reason, "remarks": remarks or ""})
    try:
        result = _store(session).confirm_delivery(
            fulfillment_id,
            _actor(user),
            idempotency_key,
            failed=True,
            reason=reason,
            remarks=remarks,
            payload_hash=hashed,
        )
    except SimulationError as exc:
        raise _http(exc) from exc
    return serialize_fulfillment(result)


def fulfillment_history(session: Session, fulfillment_id: str, user: Employee) -> list[dict]:
    header = _prep_action(session, fulfillment_id, user)
    rows = (
        session.query(IsoFulfillmentAuditRow)
        .filter_by(fulfillment_id=header.id)
        .order_by(IsoFulfillmentAuditRow.id)
        .all()
    )
    return [
        {
            "action": row.action,
            "actor_id": row.actor_id,
            "from_status": row.from_status,
            "to_status": row.to_status,
            "created_at": row.created_at,
        }
        for row in rows
    ]


def block_release_if_fulfillment_active(session: Session, reservation_id: str) -> None:
    header = (
        session.query(IsoFulfillmentRow)
        .filter_by(reservation_id=reservation_id)
        .order_by(IsoFulfillmentRow.id)
        .with_for_update()
        .first()
    )
    if header is not None and header.status in BLOCKED_RELEASE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reservation cannot be released during fulfillment",
        )
