from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models import Customer, Employee, Order, OrderItem, Product
from app.models_logicollect import (
    LcChemist,
    LcDeposit,
    LcIdempotency,
    LcMemoLine,
    LcMemoState,
    LcMovement,
    LcPerformanceTarget,
    LcReturnLine,
    LcReturnMemo,
    LcRouteVisit,
    LcWallet,
)
from app.services.logicollect.errors import LcError
from app.services.logicollect.util import (
    D,
    ZERO,
    business_date,
    iso_dt,
    next_business_day,
    now_dhaka,
    parse_date,
    payload_hash,
    require_int_bdt,
)

DELIVERED_STATUSES = {"fullDelivered", "partialDelivered"}
TERMINAL_DELIVERY = {"fullDelivered", "partialDelivered", "postponed", "canceled"}


def _lock_wallet(db: Session, employee_id: int, *, for_update: bool = True) -> LcWallet:
    query = db.query(LcWallet).filter(LcWallet.employee_id == employee_id)
    if for_update:
        query = query.with_for_update()
    row = query.first()
    if not row:
        row = LcWallet(employee_id=employee_id)
        db.add(row)
        db.flush()
        query = db.query(LcWallet).filter(LcWallet.employee_id == employee_id)
        if for_update:
            query = query.with_for_update()
        row = query.first()
    return row


def _lock_order(db: Session, order: Order) -> Order:
    return db.query(Order).filter(Order.id == order.id).with_for_update().first()


def _lock_state(db: Session, order_id: int) -> Optional[LcMemoState]:
    return db.query(LcMemoState).filter(LcMemoState.order_id == order_id).with_for_update().first()


def unit_price(item: OrderItem) -> Decimal:
    return D(item.unit_price if item.unit_price is not None else item.trade_price)


def ordered_qty(item: OrderItem) -> Decimal:
    return D(item.total_quantity if item.total_quantity is not None else item.quantity)


def public_id(order: Order) -> str:
    if order.memo_number:
        return order.memo_number
    return f"ORD-{order.id}"


def resolve_order(db: Session, user: Employee, memo_id: str) -> Order:
    ident = (memo_id or "").strip()
    order = None
    if ident.upper().startswith("ORD-") and ident[4:].isdigit():
        order = db.query(Order).filter(Order.id == int(ident[4:])).first()
    if order is None:
        order = db.query(Order).filter(Order.memo_number == ident).first()
    if order is None and ident.isdigit():
        order = db.query(Order).filter(Order.id == int(ident)).first()
    if order is None or order.assigned_to != user.id:
        raise LcError(404, "NOT_FOUND", "Not found")
    return order


def eligible_base(db: Session, user: Employee):
    return (
        db.query(Order)
        .filter(Order.assigned_to == user.id)
        .filter(Order.loaded.is_(True))
        .filter(Order.loading_number.isnot(None))
    )


def ensure_state(db: Session, order: Order, user: Employee) -> LcMemoState:
    row = db.query(LcMemoState).filter(LcMemoState.order_id == order.id).first()
    if row:
        if row.employee_id != user.id:
            raise LcError(404, "NOT_FOUND", "Not found")
        return row
    row = LcMemoState(
        order_id=order.id,
        employee_id=user.id,
        status="pending",
        payment_status="due",
        paid_amount=ZERO,
        delivered_amount=ZERO,
        updated_at=now_dhaka(),
    )
    db.add(row)
    db.flush()
    return row


def _storage_for_item(db: Session, item: OrderItem) -> str:
    product = None
    if item.product_code:
        product = db.query(Product).filter(Product.code == item.product_code).first()
        if not product:
            product = db.query(Product).filter(or_(Product.old_code == item.product_code, Product.new_code == item.product_code)).first()
    if product and product.cold_chain_available:
        return "coldChain"
    return "general"


def _customer(db: Session, order: Order) -> Optional[Customer]:
    if not order.customer_id:
        return None
    if str(order.customer_id).isdigit():
        found = db.query(Customer).filter(Customer.id == int(order.customer_id)).first()
        if found:
            return found
    return db.query(Customer).filter(Customer.code == order.customer_id).first()


def _credit_block(db: Session, order: Order, user: Employee) -> Optional[dict]:
    chemist = (
        db.query(LcChemist)
        .filter(LcChemist.employee_id == user.id)
        .filter(
            or_(
                LcChemist.legacy_code == (order.customer_code or ""),
                LcChemist.phone == _customer_phone(db, order),
            )
        )
        .first()
    )
    cust = _customer(db, order)
    amount = ZERO
    due = None
    legacy = order.customer_code
    if cust and cust.credit_limit is not None:
        amount = D(cust.credit_limit)
    if chemist:
        legacy = chemist.legacy_code
    state = db.query(LcMemoState).filter_by(order_id=order.id).first()
    if state and state.credit_due_at:
        due = state.credit_due_at.isoformat()
        amount = amount or D(state.delivered_amount) - D(state.paid_amount)
    if amount <= ZERO and not due:
        return None
    overdue = False
    if due:
        overdue = parse_date(due) < business_date()
    try:
        credit_amount = require_int_bdt(amount, "creditAmount")
    except LcError:
        credit_amount = 0
    return {
        "legacyCode": legacy or "",
        "creditAmount": credit_amount,
        "dueDate": due or business_date().isoformat(),
        "overdue": overdue,
    }


def _customer_phone(db: Session, order: Order) -> Optional[str]:
    cust = _customer(db, order)
    return (cust.phone if cust else None)


