"""Stock reservation during order validation."""
from datetime import date
from decimal import Decimal

from app.models import Customer, Order, OrderItem, OrderStatusEnum, Product, ProductItemStock, ProductItemStockDetail
from app.models_platform import OrderBatchAllocation
from app.services.order_validation_service import OrderValidationService


def _seed_order_with_stock(db_session, admin_user):
    customer = Customer(name="Chemist", code="C010", is_active=True, credit_limit=100000)
    product = Product(name="Med R", code="PRD010", sku="SKU010", is_active=True, base_price=100)
    db_session.add_all([customer, product])
    db_session.flush()

    stock = ProductItemStock(product_id=product.id, product_code=product.code, sku_code=product.sku)
    db_session.add(stock)
    db_session.flush()
    detail = ProductItemStockDetail(
        item_code=stock.id,
        batch_no="B010",
        expiry_date=date(2026, 12, 31),
        available_quantity=100,
        reserved_quantity=0,
        status="Unrestricted",
    )
    db_session.add(detail)
    db_session.flush()

    order = Order(
        order_number="T-RES-1",
        customer_id="C010",
        customer_name="Chemist",
        customer_code="C010",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
        order_type="COD",
    )
    db_session.add(order)
    db_session.flush()
    db_session.add(OrderItem(
        order_id=order.id,
        product_code="PRD010",
        product_name="Med R",
        quantity=10,
        trade_price=100,
        delivery_date=date.today(),
        selected=True,
    ))
    db_session.commit()
    return order, detail


def test_validation_reserves_stock(db_session, admin_user):
    order, detail = _seed_order_with_stock(db_session, admin_user)
    run = OrderValidationService.validate_order(db_session, order, admin_user)
    assert run.validation_status.value == "VALIDATED"

    db_session.refresh(detail)
    assert Decimal(str(detail.available_quantity)) == Decimal("90")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("10")

    allocs = db_session.query(OrderBatchAllocation).filter(
        OrderBatchAllocation.order_id == order.id
    ).all()
    assert len(allocs) == 1
    assert allocs[0].allocation_status == "RESERVED"


def test_revalidation_releases_then_re_reserves(db_session, admin_user):
    order, detail = _seed_order_with_stock(db_session, admin_user)
    OrderValidationService.validate_order(db_session, order, admin_user)
    db_session.refresh(detail)
    assert Decimal(str(detail.reserved_quantity)) == Decimal("10")

    OrderValidationService.validate_order(db_session, order, admin_user)
    db_session.refresh(detail)
    assert Decimal(str(detail.reserved_quantity)) == Decimal("10")
    assert Decimal(str(detail.available_quantity)) == Decimal("90")
