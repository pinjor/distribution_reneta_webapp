"""Foundation rules for batch delivery outcomes and return verification. SQLite only."""
from datetime import date
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.models import Customer, Depot, Order, OrderItem, OrderStatusEnum, Product, ProductItemStock, ProductItemStockDetail
from app.models_platform import DeliveryAllocationOutcome, OrderBatchAllocation, ReturnVerification
from app.services.delivery_outcome_service import (
    CUSTODY_DELIVERED,
    CUSTODY_DISPATCHED,
    CUSTODY_IN_DEPOT,
    CUSTODY_RETURN_UNVERIFIED,
    CUSTODY_RETURN_VERIFIED,
    DeliveryOutcomeService,
)


def _allocation(db, *, qty="10", batch="2024001", memo="20000001", depot_code="107"):
    depot = Depot(name="Khulna", code=depot_code)
    product = Product(name="Omeprazole", code=f"P-{batch}", sku=f"SKU-{batch}", is_active=True)
    customer = Customer(name="Chemist", code=f"C-{memo}", is_active=True)
    db.add_all([depot, product, customer])
    db.flush()
    header = ProductItemStock(
        product_id=product.id,
        product_code=product.code,
        sku_code=product.sku,
        depot_id=depot.id,
        stock_qty=Decimal("100"),
    )
    db.add(header)
    db.flush()
    detail = ProductItemStockDetail(
        item_code=header.id,
        batch_no=batch,
        quantity=Decimal("100"),
        available_quantity=Decimal("90"),
        reserved_quantity=Decimal(qty),
    )
    order = Order(
        order_number=f"ORD-{memo}",
        memo_number=memo,
        depot_code=depot.code,
        customer_id="C1",
        customer_name="Chemist",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date(2026, 11, 19),
        status=OrderStatusEnum.APPROVED,
        loading_number="LD-FOUNDATION",
        loaded=True,
    )
    db.add_all([detail, order])
    db.flush()
    item = OrderItem(
        order_id=order.id,
        product_code=product.code,
        product_name=product.name,
        quantity=Decimal(qty),
        total_quantity=Decimal(qty),
        trade_price=10,
        delivery_date=date(2026, 11, 19),
    )
    db.add(item)
    db.flush()
    allocation = OrderBatchAllocation(
        order_id=order.id,
        order_item_id=item.id,
        product_id=product.id,
        batch_no=batch,
        allocated_qty=Decimal(qty),
        stock_source_id=detail.id,
        allocation_status="RESERVED",
    )
    db.add(allocation)
    db.commit()
    return depot, product, detail, order, item, allocation


def test_outcome_links_order_line_and_allocation(db_session, admin_user):
    depot, product, detail, order, item, allocation = _allocation(db_session)
    outcome = DeliveryOutcomeService.record_outcome(
        db_session,
        allocation_id=allocation.id,
        delivered_quantity=Decimal("7"),
        undelivered_quantity=Decimal("3"),
        delivery_reference=order.loading_number,
        custody_status=CUSTODY_DISPATCHED,
        depot_id=depot.id,
        product_id=product.id,
        batch_no=allocation.batch_no,
        user=admin_user,
    )
    db_session.commit()
    assert outcome.order_id == order.id
    assert outcome.order_item_id == item.id
    assert outcome.allocation_id == allocation.id
    assert outcome.custody_status == CUSTODY_DISPATCHED
    assert Decimal(str(detail.quantity)) == Decimal("100")
    assert Decimal(str(detail.available_quantity)) == Decimal("90")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("10")


