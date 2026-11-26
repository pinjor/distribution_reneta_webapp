"""Opening stock request/review. Physical inventory posting is intentionally disabled."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, inspect as sa_inspect
from sqlalchemy.orm import Session, joinedload

from app.core.depot_scope import apply_depot_id_filter, hide_foreign_depot, is_admin
from app.models import Depot, Employee, Product, ProductItemStock, ProductItemStockDetail, StockLedger
from app.models_opening_stock import (
    OpeningStockApprovalHistory,
    OpeningStockRequest,
    OpeningStockRequestItem,
)

STATUSES = ("Draft", "Pending Approval", "Approved", "Rejected")
POSTING_POLICY_MESSAGE = (
    "Opening stock approval is recorded. Physical posting to ProductItemStock, "
    "ProductItemStockDetail and StockLedger is blocked until Finance/Warehouse "
    "signs the inventory source-of-truth and posting design."
)


class OpeningStockError(HTTPException):
    def __init__(self, code: int, error_code: str, message: str):
        super().__init__(status_code=code, detail={"code": error_code, "message": message})


def tables_ready(db: Session) -> bool:
    names = set(sa_inspect(db.bind).get_table_names())
    return "opening_stock_requests" in names


def require_tables(db: Session) -> None:
    if not tables_ready(db):
        raise OpeningStockError(
            503,
            "SCHEMA_NOT_APPLIED",
            "Opening stock tables are not on this database. Apply "
            "`alembic -c alembic_opening_stock.ini upgrade head` on a disposable PostgreSQL database.",
        )


def generate_request_number(db: Session) -> str:
    prefix = f"OS-{date.today().strftime('%Y%m%d')}"
    count = (
        db.query(func.count(OpeningStockRequest.id))
        .filter(OpeningStockRequest.request_number.like(f"{prefix}%"))
        .scalar()
        or 0
    )
    return f"{prefix}-{count + 1:04d}"


def _employee_name(user: Optional[Employee]) -> Optional[str]:
    if not user:
        return None
    return f"{user.first_name} {user.last_name or ''}".strip()


def _qty(item: OpeningStockRequestItem) -> Decimal:
    return Decimal(str(item.quantity or 0))


def serialize(row: OpeningStockRequest, *, detail: bool = False) -> dict:
    items = list(row.items or [])
    payload = {
        "id": row.id,
        "requestNumber": row.request_number,
        "depotId": row.depot_id,
        "depotName": row.depot.name if row.depot else None,
        "depotCode": row.depot.code if row.depot else None,
        "openingDate": row.opening_date.isoformat() if row.opening_date else None,
        "remarks": row.remarks,
        "status": row.status,
        "postingStatus": row.posting_status,
        "postingBlockedReason": row.posting_blocked_reason,
        "productCount": len(items),
        "totalQuantity": int(sum(_qty(i) for i in items)) if all(_qty(i) == _qty(i).to_integral_value() for i in items) else float(sum(_qty(i) for i in items)),
        "requestedBy": row.requested_by,
        "requestedByName": _employee_name(row.requester),
        "requestDate": row.created_at.isoformat() if row.created_at else None,
        "reviewedBy": row.reviewed_by,
        "reviewedByName": _employee_name(row.reviewer),
        "reviewedAt": row.reviewed_at.isoformat() if row.reviewed_at else None,
        "reviewReason": row.review_reason,
        "submittedAt": row.submitted_at.isoformat() if row.submitted_at else None,
    }
    if detail:
        payload["items"] = [
            {
                "id": item.id,
                "productId": item.product_id,
                "productName": item.product.name if item.product else None,
                "productCode": item.product.code if item.product else None,
                "sku": item.product.sku if item.product else None,
                "batchNumber": item.batch_number,
                "manufacturingDate": item.manufacturing_date.isoformat() if item.manufacturing_date else None,
                "expiryDate": item.expiry_date.isoformat() if item.expiry_date else None,
                "quantity": float(_qty(item)),
                "unitOfMeasure": item.unit_of_measure,
                "unitCost": float(item.unit_cost) if item.unit_cost is not None else None,
                "remarks": item.remarks,
            }
            for item in items
        ]
        payload["history"] = [
            {
                "id": h.id,
                "action": h.action,
                "fromStatus": h.from_status,
                "toStatus": h.to_status,
                "actorId": h.actor_id,
                "actorName": _employee_name(h.actor),
                "note": h.note,
                "createdAt": h.created_at.isoformat() if h.created_at else None,
            }
            for h in (row.history or [])
        ]
        payload["inventoryPosted"] = False
    return payload


def _add_history(db: Session, row: OpeningStockRequest, actor: Employee, action: str, to_status: str, note: Optional[str]) -> None:
    db.add(
        OpeningStockApprovalHistory(
            request_id=row.id,
            action=action,
            from_status=row.status,
            to_status=to_status,
            actor_id=actor.id,
            note=note,
            created_at=datetime.utcnow(),
        )
    )


def _parse_date(value: Optional[str], field: str) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError as exc:
        raise OpeningStockError(400, "VALIDATION_ERROR", f"{field} must be YYYY-MM-DD") from exc


def _validate_items(db: Session, depot_id: int, opening_date: date, items: list[dict]) -> list[dict]:
    if not items:
        raise OpeningStockError(400, "VALIDATION_ERROR", "At least one product line is required")
    seen = set()
    cleaned = []
    for raw in items:
        product_id = int(raw.get("productId") or 0)
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise OpeningStockError(400, "PRODUCT_NOT_FOUND", "Product does not exist")
        batch = str(raw.get("batchNumber") or "").strip()
        if not batch:
            raise OpeningStockError(400, "VALIDATION_ERROR", "batchNumber is required")
        key = (product_id, batch)
        if key in seen:
            raise OpeningStockError(400, "DUPLICATE_LINE", "Duplicate product/batch in this request")
        seen.add(key)
        qty = Decimal(str(raw.get("quantity") or 0))
        if qty <= 0:
            raise OpeningStockError(400, "VALIDATION_ERROR", "quantity must be greater than 0")
        expiry = _parse_date(raw.get("expiryDate"), "expiryDate")
        if not expiry:
            raise OpeningStockError(400, "EXPIRY_REQUIRED", "Unknown-expiry batches are not accepted")
        mfg = _parse_date(raw.get("manufacturingDate"), "manufacturingDate")
        if mfg and mfg >= expiry:
            raise OpeningStockError(400, "VALIDATION_ERROR", "manufacturingDate must be before expiryDate")
        if expiry < opening_date:
            raise OpeningStockError(400, "EXPIRED_BATCH", "Expired batches cannot be opened as available stock")
        uom = (raw.get("unitOfMeasure") or product.unit_of_measure or "pcs")
        expected = product.unit_of_measure
        if expected and str(uom).strip() and str(expected).strip() and str(uom).strip().lower() != str(expected).strip().lower():
            raise OpeningStockError(400, "UOM_MISMATCH", f"Unit must match product configuration ({expected})")
        unit_cost = raw.get("unitCost")
        cleaned.append(
            {
                "product_id": product_id,
                "batch_number": batch,
                "manufacturing_date": mfg,
                "expiry_date": expiry,
                "quantity": qty,
                "unit_of_measure": str(uom).strip() if uom else None,
                "unit_cost": Decimal(str(unit_cost)) if unit_cost not in (None, "") else None,
                "remarks": (raw.get("remarks") or None),
            }
        )
    return cleaned


def _history_exists(db: Session, depot_id: int, product_id: int) -> bool:
    if db.query(StockLedger).filter(StockLedger.depot_id == depot_id, StockLedger.product_id == product_id).first():
        return True
    if db.query(ProductItemStock).filter(ProductItemStock.depot_id == depot_id, ProductItemStock.product_id == product_id).first():
        return True
    detail = (
        db.query(ProductItemStockDetail)
        .join(ProductItemStock, ProductItemStock.id == ProductItemStockDetail.item_code)
        .filter(ProductItemStock.depot_id == depot_id, ProductItemStock.product_id == product_id)
        .first()
    )
    return detail is not None


def _blocking_opening(db: Session, depot_id: int, product_id: int, exclude_id: Optional[int] = None) -> Optional[OpeningStockRequest]:
    query = (
        db.query(OpeningStockRequest)
        .join(OpeningStockRequestItem)
        .filter(
            OpeningStockRequest.depot_id == depot_id,
            OpeningStockRequestItem.product_id == product_id,
            OpeningStockRequest.status.in_(("Pending Approval", "Approved")),
        )
    )
    if exclude_id:
        query = query.filter(OpeningStockRequest.id != exclude_id)
    return query.first()


def assert_opening_eligible(db: Session, depot_id: int, items: list[dict], exclude_id: Optional[int] = None) -> None:
    for item in items:
        product_id = item["product_id"] if isinstance(item, dict) and "product_id" in item else item.product_id
        if _history_exists(db, depot_id, product_id):
            raise OpeningStockError(
                409,
                "STOCK_HISTORY_EXISTS",
                "This product already has stock history at the depot. Use receipt or adjustment, not opening stock.",
            )
        blocking = _blocking_opening(db, depot_id, product_id, exclude_id)
        if blocking:
            raise OpeningStockError(
                409,
                "OPENING_ALREADY_EXISTS",
                f"Opening stock already requested or approved as {blocking.request_number}",
            )


def _load(db: Session, request_id: int, user: Employee) -> OpeningStockRequest:
    row = (
        db.query(OpeningStockRequest)
        .options(
            joinedload(OpeningStockRequest.items).joinedload(OpeningStockRequestItem.product),
            joinedload(OpeningStockRequest.depot),
            joinedload(OpeningStockRequest.requester),
            joinedload(OpeningStockRequest.reviewer),
            joinedload(OpeningStockRequest.history).joinedload(OpeningStockApprovalHistory.actor),
        )
        .filter(OpeningStockRequest.id == request_id)
        .first()
    )
    if not row:
        raise OpeningStockError(404, "NOT_FOUND", "Opening stock request not found")
    hide_foreign_depot(user, row.depot_id)
    return row


def _replace_items(db: Session, row: OpeningStockRequest, items: list[dict]) -> None:
    row.items.clear()
    db.flush()
    for item in items:
        row.items.append(OpeningStockRequestItem(**item))


def create_request(db: Session, user: Employee, body: dict) -> dict:
    require_tables(db)
    depot_id = int(body.get("depotId") or 0)
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise OpeningStockError(400, "DEPOT_NOT_FOUND", "Depot does not exist")
    if not is_admin(user):
        if not user.depot_id or user.depot_id != depot_id:
            raise OpeningStockError(403, "FOREIGN_DEPOT", "You cannot create opening stock for another depot")
    opening_date = _parse_date(body.get("openingDate"), "openingDate") or date.today()
    items = _validate_items(db, depot_id, opening_date, body.get("items") or [])
    assert_opening_eligible(db, depot_id, items)
    row = OpeningStockRequest(
        request_number=generate_request_number(db),
        depot_id=depot_id,
        opening_date=opening_date,
        remarks=body.get("remarks"),
        status="Draft",
        posting_status="not_posted",
        posting_blocked_reason=POSTING_POLICY_MESSAGE,
        requested_by=user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(row)
    db.flush()
    _replace_items(db, row, items)
    _add_history(db, row, user, "created", "Draft", None)
    db.commit()
    return serialize(_load(db, row.id, user), detail=True)


def patch_request(db: Session, user: Employee, request_id: int, body: dict) -> dict:
    require_tables(db)
    row = _load(db, request_id, user)
    if row.status != "Draft":
        raise OpeningStockError(409, "ILLEGAL_STATUS", "Only Draft requests can be edited")
    if row.requested_by != user.id and not is_admin(user):
        raise OpeningStockError(403, "FORBIDDEN", "You can only edit your own drafts")
    if body.get("openingDate"):
        row.opening_date = _parse_date(body.get("openingDate"), "openingDate")
    if "remarks" in body:
        row.remarks = body.get("remarks")
    if "depotId" in body:
        depot_id = int(body.get("depotId") or 0)
        hide_foreign_depot(user, depot_id)
        if not is_admin(user) and user.depot_id != depot_id:
            raise OpeningStockError(403, "FOREIGN_DEPOT", "You cannot move this request to another depot")
        row.depot_id = depot_id
    if "items" in body:
        items = _validate_items(db, row.depot_id, row.opening_date, body.get("items") or [])
        assert_opening_eligible(db, row.depot_id, items, exclude_id=row.id)
        _replace_items(db, row, items)
    row.updated_at = datetime.utcnow()
    _add_history(db, row, user, "patched", "Draft", None)
    db.commit()
    return serialize(_load(db, row.id, user), detail=True)


def submit_request(db: Session, user: Employee, request_id: int) -> dict:
    require_tables(db)
    row = _load(db, request_id, user)
    if row.status != "Draft":
        raise OpeningStockError(409, "ILLEGAL_STATUS", "Only Draft requests can be submitted")
    if row.requested_by != user.id and not is_admin(user):
        raise OpeningStockError(403, "FORBIDDEN", "You can only submit your own drafts")
    if not row.items:
        raise OpeningStockError(400, "VALIDATION_ERROR", "Add at least one product line before submit")
    items = [
        {
            "product_id": i.product_id,
            "batch_number": i.batch_number,
            "quantity": i.quantity,
            "expiry_date": i.expiry_date.isoformat(),
            "manufacturing_date": i.manufacturing_date.isoformat() if i.manufacturing_date else None,
            "unitOfMeasure": i.unit_of_measure,
            "productId": i.product_id,
            "batchNumber": i.batch_number,
            "expiryDate": i.expiry_date.isoformat(),
        }
        for i in row.items
    ]
    _validate_items(db, row.depot_id, row.opening_date, items)
    assert_opening_eligible(db, row.depot_id, [{"product_id": i.product_id} for i in row.items], exclude_id=row.id)
    _add_history(db, row, user, "submitted", "Pending Approval", None)
    row.status = "Pending Approval"
    row.submitted_at = datetime.utcnow()
    row.updated_at = datetime.utcnow()
    db.commit()
    return serialize(_load(db, row.id, user), detail=True)


def approve_request(db: Session, user: Employee, request_id: int) -> dict:
    require_tables(db)
    if not is_admin(user):
        raise OpeningStockError(403, "APPROVAL_FORBIDDEN", "Only admin may approve opening stock until policy is signed")
    query = db.query(OpeningStockRequest).filter(OpeningStockRequest.id == request_id)
    if db.bind and db.bind.dialect.name != "sqlite":
        query = query.with_for_update()
    locked = query.first()
    if not locked:
        raise OpeningStockError(404, "NOT_FOUND", "Opening stock request not found")
    hide_foreign_depot(user, locked.depot_id)
    if locked.status == "Approved":
        return serialize(_load(db, locked.id, user), detail=True)
    if locked.status != "Pending Approval":
        raise OpeningStockError(409, "ILLEGAL_STATUS", "Only Pending Approval requests can be approved")
    if locked.requested_by == user.id:
        raise OpeningStockError(403, "SELF_APPROVAL_BLOCKED", "You cannot approve your own opening stock request")
    row = _load(db, request_id, user)
    items_as_dicts = [{"product_id": i.product_id} for i in row.items]
    assert_opening_eligible(db, row.depot_id, items_as_dicts, exclude_id=row.id)
    _add_history(db, row, user, "approved", "Approved", POSTING_POLICY_MESSAGE)
    row.status = "Approved"
    row.posting_status = "not_posted"
    row.posting_blocked_reason = POSTING_POLICY_MESSAGE
    row.reviewed_by = user.id
    row.reviewed_at = datetime.utcnow()
    row.updated_at = datetime.utcnow()
    db.commit()
    return serialize(_load(db, row.id, user), detail=True)


def reject_request(db: Session, user: Employee, request_id: int, reason: str) -> dict:
    require_tables(db)
    if not is_admin(user):
        raise OpeningStockError(403, "APPROVAL_FORBIDDEN", "Only admin may reject opening stock until policy is signed")
    reason = (reason or "").strip()
    if not reason:
        raise OpeningStockError(400, "VALIDATION_ERROR", "Rejection reason is required")
    row = _load(db, request_id, user)
    if row.status != "Pending Approval":
        raise OpeningStockError(409, "ILLEGAL_STATUS", "Only Pending Approval requests can be rejected")
    if row.requested_by == user.id:
        raise OpeningStockError(403, "SELF_APPROVAL_BLOCKED", "You cannot reject your own opening stock request")
    _add_history(db, row, user, "rejected", "Rejected", reason)
    row.status = "Rejected"
    row.review_reason = reason
    row.reviewed_by = user.id
    row.reviewed_at = datetime.utcnow()
    row.updated_at = datetime.utcnow()
    db.commit()
    return serialize(_load(db, row.id, user), detail=True)


def list_requests(
    db: Session,
    user: Employee,
    *,
    status_filter: Optional[str],
    depot_id: Optional[int],
    q: Optional[str],
    skip: int,
    limit: int,
    date_from=None,
    date_to=None,
) -> dict:
    require_tables(db)
    query = db.query(OpeningStockRequest)
    query = apply_depot_id_filter(query, user, OpeningStockRequest.depot_id)
    if status_filter and status_filter not in ("all", "All"):
        query = query.filter(OpeningStockRequest.status == status_filter)
    if depot_id:
        query = query.filter(OpeningStockRequest.depot_id == depot_id)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(OpeningStockRequest.request_number.ilike(like))
    if date_from:
        query = query.filter(OpeningStockRequest.opening_date >= date_from)
    if date_to:
        query = query.filter(OpeningStockRequest.opening_date <= date_to)
    total = query.count()
    rows = (
        query.options(
            joinedload(OpeningStockRequest.items),
            joinedload(OpeningStockRequest.depot),
            joinedload(OpeningStockRequest.requester),
            joinedload(OpeningStockRequest.reviewer),
        )
        .order_by(OpeningStockRequest.created_at.desc())
        .offset(skip)
        .limit(min(limit, 100))
        .all()
    )
    return {"total": total, "items": [serialize(row) for row in rows]}


def summary(db: Session, user: Employee) -> dict:
    require_tables(db)
    query = apply_depot_id_filter(db.query(OpeningStockRequest), user, OpeningStockRequest.depot_id)
    rows = query.all()
    counts = {"total": len(rows), "draft": 0, "pendingApproval": 0, "approved": 0, "rejected": 0}
    for row in rows:
        if row.status == "Draft":
            counts["draft"] += 1
        elif row.status == "Pending Approval":
            counts["pendingApproval"] += 1
        elif row.status == "Approved":
            counts["approved"] += 1
        elif row.status == "Rejected":
            counts["rejected"] += 1
    return counts


def get_request(db: Session, user: Employee, request_id: int) -> dict:
    require_tables(db)
    return serialize(_load(db, request_id, user), detail=True)
