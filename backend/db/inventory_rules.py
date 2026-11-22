"""Pure inventory arithmetic used by the demo seed.

Physical quantity is on-hand. Sellable stock is available. Reservations sit
in reserved and are not a second copy of on-hand.

    on_hand = available_quantity + reserved_quantity

Delivery approval deducts physical quantity for the delivered portion only.
Postponed quantities and unverified returns stay reserved.
"""

from __future__ import annotations

from decimal import Decimal


def D(value) -> Decimal:
    return Decimal(str(value if value is not None else 0))


def assert_balance(quantity, available, reserved) -> None:
    if D(quantity) != D(available) + D(reserved):
        raise ValueError(
            f"Inventory imbalance: on_hand {quantity} != available {available} + reserved {reserved}"
        )


def reserve(quantity, available, reserved, qty) -> tuple[Decimal, Decimal, Decimal]:
    """Move qty from available to reserved. On-hand stays put."""
    quantity, available, reserved, qty = D(quantity), D(available), D(reserved), D(qty)
    assert_balance(quantity, available, reserved)
    if qty <= 0:
        raise ValueError("Reservation quantity must be positive")
    if available < qty:
        raise ValueError(f"Insufficient available stock: {available} < {qty}")
    available -= qty
    reserved += qty
    assert_balance(quantity, available, reserved)
    return quantity, available, reserved


def deduct_delivered(quantity, available, reserved, delivered_qty) -> tuple[Decimal, Decimal, Decimal]:
    """Deduct delivered units from on-hand and from reserved.

    The undelivered remainder stays reserved. Available does not increase.
    """
    quantity, available, reserved, delivered_qty = (
        D(quantity),
        D(available),
        D(reserved),
        D(delivered_qty),
    )
    assert_balance(quantity, available, reserved)
    if delivered_qty < 0:
        raise ValueError("Delivered quantity cannot be negative")
    if delivered_qty > reserved:
        raise ValueError(
            f"Cannot deduct {delivered_qty} from reserved {reserved}. "
            "Postponed and unverified return stock is not released here."
        )
    quantity -= delivered_qty
    reserved -= delivered_qty
    assert_balance(quantity, available, reserved)
    return quantity, available, reserved


def receive(quantity, available, reserved, qty) -> tuple[Decimal, Decimal, Decimal]:
    """Inbound receipt increases on-hand and available. Reserved is unchanged."""
    quantity, available, reserved, qty = D(quantity), D(available), D(reserved), D(qty)
    assert_balance(quantity, available, reserved)
    if qty <= 0:
        raise ValueError("Receipt quantity must be positive")
    quantity += qty
    available += qty
    assert_balance(quantity, available, reserved)
    return quantity, available, reserved
