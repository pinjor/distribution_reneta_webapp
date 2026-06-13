"""Seed remaining demo modules: stock ledger, receipts, adjustments, deliveries, picking, loadings."""

from datetime import date, datetime, timedelta
from decimal import Decimal

from app.database import SessionLocal
from app import models


def sync_stock_ledger(db):
    """Populate stock_ledger from product_item_stock_details for dashboard KPIs."""
    existing = db.query(models.StockLedger).count()
    if existing > 0:
        print(f"   Stock ledger already has {existing} records, skipping sync")
        return 0

    details = db.query(models.ProductItemStockDetail).join(models.ProductItemStock).all()
    created = 0
    for detail in details:
        stock = detail.item_stock
        qty = float(detail.quantity or 0)
        reserved = float(detail.reserved_quantity or 0)
        available = float(detail.available_quantity or qty)
        db.add(models.StockLedger(
            product_id=stock.product_id,
            batch=detail.batch_no,
            depot_id=stock.depot_id,
            storage_type=detail.storage_type or "Ambient",
            quantity=Decimal(str(qty)),
            reserved_quantity=Decimal(str(reserved)),
            available_quantity=Decimal(str(available)),
            expiry_date=detail.expiry_date,
            status=detail.status or "Unrestricted",
        ))
        created += 1
    return created


def seed_product_receipts(db):
    depots = db.query(models.Depot).all()
    products = db.query(models.Product).limit(6).all()
    if not depots or not products:
        return 0

    receipts_data = [
        ("REC-FACT-2026-001", models.ReceiptSourceEnum.FACTORY, models.ProductReceiptStatus.APPROVED, 0, "Road", "Abdul Karim", -5),
        ("REC-FACT-2026-002", models.ReceiptSourceEnum.FACTORY, models.ProductReceiptStatus.DRAFT, 0, "Rail", "Mohammad Hasan", -3),
        ("REC-FACT-2026-003", models.ReceiptSourceEnum.FACTORY, models.ProductReceiptStatus.APPROVED, 0, "Road", "Rahim Uddin", -7),
        ("REC-DEPT-2026-001", models.ReceiptSourceEnum.DEPOT, models.ProductReceiptStatus.APPROVED, 1, "Internal", "Karim Ahmed", -4),
        ("REC-DEPT-2026-002", models.ReceiptSourceEnum.DEPOT, models.ProductReceiptStatus.DRAFT, 2, "Internal", "Farhana Akter", -2),
        ("REC-RET-2026-001", models.ReceiptSourceEnum.RETURN, models.ProductReceiptStatus.APPROVED, 0, "Return", "Customer Return", -6),
        ("REC-RET-2026-002", models.ReceiptSourceEnum.RETURN, models.ProductReceiptStatus.DRAFT, 1, "Return", "Expired Stock Return", -1),
        ("REC-FACT-2026-004", models.ReceiptSourceEnum.FACTORY, models.ProductReceiptStatus.APPROVED, 2, "Air", "Express Delivery", 0),
    ]
    created = 0
    for receipt_number, source, status, depot_idx, mode, person, day_offset in receipts_data:
        if db.query(models.ProductReceipt).filter(models.ProductReceipt.receipt_number == receipt_number).first():
            continue
        depot = depots[min(depot_idx, len(depots) - 1)]
        receipt = models.ProductReceipt(
            receipt_number=receipt_number,
            source_type=source,
            target_depot_id=depot.id,
            to_address=depot.address,
            tfa_number=f"TFA-{receipt_number[-3:]}",
            shipment_mode=mode,
            delivery_person=person,
            vehicle_info="DH-KA-12-3456",
            issued_date=date.today() + timedelta(days=day_offset),
            status=status,
            remarks=f"Demo receipt from {source.value}",
        )
        db.add(receipt)
        db.flush()
        for pidx, product in enumerate(products[:3]):
            db.add(models.ProductReceiptItem(
                receipt_id=receipt.id,
                legacy_code=product.old_code,
                item_code=product.code,
                item_name=product.name,
                pack_size="10x10",
                uom=product.unit_of_measure or "PCS",
                expiry_date=date.today() + timedelta(days=365 + pidx * 30),
                batch_number=f"BAT-{receipt_number[-3:]}-{pidx + 1}",
                depot_quantity=Decimal(str(100 + pidx * 50)),
            ))
        created += 1
    return created


