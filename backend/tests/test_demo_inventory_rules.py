"""Inventory rule tests. No database connection."""

from decimal import Decimal

import pytest

from db.inventory_rules import deduct_delivered, receive, reserve


def test_reserve_keeps_on_hand():
    quantity, available, reserved = reserve(100, 100, 0, 10)
    assert (quantity, available, reserved) == (Decimal("100"), Decimal("90"), Decimal("10"))


def test_delivery_deducts_only_delivered_portion():
    quantity, available, reserved = reserve(100, 100, 0, 10)
    quantity, available, reserved = deduct_delivered(quantity, available, reserved, 6)
    assert (quantity, available, reserved) == (Decimal("94"), Decimal("90"), Decimal("4"))


def test_postponed_delivery_does_not_release_stock():
    quantity, available, reserved = reserve(50, 50, 0, 8)
    quantity, available, reserved = deduct_delivered(quantity, available, reserved, 0)
    assert (quantity, available, reserved) == (Decimal("50"), Decimal("42"), Decimal("8"))


def test_cannot_deduct_more_than_reserved():
    with pytest.raises(ValueError):
        deduct_delivered(10, 10, 0, 1)


def test_receipt_increases_available_not_reserved():
    quantity, available, reserved = receive(10, 8, 2, 5)
    assert (quantity, available, reserved) == (Decimal("15"), Decimal("13"), Decimal("2"))
