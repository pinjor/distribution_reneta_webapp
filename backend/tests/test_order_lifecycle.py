"""Tests for order lifecycle tracking steps."""
from types import SimpleNamespace

from app.models import OrderStatusEnum
from app.services.order_lifecycle_service import build_order_lifecycle_steps


class _FakeQuery:
    def __init__(self, result):
        self._result = result

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self._result


class _FakeDb:
    def __init__(self, deposit=None):
        self._deposit = deposit

    def query(self, model):
        return _FakeQuery(self._deposit)


def _order(**kwargs):
    defaults = {
        "id": 1,
        "status": OrderStatusEnum.APPROVED,
        "validated": False,
        "printed": False,
        "loaded": False,
        "assigned_to": None,
        "loading_number": None,
        "delivery_status": "ORDER_CREATED",
        "collection_status": None,
        "collection_approved": False,
        "created_at": None,
        "updated_at": None,
        "printed_at": None,
        "loaded_at": None,
        "assignment_date": None,
        "collection_approved_at": None,
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_lifecycle_returns_eight_steps():
    order = _order()
    steps, stage, label = build_order_lifecycle_steps(order, _FakeDb())
    assert len(steps) == 8
    assert steps[0].key == "order_creation"
    assert steps[-1].key == "mis_report"
    assert stage == "validation"
    assert label == "Validation"


def test_validated_order_at_route_wise():
    order = _order(validated=True, printed=False)
    steps, stage, _ = build_order_lifecycle_steps(order, _FakeDb())
    assert steps[1].status == "completed"
    assert steps[2].status == "current"
    assert stage == "route_wise"