def test_two_batches_have_separate_outcomes(db_session, admin_user):
    depot, product, _detail, order, _item, first = _allocation(db_session, qty="4", batch="2024001", memo="20000011")
    header = db_session.get(ProductItemStock, db_session.get(ProductItemStockDetail, first.stock_source_id).item_code)
    second_detail = ProductItemStockDetail(
        item_code=header.id,
        batch_no="2024002",
        quantity=Decimal("6"),
        available_quantity=Decimal("0"),
        reserved_quantity=Decimal("6"),
    )
    db_session.add(second_detail)
    db_session.flush()
    second_item = OrderItem(
        order_id=order.id,
        product_code=product.code,
        product_name=product.name,
        quantity=Decimal("6"),
        total_quantity=Decimal("6"),
        trade_price=10,
        delivery_date=date(2026, 11, 19),
    )
    db_session.add(second_item)
    db_session.flush()
    second = OrderBatchAllocation(
        order_id=order.id,
        order_item_id=second_item.id,
        product_id=product.id,
        batch_no="2024002",
        allocated_qty=Decimal("6"),
        stock_source_id=second_detail.id,
        allocation_status="RESERVED",
    )
    db_session.add(second)
    db_session.commit()
    DeliveryOutcomeService.record_outcome(
        db_session, allocation_id=first.id, delivered_quantity=4, undelivered_quantity=0,
        delivery_reference="LD-FOUNDATION", custody_status=CUSTODY_DELIVERED,
        depot_id=depot.id, product_id=product.id, batch_no="2024001", user=admin_user,
    )
    DeliveryOutcomeService.record_outcome(
        db_session, allocation_id=second.id, delivered_quantity=2, undelivered_quantity=4,
        delivery_reference="LD-FOUNDATION", custody_status=CUSTODY_DISPATCHED,
        depot_id=depot.id, product_id=product.id, batch_no="2024002", user=admin_user,
    )
    db_session.commit()
    assert db_session.query(DeliveryAllocationOutcome).count() == 2


def test_quantity_and_identity_rules(db_session, admin_user):
    depot, product, detail, _order, _item, allocation = _allocation(db_session)
    before = (detail.quantity, detail.available_quantity, detail.reserved_quantity)
    with pytest.raises(HTTPException) as over:
        DeliveryOutcomeService.record_outcome(
            db_session, allocation_id=allocation.id, delivered_quantity=8, undelivered_quantity=3,
            delivery_reference="LD-FOUNDATION", custody_status=CUSTODY_DISPATCHED,
            depot_id=depot.id, product_id=product.id, batch_no="2024001", user=admin_user,
        )
    assert over.value.detail == "Delivered and undelivered quantities must equal the allocation"
    with pytest.raises(HTTPException) as negative:
        DeliveryOutcomeService.record_outcome(
            db_session, allocation_id=allocation.id, delivered_quantity=-1, undelivered_quantity=11,
            delivery_reference="LD-FOUNDATION", custody_status=CUSTODY_DISPATCHED,
            depot_id=depot.id, product_id=product.id, batch_no="2024001", user=admin_user,
        )
    assert negative.value.detail == "Invalid quantity"
    with pytest.raises(HTTPException) as missing:
        DeliveryOutcomeService.record_outcome(
            db_session, allocation_id=allocation.id + 99, delivered_quantity=10, undelivered_quantity=0,
            delivery_reference="LD-FOUNDATION", custody_status=CUSTODY_DELIVERED,
            depot_id=depot.id, product_id=product.id, batch_no="2024001", user=admin_user,
        )
    assert missing.value.detail == "Unknown allocation"
    with pytest.raises(HTTPException) as depot_error:
        DeliveryOutcomeService.record_outcome(
            db_session, allocation_id=allocation.id, delivered_quantity=10, undelivered_quantity=0,
            delivery_reference="LD-FOUNDATION", custody_status=CUSTODY_DELIVERED,
            depot_id=depot.id + 5, product_id=product.id, batch_no="2024001", user=admin_user,
        )
    assert depot_error.value.detail == "Invalid depot"
    with pytest.raises(HTTPException) as product_error:
        DeliveryOutcomeService.record_outcome(
            db_session, allocation_id=allocation.id, delivered_quantity=10, undelivered_quantity=0,
            delivery_reference="LD-FOUNDATION", custody_status=CUSTODY_DELIVERED,
            depot_id=depot.id, product_id=product.id + 5, batch_no="2024001", user=admin_user,
        )
    assert product_error.value.detail == "Unknown product"
    with pytest.raises(HTTPException) as batch_error:
        DeliveryOutcomeService.record_outcome(
            db_session, allocation_id=allocation.id, delivered_quantity=10, undelivered_quantity=0,
            delivery_reference="LD-FOUNDATION", custody_status=CUSTODY_DELIVERED,
            depot_id=depot.id, product_id=product.id, batch_no="999", user=admin_user,
        )
    assert batch_error.value.detail == "Invalid batch"
    db_session.refresh(detail)
    assert (detail.quantity, detail.available_quantity, detail.reserved_quantity) == before