def _customer_address(db: Session, order: Order) -> Optional[str]:
    cust = _customer(db, order)
    if not cust:
        return None
    parts = [cust.address, cust.city, cust.state]
    return ", ".join(p for p in parts if p)


def collectible_due(state: LcMemoState) -> Decimal:
    if state.status not in DELIVERED_STATUSES:
        return ZERO
    if state.payment_status == "canceled":
        return ZERO
    return max(ZERO, D(state.delivered_amount) - D(state.paid_amount))


def needs_collection(state: LcMemoState) -> bool:
    if state.status not in DELIVERED_STATUSES:
        return False
    if state.payment_status in ("canceled", "fullCollected"):
        return False
    due = collectible_due(state)
    if due <= ZERO:
        return False
    if state.payment_status in ("due", "partialCollected"):
        return True
    if state.payment_status == "postponed" and state.credit_due_at and state.credit_due_at <= business_date():
        return True
    return False


def serialize_memo(db: Session, order: Order, user: Employee, *, detail: bool = False) -> dict:
    state = ensure_state(db, order, user)
    items = list(order.items or [])
    total = ZERO
    for item in items:
        total += ordered_qty(item) * unit_price(item)
    paid = D(state.paid_amount)
    delivered_amt = D(state.delivered_amount)
    due = collectible_due(state)
    balance = max(ZERO, delivered_amt - paid) if state.status in DELIVERED_STATUSES else max(ZERO, total - paid)
    body = {
        "id": public_id(order),
        "invoiceNo": order.memo_number or public_id(order),
        "customerId": order.customer_id,
        "customerName": order.customer_name,
        "customerPhone": _customer_phone(db, order),
        "customerAddress": _customer_address(db, order),
        "assignedTo": user.employee_id,
        "route": order.route_name or order.route_code,
        "status": state.status,
        "paymentStatus": state.payment_status,
        "totalAmount": require_int_bdt(total, "totalAmount"),
        "paidAmount": require_int_bdt(paid, "paidAmount"),
        "balanceDue": require_int_bdt(balance, "balanceDue"),
        "deliveredAmount": require_int_bdt(delivered_amt, "deliveredAmount"),
        "collectibleDue": require_int_bdt(due, "collectibleDue"),
        "checkedInAt": iso_dt(state.checked_in_at),
        "deliveredAt": iso_dt(state.delivered_at),
        "creditDueAt": state.credit_due_at.isoformat() if state.credit_due_at else None,
        "createdAt": iso_dt(order.created_at.replace(tzinfo=now_dhaka().tzinfo) if order.created_at and order.created_at.tzinfo is None else order.created_at),
        "itemCount": len(items),
    }
    if not detail:
        return body
    line_rows = {r.order_item_id: r for r in db.query(LcMemoLine).filter_by(order_id=order.id).all()}
    lines = []
    for item in items:
        row = line_rows.get(item.id)
        dq = D(row.delivered_qty) if row else ZERO
        lines.append(
            {
                "id": str(item.id),
                "name": item.product_name,
                "orderedQty": require_int_bdt(ordered_qty(item), "orderedQty"),
                "deliveredQty": require_int_bdt(dq, "deliveredQty"),
                "unit": item.pack_size or "pcs",
                "unitPrice": require_int_bdt(unit_price(item), "unitPrice"),
                "storageCondition": _storage_for_item(db, item),
            }
        )
    body["items"] = lines
    body["estimatedDeliveryTime"] = 30
    body["credit"] = _credit_block(db, order, user)
    return body


def list_memos(
    db: Session,
    user: Employee,
    statuses: Optional[list[str]] = None,
    payment_status: Optional[str] = None,
    needs: bool = False,
    from_d: Optional[date] = None,
    to_d: Optional[date] = None,
):
    orders = eligible_base(db, user).options(joinedload(Order.items)).order_by(Order.id.asc()).all()
    out = []
    for order in orders:
        state = ensure_state(db, order, user)
        if statuses and state.status not in statuses:
            continue
        if payment_status and state.payment_status != payment_status:
            continue
        if needs and not needs_collection(state):
            continue
        if from_d or to_d:
            delivered = state.delivered_at
            if not delivered:
                continue
            day = delivered.date() if hasattr(delivered, "date") else delivered
            if from_d and day < from_d:
                continue
            if to_d and day > to_d:
                continue
        out.append(serialize_memo(db, order, user, detail=False))
    return out


def accept_one(db: Session, user: Employee, memo_id: str, *, skip_missing: bool = False) -> Optional[dict]:
    try:
        order = resolve_order(db, user, memo_id)
    except LcError:
        if skip_missing:
            return None
        raise
    _lock_wallet(db, user.id, for_update=True)
    order = _lock_order(db, order)
    state = ensure_state(db, order, user)
    state = _lock_state(db, order.id)
    if state.status != "pending":
        if skip_missing:
            return None
        raise LcError(409, "ILLEGAL_STATUS", "Memo is not pending")
    state.status = "accepted"
    state.updated_at = now_dhaka()
    order.mobile_accepted = True
    order.mobile_accepted_by = user.employee_id
    order.mobile_accepted_at = now_dhaka().replace(tzinfo=None)
    _ensure_visit(db, user, order, "pending")
    return serialize_memo(db, order, user, detail=True)


def accept_batch(db: Session, user: Employee, ids: list[str]) -> dict:
    accepted = []
    for memo_id in ids:
        result = accept_one(db, user, memo_id, skip_missing=True)
        if result:
            accepted.append(result["id"])
    return {"accepted": accepted}


