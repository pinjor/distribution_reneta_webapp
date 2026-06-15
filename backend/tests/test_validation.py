"""Order validation engine tests."""
from datetime import date
from decimal import Decimal

from app.models import Customer, Order, OrderItem, OrderStatusEnum, Product, ProductItemStock, ProductItemStockDetail
from app.services.order_validation_service import OrderValidationService


def test_validation_fails_without_items(db_session, admin_user):
    order = Order(
        order_number="T-1",
        customer_id="C1",
        customer_name="Test Customer",
        customer_code="C001",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
        order_type="COD",
    )
    db_session.add(order)
    db_session.commit()
    run = OrderValidationService.validate_order(db_session, order, admin_user)
    assert run.validation_status.value in ("FAILED", "PENDING")


def test_cod_order_with_stock_passes(db_session, admin_user):
    customer = Customer(name="Chemist", code="C001", is_active=True, credit_limit=100000)
    product = Product(name="Med A", code="PRD001", sku="SKU001", is_active=True, base_price=100)
    db_session.add_all([customer, product])
    db_session.flush()

    stock = ProductItemStock(product_id=product.id, product_code=product.code, sku_code=product.sku, depot_id=None)
    db_session.add(stock)
    db_session.flush()
    db_session.add(ProductItemStockDetail(
        item_code=stock.id, batch_no="B001",
        expiry_date=date(2026, 12, 31), available_quantity=100, status="Unrestricted",
    ))

    order = Order(
        order_number="T-2",
        customer_id="C001",
        customer_name="Chemist",
        customer_code="C001",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
        order_type="COD",
    )
    db_session.add(order)
    db_session.flush()
    db_session.add(OrderItem(
        order_id=order.id, product_code="PRD001", product_name="Med A",
        quantity=10, trade_price=100, delivery_date=date.today(), selected=True,
    ))
    db_session.commit()

    run = OrderValidationService.validate_order(db_session, order, admin_user)
    assert run.validation_status.value == "VALIDATED"
    db_session.refresh(order)
    assert order.validated is True


def test_credit_over_limit_requires_approval(db_session, admin_user):
    customer = Customer(name="Chemist", code="C002", is_active=True, credit_limit=1000, credit_status_credit=True)
    product = Product(name="Med B", code="PRD002", sku="SKU002", is_active=True, base_price=500)
    db_session.add_all([customer, product])
    db_session.flush()
    stock = ProductItemStock(product_id=product.id, product_code=product.code, sku_code=product.sku)
    db_session.add(stock)
    db_session.flush()
    db_session.add(ProductItemStockDetail(
        item_code=stock.id, batch_no="B002",
        expiry_date=date(2026, 6, 30), available_quantity=50, status="Unrestricted",
    ))

    order = Order(
        order_number="T-3",
        customer_id="C002",
        customer_name="Chemist",
        customer_code="C002",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
        order_type="CREDIT",
    )
    db_session.add(order)
    db_session.flush()
    db_session.add(OrderItem(
        order_id=order.id, product_code="PRD002", product_name="Med B",
        quantity=5, trade_price=500, delivery_date=date.today(), selected=True,
    ))
    db_session.commit()

    run = OrderValidationService.validate_order(db_session, order, admin_user)
    assert run.requires_approval or run.validation_status.value in ("FAILED", "PENDING_APPROVAL")
