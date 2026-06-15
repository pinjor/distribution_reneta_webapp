"""Stock issue on load/dispatch."""
from datetime import date
from decimal import Decimal

from app.models import Customer, Order, OrderItem, OrderStatusEnum, Product, ProductItemStock, ProductItemStockDetail
from app.models_platform import OrderBatchAllocation
from app.services.order_validation_service import OrderValidationService
from app.services.stock_reservation_service import StockReservationService


def _validated_order(db_session, admin_user):
    customer = Customer(name="Chemist", code="C020", is_active=True, credit_limit=100000)
    product = Product(name="Med I", code="PRD020", sku="SKU020", is_active=True, base_price=100)
    db_session.add_all([customer, product])
    db_session.flush()
    stock = ProductItemStock(product_id=product.id, product_code=product.code, sku_code=product.sku)
    db_session.add(stock)
    db_session.flush()
    detail = ProductItemStockDetail(
        item_code=stock.id,
        batch_no="B020",
        expiry_date=date(2026, 12, 31),
        available_quantity=100,
        reserved_quantity=0,
        status="Unrestricted",
    )
    db_session.add(detail)
    db_session.flush()
    order = Order(
        order_number="T-ISSUE-1",
        customer_id="C020",
        customer_name="Chemist",
        customer_code="C020",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
        order_type="COD",
        route_code="R1",
    )
    db_session.add(order)
    db_session.flush()
    db_session.add(OrderItem(
        order_id=order.id,
        product_code="PRD020",
        product_name="Med I",
        quantity=10,
        trade_price=100,
        delivery_date=date.today(),
        selected=True,
    ))
    db_session.commit()
    OrderValidationService.validate_order(db_session, order, admin_user)
    db_session.refresh(detail)
    return order, detail


def test_commit_for_order_issues_reserved_stock(db_session, admin_user):
    order, detail = _validated_order(db_session, admin_user)
    assert Decimal(str(detail.reserved_quantity)) == Decimal("10")

    issued = StockReservationService.commit_for_order(db_session, order.id, admin_user)
    db_session.commit()

    assert issued == 1
    db_session.refresh(detail)
    assert Decimal(str(detail.reserved_quantity)) == Decimal("0")

    alloc = db_session.query(OrderBatchAllocation).filter(
        OrderBatchAllocation.order_id == order.id
    ).first()
    assert alloc.allocation_status == "ISSUED"
