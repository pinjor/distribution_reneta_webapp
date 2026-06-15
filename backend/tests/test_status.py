"""Status transition tests."""
from datetime import date

import pytest
from fastapi import HTTPException

from app.models import Order, OrderStatusEnum
from app.services.status_service import StatusTransitionService


def test_cannot_jump_to_delivered(db_session, admin_user):
    order = Order(
        order_number="S-1",
        customer_id="C1",
        customer_name="Test",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
        delivery_status="ORDER_CREATED",
    )
    db_session.add(order)
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        StatusTransitionService.transition(db_session, order, "DELIVER_FULL", admin_user)
    assert exc.value.status_code == 400


def test_validate_transition(db_session, admin_user):
    order = Order(
        order_number="S-2",
        customer_id="C1",
        customer_name="Test",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
        delivery_status="ORDER_CREATED",
    )
    db_session.add(order)
    db_session.commit()

    StatusTransitionService.transition(db_session, order, "VALIDATE", admin_user, force=True)
    db_session.commit()
    assert order.delivery_status == "VALIDATED"