def _ensure_visit(db: Session, user: Employee, order: Order, stop_status: str) -> LcRouteVisit:
    day = business_date()
    visit = (
        db.query(LcRouteVisit)
        .filter_by(employee_id=user.id, business_date=day, order_id=order.id)
        .with_for_update()
        .first()
    )
    if not visit:
        seq = (
            db.query(LcRouteVisit)
            .filter_by(employee_id=user.id, business_date=day)
            .count()
        ) + 1
        visit = LcRouteVisit(
            employee_id=user.id,
            business_date=day,
            order_id=order.id,
            sequence=seq,
            stop_status=stop_status,
        )
        db.add(visit)
        db.flush()
        return visit
    visit.stop_status = stop_status
    return visit


def idempotent(db: Session, user: Employee, key: Optional[str], operation: str, payload: dict, runner):
    if not key:
        return runner()
    stored_key = f"{user.id}:{operation}:{key}"
    existing = db.query(LcIdempotency).filter(LcIdempotency.key == stored_key).with_for_update().first()
    digest = payload_hash(payload)
    if existing:
        if existing.payload_hash != digest:
            raise LcError(409, "IDEMPOTENCY_CONFLICT", "Idempotency key reused with a different payload")
        return json.loads(existing.response_json)
    result = runner()
    db.add(
        LcIdempotency(
            key=stored_key,
            employee_id=user.id,
            operation=operation,
            payload_hash=digest,
            status_code=200,
            response_json=json.dumps(result, default=str),
            created_at=now_dhaka(),
        )
    )
    return result


def check_in(db: Session, user: Employee, memo_id: str, idem_key: Optional[str]) -> dict:
    def run():
        order = resolve_order(db, user, memo_id)
        _lock_wallet(db, user.id, for_update=True)
        order = _lock_order(db, order)
        state = ensure_state(db, order, user)
        state = _lock_state(db, order.id)
        if state.status == "pending":
            raise LcError(409, "MEMO_NOT_ACCEPTED", "Accept the memo before check-in.")
        if state.status in TERMINAL_DELIVERY:
            raise LcError(409, "ILLEGAL_STATUS", "Memo is no longer awaiting check-in")
        now = now_dhaka()
        if state.checked_in_at is None:
            state.checked_in_at = now
        visit = _ensure_visit(db, user, order, "checkedIn")
        visit.checked_in_at = state.checked_in_at
        visit.stop_status = "checkedIn"
        state.updated_at = now
        return serialize_memo(db, order, user, detail=True)

    return idempotent(db, user, idem_key, "check-in", {"id": memo_id}, run)


def deliver(db: Session, user: Employee, memo_id: str, body: dict, idem_key: Optional[str]) -> dict:
    def run():
        order = resolve_order(db, user, memo_id)
        _lock_wallet(db, user.id, for_update=True)
        order = _lock_order(db, order)
        state = ensure_state(db, order, user)
        state = _lock_state(db, order.id)
        if state.status == "pending":
            raise LcError(409, "MEMO_NOT_ACCEPTED", "Check in before delivery.")
        if state.status in {"postponed", "canceled"}:
            raise LcError(409, "ILLEGAL_STATUS", "Memo cannot be delivered")
        if state.checked_in_at is None:
            raise LcError(409, "MEMO_NOT_ACCEPTED", "Check in before delivery.")
        if state.status in DELIVERED_STATUSES:
            raise LcError(409, "ILLEGAL_STATUS", "Memo already delivered")
        dtype = (body.get("type") or "").strip()
        if dtype not in ("full", "partial"):
            raise LcError(400, "VALIDATION_ERROR", "type must be full or partial")
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        by_id = {str(i.id): i for i in items}
        requested = {str(x.get("id")): x for x in (body.get("items") or [])}
        delivered_total = ZERO
        full_all = True
        any_positive = False
        for item in items:
            if dtype == "full":
                qty = ordered_qty(item)
                reason = None
            else:
                spec = requested.get(str(item.id))
                if spec is None:
                    raise LcError(400, "VALIDATION_ERROR", "Every line requires a deliveredQty")
                qty = D(spec.get("deliveredQty"))
                if qty < ZERO or qty > ordered_qty(item):
                    raise LcError(400, "VALIDATION_ERROR", "deliveredQty must be between 0 and orderedQty")
                reason = spec.get("shortReason")
                if qty < ordered_qty(item) and not reason:
                    raise LcError(400, "VALIDATION_ERROR", "shortReason is required for incomplete lines")
            if qty > ZERO:
                any_positive = True
            if qty != ordered_qty(item):
                full_all = False
            delivered_total += qty * unit_price(item)
            row = db.query(LcMemoLine).filter_by(order_item_id=item.id).first()
            if not row:
                row = LcMemoLine(order_id=order.id, order_item_id=item.id)
                db.add(row)
            row.delivered_qty = qty
            row.short_reason = reason
        db.flush()
        if dtype == "partial" and not any_positive:
            raise LcError(400, "VALIDATION_ERROR", "At least one line must have deliveredQty greater than 0")
        now = now_dhaka()
        state.delivered_amount = delivered_total
        state.delivered_at = now
        state.status = "fullDelivered" if dtype == "full" or full_all else "partialDelivered"
        if D(state.paid_amount) <= ZERO:
            state.payment_status = "due"
        due = collectible_due(state)
        if due <= ZERO:
            state.payment_status = "fullCollected"
        visit = _ensure_visit(db, user, order, "delivered")
        visit.stop_status = "delivered"
        visit.delivered_at = now
        _sync_return_lines(db, user, order)
        state.updated_at = now
        return serialize_memo(db, order, user, detail=True)

    return idempotent(db, user, idem_key, "deliver", {"id": memo_id, **body}, run)