def test_return_verification_does_not_release_stock(db_session, admin_user):
    depot, product, detail, _order, _item, allocation = _allocation(db_session, qty="10", memo="20000021")
    stayed = DeliveryOutcomeService.record_outcome(
        db_session, allocation_id=allocation.id, delivered_quantity=0, undelivered_quantity=10,
        delivery_reference="LD-FOUNDATION", custody_status=CUSTODY_IN_DEPOT,
        depot_id=depot.id, product_id=product.id, batch_no="2024001", user=admin_user,
    )
    db_session.commit()
    with pytest.raises(HTTPException) as fictitious:
        DeliveryOutcomeService.request_return(
            db_session, outcome_id=stayed.id, expected_return_quantity=10, received_quantity=10, user=admin_user,
        )
    assert "never left the depot" in fictitious.value.detail

    left = _allocation(db_session, qty="10", batch="2024008", memo="20000022", depot_code="108")
    depot2, product2, detail2, _order2, _item2, allocation2 = left
    outcome = DeliveryOutcomeService.record_outcome(
        db_session, allocation_id=allocation2.id, delivered_quantity=0, undelivered_quantity=10,
        delivery_reference="LD-FOUNDATION", custody_status=CUSTODY_DISPATCHED,
        depot_id=depot2.id, product_id=product2.id, batch_no="2024008", user=admin_user,
    )
    db_session.commit()
    with pytest.raises(HTTPException) as unknown:
        DeliveryOutcomeService.request_return(
            db_session, outcome_id=outcome.id + 99, expected_return_quantity=1, received_quantity=1, user=admin_user,
        )
    assert unknown.value.detail == "Unknown delivery outcome"
    with pytest.raises(HTTPException) as too_much:
        DeliveryOutcomeService.request_return(
            db_session, outcome_id=outcome.id, expected_return_quantity=10, received_quantity=11, user=admin_user,
        )
    assert too_much.value.detail == "Invalid quantity"

    first = DeliveryOutcomeService.request_return(
        db_session, outcome_id=outcome.id, expected_return_quantity=6, received_quantity=6, user=admin_user, remarks="count",
    )
    db_session.commit()
    assert first.status == "REQUESTED"
    assert first.verified_by is None
    assert first.verification_number.startswith("RV-")
    db_session.refresh(detail2)
    assert Decimal(str(detail2.available_quantity)) == Decimal("90")
    assert Decimal(str(detail2.reserved_quantity)) == Decimal("10")

    with pytest.raises(HTTPException) as duplicate:
        DeliveryOutcomeService.request_return(
            db_session, outcome_id=outcome.id, expected_return_quantity=1, received_quantity=1, user=admin_user,
        )
    assert duplicate.value.detail == "Duplicate return verification"

    verified = DeliveryOutcomeService.verify_return(db_session, verification_id=first.id, user=admin_user)
    db_session.commit()
    assert verified.status == "VERIFIED"
    assert verified.verified_by == admin_user.id
    assert verified.verified_at is not None
    db_session.refresh(detail2)
    assert Decimal(str(detail2.quantity)) == Decimal("100")
    assert Decimal(str(detail2.available_quantity)) == Decimal("90")
    assert Decimal(str(detail2.reserved_quantity)) == Decimal("10")

    with pytest.raises(HTTPException) as over_outstanding:
        DeliveryOutcomeService.request_return(
            db_session, outcome_id=outcome.id, expected_return_quantity=5, received_quantity=5, user=admin_user,
        )
    assert over_outstanding.value.detail == "Return quantity exceeds the outstanding quantity"
    second = DeliveryOutcomeService.request_return(
        db_session, outcome_id=outcome.id, expected_return_quantity=4, received_quantity=4, user=admin_user,
    )
    DeliveryOutcomeService.verify_return(db_session, verification_id=second.id, user=admin_user)
    db_session.commit()
    outcome = db_session.get(DeliveryAllocationOutcome, outcome.id)
    assert outcome.custody_status == CUSTODY_RETURN_VERIFIED
    assert db_session.query(ReturnVerification).filter(ReturnVerification.allocation_id == allocation2.id).count() == 2
    db_session.refresh(detail2)
    assert Decimal(str(detail2.available_quantity)) == Decimal("90")