def seed_stock_adjustments(db):
    depots = db.query(models.Depot).all()
    products = db.query(models.Product).limit(5).all()
    employees = db.query(models.Employee).limit(3).all()
    if not depots or not products or not employees:
        return 0

    adjustments = [
        ("ADJ-2026-001", "Pending", "Damaged goods", -50, 0, -3),
        ("ADJ-2026-002", "Approved", "Cycle count variance", 25, 1, -5),
        ("ADJ-2026-003", "Rejected", "Quality issue", -15, 0, -7),
        ("ADJ-2026-004", "Pending", "Expired batch removal", -30, 1, -2),
        ("ADJ-2026-005", "Approved", "Found during audit", 40, 2, -4),
        ("ADJ-2026-006", "Pending", "Temperature excursion", -20, 0, -1),
    ]
    created = 0
    for adj_no, status, reason, qty_change, depot_idx, day_offset in adjustments:
        if db.query(models.StockAdjustment).filter(models.StockAdjustment.adjustment_number == adj_no).first():
            continue
        adj = models.StockAdjustment(
            adjustment_number=adj_no,
            adjustment_date=date.today() + timedelta(days=day_offset),
            depot_id=depots[min(depot_idx, len(depots) - 1)].id,
            adjustment_type="Quantity",
            reason=reason,
            status=status,
            submitted_by=employees[0].id,
            approved_by=employees[1].id if status == "Approved" else None,
        )
        db.add(adj)
        db.flush()
        for pidx, product in enumerate(products[:2]):
            db.add(models.StockAdjustmentItem(
                adjustment_id=adj.id,
                product_id=product.id,
                batch=f"BAT-ADJ-{adj_no[-3:]}-{pidx + 1}",
                quantity_change=Decimal(str(qty_change)),
            ))
        created += 1
    return created


def seed_order_deliveries(db):
    vehicles = db.query(models.Vehicle).limit(3).all()
    drivers = db.query(models.Driver).limit(3).all()
    orders = db.query(models.Order).filter(
        models.Order.validated == True,
        models.Order.items.any(),
    ).limit(12).all()

    if not orders:
        return 0

    statuses = [
        models.DeliveryStatusEnum.DRAFT,
        models.DeliveryStatusEnum.PACKING,
        models.DeliveryStatusEnum.LOADING,
        models.DeliveryStatusEnum.SHIPPED,
        models.DeliveryStatusEnum.DELIVERED,
    ]
    created = 0
    for idx, order in enumerate(orders):
        delivery_number = f"DLV-2026{idx + 1:04d}"
        if db.query(models.OrderDelivery).filter(models.OrderDelivery.delivery_number == delivery_number).first():
            continue
        if db.query(models.OrderDelivery).filter(models.OrderDelivery.order_id == order.id).first():
            continue

        delivery = models.OrderDelivery(
            order_id=order.id,
            delivery_number=delivery_number,
            ship_to_party=order.customer_name,
            sold_to_party=order.customer_name,
            delivery_date=order.delivery_date,
            planned_dispatch_time="09:00",
            vehicle_info=vehicles[idx % len(vehicles)].registration_number if vehicles else "DH-KA-11-1111",
            driver_name=drivers[idx % len(drivers)].first_name if drivers else "Rahim Uddin",
            warehouse_no=order.depot_code,
            vehicle_id=vehicles[idx % len(vehicles)].id if vehicles else None,
            driver_id=drivers[idx % len(drivers)].id if drivers else None,
            status=statuses[idx % len(statuses)],
            remarks="Demo delivery order for client presentation",
        )
        db.add(delivery)
        db.flush()

        for item in order.items:
            if not item.selected:
                continue
            product = db.query(models.Product).filter(
                (models.Product.name == item.product_name) | (models.Product.code == item.product_code)
            ).first()
            if not product:
                product = db.query(models.Product).first()
            qty = Decimal(str(item.quantity))
            rate = Decimal(str(item.unit_price or item.trade_price or product.base_price or 100))
            db.add(models.OrderDeliveryItem(
                delivery_id=delivery.id,
                order_item_id=item.id,
                product_id=product.id,
                product_name=item.product_name,
                legacy_code=item.product_code,
                new_code=product.new_code,
                pack_size=item.pack_size,
                uom=product.unit_of_measure or "PCS",
                batch_number=f"BAT-DLV-{delivery.id}-{item.id}",
                expiry_date=date.today() + timedelta(days=300),
                ordered_quantity=qty,
                delivery_quantity=qty,
                picked_quantity=qty if delivery.status != models.DeliveryStatusEnum.DRAFT else Decimal("0"),
                available_stock=qty * 2,
                product_rate=rate,
                trade_amount=qty * rate,
                vat_amount=qty * rate * Decimal("0.05"),
                status="Pending" if delivery.status == models.DeliveryStatusEnum.DRAFT else "Picked",
            ))
        created += 1
    return created


def seed_picking_orders(db):
    deliveries = db.query(models.OrderDelivery).limit(10).all()
    if len(deliveries) < 2:
        return 0

    picking_data = [
        ("PCK-2026-0001", "Approved", "LDG-2026-001", 0),
        ("PCK-2026-0002", "Approved", "LDG-2026-002", 1),
        ("PCK-2026-0003", "Approved", "LDG-2026-003", 2),
        ("PCK-2026-0004", "Draft", "LDG-2026-004", 3),
        ("PCK-2026-0005", "Draft", "LDG-2026-005", 4),
    ]
    created = 0
    for order_number, status, loading_no, start_idx in picking_data:
        if db.query(models.PickingOrder).filter(models.PickingOrder.order_number == order_number).first():
            continue
        po = models.PickingOrder(
            order_number=order_number,
            loading_no=loading_no,
            loading_date=date.today() + timedelta(days=start_idx),
            area="Kushtia North" if start_idx % 2 == 0 else "Khulna South",
            delivery_by="Rahim Uddin" if start_idx % 2 == 0 else "Karim Ahmed",
            vehicle_no="DH-KA-12-3456",
            status=status,
            remarks="Demo loading challan",
        )
        db.add(po)
        db.flush()
        for d_idx, delivery in enumerate(deliveries[start_idx:start_idx + 3]):
            order = db.query(models.Order).filter(models.Order.id == delivery.order_id).first()
            db.add(models.PickingOrderDelivery(
                picking_order_id=po.id,
                delivery_id=delivery.id,
                memo_no=order.memo_number if order and order.memo_number else f"MEMO-{delivery.id:06d}",
                value=Decimal(str(15000 + d_idx * 2500)),
                status="Ready" if status == "Approved" else "Pending",
                pso=order.pso_name if order else "Rahim Uddin",
                cash=Decimal(str(5000 + d_idx * 1000)),
                dues=Decimal(str(2000)),
            ))
        created += 1
    return created