def postpone_delivery(db: Session, user: Employee, memo_id: str, reason: str, idem_key: Optional[str]) -> dict:
    if not (reason or "").strip():
        raise LcError(400, "VALIDATION_ERROR", "reason is required")

    def run():
        order = resolve_order(db, user, memo_id)
        _lock_wallet(db, user.id, for_update=True)
        order = _lock_order(db, order)
        state = ensure_state(db, order, user)
        state = _lock_state(db, order.id)
        if state.status in DELIVERED_STATUSES:
            raise LcError(409, "ILLEGAL_STATUS", "Delivered memo cannot be postponed")
        state.status = "postponed"
        state.postpone_reason = reason.strip()
        visit = _ensure_visit(db, user, order, "postponed")
        visit.stop_status = "postponed"
        state.updated_at = now_dhaka()
        return serialize_memo(db, order, user, detail=True)

    return idempotent(db, user, idem_key, "postpone", {"id": memo_id, "reason": reason}, run)


def cancel_delivery(db: Session, user: Employee, memo_id: str, reason: str, idem_key: Optional[str]) -> dict:
    if not (reason or "").strip():
        raise LcError(400, "VALIDATION_ERROR", "reason is required")

    def run():
        order = resolve_order(db, user, memo_id)
        _lock_wallet(db, user.id, for_update=True)
        order = _lock_order(db, order)
        state = ensure_state(db, order, user)
        state = _lock_state(db, order.id)
        if state.status in DELIVERED_STATUSES:
            raise LcError(409, "ILLEGAL_STATUS", "Delivered memo cannot be canceled")
        state.status = "canceled"
        state.cancel_reason = reason.strip()
        visit = _ensure_visit(db, user, order, "canceled")
        visit.stop_status = "canceled"
        state.updated_at = now_dhaka()
        return serialize_memo(db, order, user, detail=True)

    return idempotent(db, user, idem_key, "cancel", {"id": memo_id, "reason": reason}, run)


def today_route(db: Session, user: Employee) -> dict:
    day = business_date()
    orders = eligible_base(db, user).order_by(Order.route_code.asc(), Order.id.asc()).all()
    stops = []
    route_name = None
    for index, order in enumerate(orders, start=1):
        state = ensure_state(db, order, user)
        visit = _ensure_visit(db, user, order, _stop_from_memo(state))
        route_name = route_name or order.route_name or order.route_code or "Today"
        stops.append(
            {
                "id": f"DP{order.id}",
                "sequence": visit.sequence or index,
                "name": order.customer_name,
                "address": _customer_address(db, order),
                "phone": _customer_phone(db, order),
                "memoId": public_id(order),
                "invoiceNo": order.memo_number or public_id(order),
                "distanceFromPreviousKm": 0,
                "estimatedMinutes": 0,
                "status": visit.stop_status,
                "checkedInAt": iso_dt(visit.checked_in_at or state.checked_in_at),
                "deliveredAt": iso_dt(visit.delivered_at or state.delivered_at),
            }
        )
    stops.sort(key=lambda s: s["sequence"])
    return {
        "id": f"RT-{day.isoformat()}-{user.employee_id}",
        "name": route_name or "Today",
        "stops": stops,
    }


def _stop_from_memo(state: LcMemoState) -> str:
    if state.status in DELIVERED_STATUSES:
        return "delivered"
    if state.status == "postponed":
        return "postponed"
    if state.status == "canceled":
        return "canceled"
    if state.checked_in_at:
        return "checkedIn"
    return "pending"


def wallet_snapshot(db: Session, user: Employee) -> dict:
    wallet = _lock_wallet(db, user.id, for_update=False)
    return {
        "userId": user.employee_id,
        "totalCollected": require_int_bdt(wallet.total_collected, "totalCollected"),
        "totalDeposited": require_int_bdt(wallet.total_deposited, "totalDeposited"),
        "currentBalance": require_int_bdt(wallet.cash_balance, "currentBalance"),
        "cashBalance": require_int_bdt(wallet.cash_balance, "cashBalance"),
        "creditBalance": require_int_bdt(wallet.credit_balance, "creditBalance"),
    }


def collect(db: Session, user: Employee, memo_id: str, body: dict, idem_key: Optional[str]) -> dict:
    def run():
        order = resolve_order(db, user, memo_id)
        wallet = _lock_wallet(db, user.id, for_update=True)
        order = _lock_order(db, order)
        state = ensure_state(db, order, user)
        state = _lock_state(db, order.id)
        if state.status not in DELIVERED_STATUSES:
            raise LcError(409, "ILLEGAL_STATUS", "Collect is only allowed after delivery")
        if state.payment_status == "fullCollected":
            raise LcError(409, "ALREADY_COLLECTED", "Nothing left to collect")
        if state.payment_status == "canceled":
            raise LcError(409, "ILLEGAL_STATUS", "Collection was canceled")
        ctype = (body.get("type") or "").strip()
        mode = (body.get("mode") or "").strip() or None
        due = collectible_due(state)
        now = now_dhaka()
        if ctype == "full" and mode == "cash":
            if due <= ZERO:
                raise LcError(409, "ALREADY_COLLECTED", "Nothing left to collect")
            amt = due
            state.paid_amount = D(state.paid_amount) + amt
            state.payment_status = "fullCollected"
            state.credit_due_at = None
            wallet.cash_balance = D(wallet.cash_balance) + amt
            wallet.total_collected = D(wallet.total_collected) + amt
            if D(wallet.credit_balance) > ZERO:
                wallet.credit_balance = max(ZERO, D(wallet.credit_balance) - amt)
            _add_movement(db, user, "collect", amt, "cash", order, "Full cash")
        elif ctype == "partial" and mode == "cash":
            amt = D(body.get("amount"))
            if amt <= ZERO or amt >= due:
                raise LcError(400, "VALIDATION_ERROR", "amount must be greater than 0 and less than collectibleDue")
            state.paid_amount = D(state.paid_amount) + amt
            left = collectible_due(state)
            state.payment_status = "fullCollected" if left <= ZERO else "partialCollected"
            wallet.cash_balance = D(wallet.cash_balance) + amt
            wallet.total_collected = D(wallet.total_collected) + amt
            _add_movement(db, user, "collect", amt, "cash", order, "Partial cash")
        elif ctype == "full" and mode == "credit":
            due_at = parse_date(body.get("creditDueAt"))
            if not due_at or due_at < business_date():
                raise LcError(400, "VALIDATION_ERROR", "creditDueAt must be today or later")
            state.payment_status = "postponed"
            state.credit_due_at = due_at
            wallet.credit_balance = D(wallet.credit_balance) + due
            _add_movement(db, user, "collect", due, "credit", order, "Credit promise")
        elif ctype == "postpone":
            reason = (body.get("reason") or "").strip()
            if not reason:
                raise LcError(400, "VALIDATION_ERROR", "reason is required")
            state.payment_status = "postponed"
            state.credit_due_at = next_business_day()
            state.collection_postpone_reason = reason
        elif ctype == "cancel":
            state.payment_status = "canceled"
        else:
            raise LcError(400, "VALIDATION_ERROR", "Unsupported collection type")
        wallet.version += 1
        state.updated_at = now
        return {"memo": serialize_memo(db, order, user, detail=True), "wallet": wallet_snapshot(db, user)}

    return idempotent(db, user, idem_key, "collect", {"id": memo_id, **body}, run)


def _add_movement(db: Session, user: Employee, kind: str, amount: Decimal, mode: Optional[str], order: Optional[Order], note: str, deposit_id: Optional[str] = None):
    db.add(
        LcMovement(
            id=str(uuid4()),
            employee_id=user.id,
            kind=kind,
            amount=amount,
            payment_mode=mode,
            order_id=order.id if order else None,
            deposit_id=deposit_id,
            note=note,
            created_at=now_dhaka(),
        )
    )


def list_movements(db: Session, user: Employee, kind: str) -> list:
    rows = (
        db.query(LcMovement)
        .filter(LcMovement.employee_id == user.id, LcMovement.kind == kind)
        .order_by(LcMovement.created_at.desc())
        .all()
    )
    out = []
    for row in rows:
        order = db.query(Order).filter(Order.id == row.order_id).first() if row.order_id else None
        out.append(
            {
                "id": row.id,
                "invoiceId": public_id(order) if order else None,
                "invoiceNo": order.memo_number if order else None,
                "amount": require_int_bdt(row.amount, "amount"),
                "paymentMode": row.payment_mode,
                "collectedAt": iso_dt(row.created_at) if kind == "collect" else None,
                "depositedAt": iso_dt(row.created_at) if kind == "deposit" else None,
                "note": row.note,
            }
        )
    return out


def create_deposit(db: Session, user: Employee, method: str, amount: int, transaction_id: str, file_bytes: Optional[bytes], filename: Optional[str], idem_key: Optional[str]) -> dict:
    method = (method or "").lower()
    if method not in ("brac", "bkash", "rocket"):
        raise LcError(400, "VALIDATION_ERROR", "method must be brac, bkash or rocket")
    if amount <= 0:
        raise LcError(400, "VALIDATION_ERROR", "amount must be greater than 0")
    if not (transaction_id or "").strip():
        raise LcError(400, "VALIDATION_ERROR", "transactionId is required")

    def run():
        from app.models_logicollect import LcMedia
        from app.services.logicollect.auth import MAX_PHOTO

        wallet = _lock_wallet(db, user.id, for_update=True)
        cash = D(wallet.cash_balance)
        amt = D(amount)
        if amt > cash:
            raise LcError(400, "DEPOSIT_EXCEEDS_CASH", "amount cannot exceed cash on hand")
        txn = transaction_id.strip()
        if db.query(LcDeposit).filter_by(employee_id=user.id, transaction_id=txn).first():
            raise LcError(409, "DUPLICATE_TRANSACTION", "transactionId already used")
        media_id = None
        if file_bytes:
            if len(file_bytes) > MAX_PHOTO:
                raise LcError(400, "FILE_TOO_LARGE", "Receipt must be 2 MB or smaller")
            media = LcMedia(
                id=str(uuid4()),
                owner_employee_id=user.id,
                kind="deposit",
                content_type="application/octet-stream",
                original_name=filename,
                data=file_bytes,
                created_at=now_dhaka(),
            )
            db.add(media)
            media_id = media.id
        dep = LcDeposit(
            id=str(uuid4()),
            employee_id=user.id,
            method=method,
            amount=amt,
            transaction_id=txn,
            media_id=media_id,
            created_at=now_dhaka(),
        )
        db.add(dep)
        try:
            db.flush()
        except IntegrityError as exc:
            raise LcError(409, "DUPLICATE_TRANSACTION", "transactionId already used") from exc
        wallet.cash_balance = cash - amt
        wallet.total_deposited = D(wallet.total_deposited) + amt
        wallet.version += 1
        _add_movement(db, user, "deposit", amt, method, None, f"Deposit {method}", dep.id)
        return {
            "id": dep.id,
            "method": method,
            "amount": amount,
            "transactionId": dep.transaction_id,
            "createdAt": iso_dt(dep.created_at),
            "wallet": wallet_snapshot(db, user),
        }

    return idempotent(db, user, idem_key, "deposit", {"method": method, "amount": amount, "transactionId": transaction_id}, run)