def seed_vehicle_loadings(db):
    vehicles = db.query(models.Vehicle).limit(3).all()
    drivers = db.query(models.Driver).limit(3).all()
    routes = db.query(models.Route).limit(3).all()
    employees = db.query(models.Employee).limit(1).all()
    if not vehicles or not drivers:
        return 0

    loadings = [
        ("VL-2026-0001", "Completed", 0, -2),
        ("VL-2026-0002", "In Progress", 1, -1),
        ("VL-2026-0003", "Pending", 2, 0),
        ("VL-2026-0004", "Completed", 0, -3),
        ("VL-2026-0005", "In Progress", 1, -1),
    ]
    created = 0
    for loading_number, status, v_idx, day_offset in loadings:
        if db.query(models.VehicleLoading).filter(models.VehicleLoading.loading_number == loading_number).first():
            continue
        db.add(models.VehicleLoading(
            loading_number=loading_number,
            loading_date=date.today() + timedelta(days=day_offset),
            vehicle_id=vehicles[v_idx % len(vehicles)].id,
            driver_id=drivers[v_idx % len(drivers)].id,
            route_id=routes[v_idx % len(routes)].id if routes else None,
            total_quantity=Decimal(str(500 + v_idx * 100)),
            status=status,
            created_by=employees[0].id if employees else None,
        ))
        created += 1
    return created


def seed_invoices(db):
    customers = db.query(models.Customer).limit(5).all()
    depots = db.query(models.Depot).limit(2).all()
    if not customers or not depots:
        return 0

    invoices = [
        ("INV-2026-0001", 0, "Credit", "Paid", 45680.50, -5),
        ("INV-2026-0002", 1, "Cash", "Paid", 32450.00, -4),
        ("INV-2026-0003", 2, "Credit", "Pending", 58920.75, -3),
        ("INV-2026-0004", 3, "Credit", "Overdue", 67340.00, -10),
        ("INV-2026-0005", 4, "Cash", "Paid", 41200.25, -2),
    ]
    created = 0
    for inv_no, cust_idx, mode, status, amount, day_offset in invoices:
        if db.query(models.Invoice).filter(models.Invoice.invoice_number == inv_no).first():
            continue
        inv_date = date.today() + timedelta(days=day_offset)
        db.add(models.Invoice(
            invoice_number=inv_no,
            invoice_date=inv_date,
            customer_id=customers[cust_idx % len(customers)].id,
            depot_id=depots[0].id,
            amount=Decimal(str(amount)),
            mode=mode,
            status=status,
            due_date=inv_date + timedelta(days=30 if mode == "Credit" else 0),
        ))
        created += 1
    return created


def assign_memo_numbers(db):
    orders = db.query(models.Order).filter(models.Order.memo_number.is_(None)).limit(40).all()
    base = 10000001
    for idx, order in enumerate(orders):
        memo = str(base + idx)
        if db.query(models.Order).filter(models.Order.memo_number == memo).first():
            continue
        order.memo_number = memo
    return len(orders)


def seed_demo_modules():
    db = SessionLocal()
    try:
        print("🌱 Seeding demo module data...")
        memo_count = assign_memo_numbers(db)
        ledger_count = sync_stock_ledger(db)
        receipt_count = seed_product_receipts(db)
        adj_count = seed_stock_adjustments(db)
        delivery_count = seed_order_deliveries(db)
        picking_count = seed_picking_orders(db)
        loading_count = seed_vehicle_loadings(db)
        invoice_count = seed_invoices(db)
        db.commit()
        print(f"✅ Demo modules seeded:")
        print(f"   - Memo numbers assigned: {memo_count}")
        print(f"   - Stock ledger: {ledger_count} records")
        print(f"   - Product receipts: {receipt_count}")
        print(f"   - Stock adjustments: {adj_count}")
        print(f"   - Order deliveries: {delivery_count}")
        print(f"   - Picking orders: {picking_count}")
        print(f"   - Vehicle loadings: {loading_count}")
        print(f"   - Invoices: {invoice_count}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding demo modules: {e}")
        raise
    finally:
        db.close()


def main():
    seed_demo_modules()


if __name__ == "__main__":
    main()