def list_deposits(db: Session, user: Employee) -> dict:
    rows = db.query(LcDeposit).filter_by(employee_id=user.id).order_by(LcDeposit.created_at.desc()).all()
    records = [
        {
            "id": r.id,
            "method": r.method,
            "amount": require_int_bdt(r.amount, "amount"),
            "transactionId": r.transaction_id,
            "createdAt": iso_dt(r.created_at),
        }
        for r in rows
    ]
    total = sum(r["amount"] for r in records)
    return {"total": total, "records": records}


def _sync_return_lines(db: Session, user: Employee, order: Order) -> None:
    state = db.query(LcMemoState).filter_by(order_id=order.id).first()
    if not state or state.status != "partialDelivered":
        return
    lines = {r.order_item_id: r for r in db.query(LcMemoLine).filter_by(order_id=order.id).all()}
    for item in db.query(OrderItem).filter_by(order_id=order.id).all():
        dq = D(lines[item.id].delivered_qty) if item.id in lines else ZERO
        remaining = ordered_qty(item) - dq
        if remaining <= ZERO:
            continue
        existing = db.query(LcReturnLine).filter_by(order_item_id=item.id).first()
        if existing:
            if not existing.adjusted:
                existing.remaining_qty = remaining
            continue
        db.add(
            LcReturnLine(
                id=f"{public_id(order)}_{item.id}",
                order_id=order.id,
                order_item_id=item.id,
                employee_id=user.id,
                remaining_qty=remaining,
                adjusted=False,
            )
        )


def pending_returns(db: Session, user: Employee, adjusted: Optional[bool] = False) -> list:
    q = db.query(LcReturnLine).filter(LcReturnLine.employee_id == user.id)
    if adjusted is True:
        q = q.filter(LcReturnLine.adjusted.is_(True))
    elif adjusted is False:
        q = q.filter(LcReturnLine.adjusted.is_(False))
    rows = q.all()
    out = []
    for row in rows:
        order = db.query(Order).filter(Order.id == row.order_id).first()
        if not order or order.assigned_to != user.id:
            continue
        item = db.query(OrderItem).filter(OrderItem.id == row.order_item_id).first()
        if not item:
            continue
        line = db.query(LcMemoLine).filter_by(order_item_id=item.id).first()
        dq = D(line.delivered_qty) if line else ZERO
        remaining = D(row.remaining_qty)
        out.append(
            {
                "id": row.id,
                "memoId": public_id(order),
                "invoiceNo": order.memo_number or public_id(order),
                "customerName": order.customer_name,
                "itemId": str(item.id),
                "itemName": item.product_name,
                "orderedQty": require_int_bdt(ordered_qty(item), "orderedQty"),
                "deliveredQty": require_int_bdt(dq, "deliveredQty"),
                "remainingQty": require_int_bdt(remaining, "remainingQty"),
                "unit": item.pack_size or "pcs",
                "unitPrice": require_int_bdt(unit_price(item), "unitPrice"),
                "remainingAmount": require_int_bdt(remaining * unit_price(item), "remainingAmount"),
                "adjusted": row.adjusted,
            }
        )
    return out


def adjust_return(db: Session, user: Employee, return_id: str, idem_key: Optional[str]) -> dict:
    def run():
        _lock_wallet(db, user.id, for_update=True)
        row = db.query(LcReturnLine).filter(LcReturnLine.id == return_id).with_for_update().first()
        if not row or row.employee_id != user.id:
            raise LcError(404, "NOT_FOUND", "Not found")
        if row.adjusted:
            if row.return_memo_id:
                memo = db.query(LcReturnMemo).filter_by(id=row.return_memo_id).first()
                if memo:
                    return _return_memo_payload(db, memo)
            raise LcError(409, "ALREADY_ADJUSTED", "Return line already adjusted")
        order = _lock_order(db, db.query(Order).filter(Order.id == row.order_id).first())
        if not order or order.assigned_to != user.id:
            raise LcError(404, "NOT_FOUND", "Not found")
        row.adjusted = True
        siblings = db.query(LcReturnLine).filter_by(order_id=order.id).with_for_update().all()
        if all(s.adjusted for s in siblings):
            memo = _issue_return_memo(db, user, order, siblings)
            for s in siblings:
                s.return_memo_id = memo.id
            return _return_memo_payload(db, memo)
        return {"adjusted": True, "returnMemoNo": None}

    return idempotent(db, user, idem_key, "return-adjust", {"id": return_id}, run)


def _issue_return_memo(db: Session, user: Employee, order: Order, lines: list[LcReturnLine]) -> LcReturnMemo:
    invoice = order.memo_number or public_id(order)
    number = f"R{invoice}"
    items_total = ZERO
    for row in lines:
        item = db.query(OrderItem).filter(OrderItem.id == row.order_item_id).first()
        items_total += D(row.remaining_qty) * unit_price(item)
    memo = LcReturnMemo(
        return_memo_no=number,
        order_id=order.id,
        employee_id=user.id,
        original_invoice_no=invoice,
        customer_name=order.customer_name,
        total_amount=items_total,
        created_at=now_dhaka(),
    )
    db.add(memo)
    db.flush()
    return memo


def _return_memo_payload(db: Session, memo: LcReturnMemo) -> dict:
    lines = db.query(LcReturnLine).filter_by(return_memo_id=memo.id).all()
    items = []
    for row in lines:
        item = db.query(OrderItem).filter(OrderItem.id == row.order_item_id).first()
        items.append(
            {
                "name": item.product_name if item else "",
                "qty": require_int_bdt(row.remaining_qty, "qty"),
                "unit": item.pack_size if item else "pcs",
                "amount": require_int_bdt(D(row.remaining_qty) * unit_price(item), "amount") if item else 0,
            }
        )
    return {
        "returnMemoNo": memo.return_memo_no,
        "originalInvoiceNo": memo.original_invoice_no,
        "customerName": memo.customer_name,
        "items": items,
        "totalAmount": require_int_bdt(memo.total_amount, "totalAmount"),
        "warehouseReceipt": False,
        "note": "DSR reported return only. Physical warehouse restock is not posted.",
    }


def serialize_chemist(row: LcChemist) -> dict:
    return {
        "id": row.id,
        "legacyCode": row.legacy_code,
        "name": row.name,
        "type": row.type or "Own Chemist",
        "location": row.location or row.thana,
        "phone": row.phone,
        "email": row.email,
        "ownerName": row.owner_name,
        "address": row.address,
        "division": row.division,
        "district": row.district,
        "thana": row.thana,
        "imageUrl": f"/api/logicollect/v1/media/{row.photo_id}" if row.photo_id else None,
        "cnBalance": 0,
        "active": row.active,
    }


def list_chemists(db: Session, user: Employee, q: Optional[str]) -> list:
    query = db.query(LcChemist).filter(LcChemist.employee_id == user.id)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                LcChemist.name.ilike(like),
                LcChemist.legacy_code.ilike(like),
                LcChemist.location.ilike(like),
                LcChemist.type.ilike(like),
                LcChemist.thana.ilike(like),
                LcChemist.district.ilike(like),
            )
        )
    return [serialize_chemist(r) for r in query.order_by(LcChemist.name.asc()).all()]


def create_chemist(db: Session, user: Employee, fields: dict, photo: Optional[bytes], filename: Optional[str]) -> dict:
    for key in ("legacyCode", "name", "division", "district", "thana"):
        if not (fields.get(key) or "").strip():
            raise LcError(400, "VALIDATION_ERROR", f"{key} is required")
    code = fields["legacyCode"].strip()
    if db.query(LcChemist).filter_by(legacy_code=code).first():
        raise LcError(400, "DUPLICATE_LEGACY_CODE", "legacyCode already exists")
    photo_id = None
    if photo:
        from app.models_logicollect import LcMedia

        media = LcMedia(
            id=str(uuid4()),
            owner_employee_id=user.id,
            kind="chemist",
            content_type="image/jpeg",
            original_name=filename,
            data=photo,
            created_at=now_dhaka(),
        )
        db.add(media)
        photo_id = media.id
    row = LcChemist(
        id=str(uuid4()),
        employee_id=user.id,
        legacy_code=code,
        name=fields["name"].strip(),
        type=fields.get("type") or "Own Chemist",
        location=fields.get("location") or fields.get("thana"),
        phone=fields.get("phone"),
        email=fields.get("email"),
        owner_name=fields.get("ownerName"),
        address=fields.get("address"),
        division=fields["division"].strip(),
        district=fields["district"].strip(),
        thana=fields["thana"].strip(),
        photo_id=photo_id,
        active=True,
        created_at=now_dhaka(),
    )
    db.add(row)
    db.flush()
    return serialize_chemist(row)


def patch_chemist(db: Session, user: Employee, chemist_id: str, fields: dict) -> dict:
    row = db.query(LcChemist).filter_by(id=chemist_id, employee_id=user.id).first()
    if not row:
        raise LcError(404, "NOT_FOUND", "Not found")
    mapping = {
        "legacyCode": "legacy_code",
        "name": "name",
        "type": "type",
        "location": "location",
        "phone": "phone",
        "email": "email",
        "ownerName": "owner_name",
        "address": "address",
        "division": "division",
        "district": "district",
        "thana": "thana",
    }
    if "legacyCode" in fields and fields["legacyCode"]:
        taken = db.query(LcChemist).filter(LcChemist.legacy_code == fields["legacyCode"], LcChemist.id != row.id).first()
        if taken:
            raise LcError(400, "DUPLICATE_LEGACY_CODE", "legacyCode already exists")
    for src, dest in mapping.items():
        if src in fields and fields[src] is not None:
            setattr(row, dest, fields[src])
    return serialize_chemist(row)


def chemist_photo(db: Session, user: Employee, chemist_id: str, data: bytes, filename: str) -> dict:
    from app.models_logicollect import LcMedia
    from app.services.logicollect.auth import MAX_PHOTO

    row = db.query(LcChemist).filter_by(id=chemist_id, employee_id=user.id).first()
    if not row:
        raise LcError(404, "NOT_FOUND", "Not found")
    if len(data) > MAX_PHOTO:
        raise LcError(400, "FILE_TOO_LARGE", "Photo must be 2 MB or smaller")
    if data[:3] != b"\xff\xd8\xff":
        raise LcError(400, "INVALID_FILE", "Chemist photo must be a JPEG")
    media = LcMedia(
        id=str(uuid4()),
        owner_employee_id=user.id,
        kind="chemist",
        content_type="image/jpeg",
        original_name=filename,
        data=data,
        created_at=now_dhaka(),
    )
    db.add(media)
    row.photo_id = media.id
    return {"imageUrl": f"/api/logicollect/v1/media/{media.id}"}


def chemist_photo_delete(db: Session, user: Employee, chemist_id: str) -> dict:
    row = db.query(LcChemist).filter_by(id=chemist_id, employee_id=user.id).first()
    if not row:
        raise LcError(404, "NOT_FOUND", "Not found")
    row.photo_id = None
    return {"imageUrl": None}


def chemist_active(db: Session, user: Employee, chemist_id: str, active: bool) -> dict:
    row = db.query(LcChemist).filter_by(id=chemist_id, employee_id=user.id).first()
    if not row:
        raise LcError(404, "NOT_FOUND", "Not found")
    row.active = bool(active)
    return serialize_chemist(row)


def credit_chemists(db: Session, user: Employee) -> list:
    rows = db.query(LcChemist).filter(LcChemist.employee_id == user.id).all()
    out = []
    for row in rows:
        orders = eligible_base(db, user).all()
        amount = ZERO
        due = None
        for order in orders:
            state = ensure_state(db, order, user)
            if state.credit_due_at and (
                order.customer_code == row.legacy_code or (_customer_phone(db, order) and _customer_phone(db, order) == row.phone)
            ):
                amount = max(amount, collectible_due(state) or (D(state.delivered_amount) - D(state.paid_amount)))
                due = state.credit_due_at.isoformat()
        cust = db.query(Customer).filter(Customer.code == row.legacy_code).first()
        if cust and D(cust.credit_limit or 0) > ZERO:
            amount = D(cust.credit_limit)
        if amount <= ZERO:
            continue
        out.append(
            {
                "id": row.id,
                "legacyCode": row.legacy_code,
                "name": row.name,
                "phone": row.phone,
                "address": row.address,
                "creditAmount": require_int_bdt(amount, "creditAmount"),
                "dueDate": due or business_date().isoformat(),
            }
        )
    return out


def clear_credit(db: Session, user: Employee, chemist_id: str) -> dict:
    role = (user.role or "").lower()
    if role not in ("finance", "admin"):
        raise LcError(403, "CREDIT_CLEAR_FORBIDDEN", "Credit clear is restricted to finance or HQ")
    raise LcError(
        409,
        "CREDIT_CLEAR_POLICY_PENDING",
        "Credit clearing is not authorized. No balance was changed.",
    )


def exceptions(db: Session, user: Employee) -> list:
    out = []
    for order in eligible_base(db, user).options(joinedload(Order.items)).all():
        products = []
        for item in order.items:
            if _storage_for_item(db, item) != "coldChain":
                continue
            products.append(
                {
                    "id": str(item.id),
                    "name": item.product_name,
                    "quantity": require_int_bdt(ordered_qty(item), "quantity"),
                    "unit": item.pack_size or "pcs",
                    "condition": "coldChain",
                }
            )
        if products:
            out.append(
                {
                    "invoiceNo": order.memo_number or public_id(order),
                    "memoId": public_id(order),
                    "customerName": order.customer_name,
                    "products": products,
                }
            )
    return out


def performance(db: Session, user: Employee, month: Optional[str], from_s: Optional[str], to_s: Optional[str]) -> dict:
    if month:
        year, mon = month.split("-")
        start = date(int(year), int(mon), 1)
        if int(mon) == 12:
            end = date(int(year) + 1, 1, 1)
            from datetime import timedelta

            end = end - timedelta(days=1)
        else:
            from datetime import timedelta

            end = date(int(year), int(mon) + 1, 1) - timedelta(days=1)
    else:
        start = parse_date(from_s) or business_date().replace(day=1)
        end = parse_date(to_s) or business_date()
    target = (
        db.query(LcPerformanceTarget)
        .filter(LcPerformanceTarget.employee_id == user.id)
        .filter(LcPerformanceTarget.period_from <= end, LcPerformanceTarget.period_to >= start)
        .first()
    )
    actual_d = 0
    actual_c = 0
    actual_amt = ZERO
    for order in eligible_base(db, user).all():
        state = ensure_state(db, order, user)
        if state.status in DELIVERED_STATUSES and state.delivered_at:
            day = state.delivered_at.date()
            if start <= day <= end:
                actual_d += 1
                actual_amt += D(state.delivered_amount)
        if state.payment_status == "fullCollected" and state.updated_at:
            day = state.updated_at.date()
            if start <= day <= end:
                actual_c += 1
    return {
        "targetDeliveries": target.target_deliveries if target else 0,
        "actualDeliveries": actual_d,
        "targetCollections": target.target_collections if target else 0,
        "actualCollections": actual_c,
        "targetAmount": require_int_bdt(target.target_amount, "targetAmount") if target else 0,
        "actualAmount": require_int_bdt(actual_amt, "actualAmount"),
        "targetsConfigured": bool(target),
    }
