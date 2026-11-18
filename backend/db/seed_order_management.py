"""Seed demo orders for every Order Management screen.

Creates idempotent OM-DEMO records for:
  - Delivery Order list (unvalidated, with route + items)
  - Route Wise Memo List (validated, not loaded)
  - Assigned Order List (employee + vehicle + loading number)
  - Remaining Cash and Collection (Web, loading groups, several statuses)
  - Approval for Collection (Mobile App, needs approval)
  - MIS Report / Lifecycle Tracker (memo numbers, one billed order)

Run:
    docker exec swift_distro_api python -m db.seed_order_management
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

from app.database import SessionLocal
from app import models

DEMO_NOTE = "OM-DEMO"


def _memo(db, seed: int) -> str:
    for offset in range(0, 500):
        memo = str(88000000 + seed + offset)
        exists = db.query(models.Order).filter(models.Order.memo_number == memo).first()
        if not exists:
            return memo
    raise RuntimeError("Unable to allocate a unique memo number")


def _next_memo(db, counter: list) -> str:
    memo = _memo(db, counter[0])
    counter[0] += 1
    return memo


def _add_items(order, products, delivery_date, start_qty: int):
    total = Decimal("0")
    selected = products[:3] if len(products) >= 3 else products
    for idx, product in enumerate(selected):
        quantity = Decimal(str(start_qty + idx * 8))
        free_goods = Decimal("2")
        total_qty = quantity + free_goods
        trade_price = product.base_price or Decimal("95")
        discount = Decimal("5")
        unit_price = trade_price
        line = unit_price * (1 - discount / 100) * total_qty
        total += line
        order.items.append(
            models.OrderItem(
                product_code=product.code,
                product_name=product.name,
                pack_size=product.primary_packaging or product.unit_of_measure or "Nos",
                quantity=quantity,
                free_goods=free_goods,
                total_quantity=total_qty,
                trade_price=trade_price,
                unit_price=unit_price,
                discount_percent=discount,
                delivery_date=delivery_date,
                selected=True,
            )
        )
    return total


def _base_order(*, depot, customer, employee, route, delivery_date, **kwargs):
    payload = dict(
        depot_code=depot.code,
        depot_name=depot.name,
        customer_id=str(customer.id),
        customer_name=customer.name,
        customer_code=customer.code,
        pso_id=str(employee.id),
        pso_name=f"{employee.first_name} {employee.last_name or ''}".strip(),
        pso_code=employee.employee_id,
        route_code=route.route_id,
        route_name=route.name,
        delivery_date=delivery_date,
        notes=DEMO_NOTE,
        order_source="MANUAL_DMS",
        order_type="COD",
    )
    payload.update(kwargs)
    return models.Order(**payload)


def seed_order_management():
    db = SessionLocal()
    created = {
        "delivery": 0,
        "route_wise": 0,
        "assigned": 0,
        "remaining_cash": 0,
        "collection_approval": 0,
        "lifecycle": 0,
        "memos_backfilled": 0,
    }

    try:
        products = db.query(models.Product).filter(models.Product.is_active == True).all() or db.query(models.Product).all()
        customers = db.query(models.Customer).all()
        employees = db.query(models.Employee).all()
        depots = db.query(models.Depot).all()
        routes = db.query(models.Route).filter(models.Route.status == "Active").all()
        vehicles = db.query(models.Vehicle).all()

        if not all([products, customers, employees, depots, routes, vehicles]):
            print("Missing master data (products, customers, employees, depots, routes, or vehicles).")
            return

        depot = next((d for d in depots if d.code == "120"), depots[0])
        memo_counter = [1]
        today = date.today()

        existing_demo = db.query(models.Order).filter(models.Order.notes == DEMO_NOTE).count()
        if existing_demo:
            print(f"OM-DEMO orders already present ({existing_demo}). Skipping new inserts, backfilling memos only.")
        else:
            # Delivery Order list — unvalidated
            for i in range(8):
                customer = customers[i % len(customers)]
                employee = employees[i % len(employees)]
                route = routes[i % len(routes)]
                order = _base_order(
                    depot=depot,
                    customer=customer,
                    employee=employee,
                    route=route,
                    delivery_date=today + timedelta(days=1 + (i % 4)),
                    status=models.OrderStatusEnum.SUBMITTED if i % 3 == 0 else models.OrderStatusEnum.APPROVED,
                    validated=False,
                    printed=False,
                    loaded=False,
                    postponed=False,
                    delivery_status="ORDER_CREATED",
                )
                db.add(order)
                db.flush()
                order.order_number = f"OM-DO-{order.id:04d}"
                _add_items(order, products[i % max(1, len(products) - 2) :], order.delivery_date, 40 + i * 5)
                created["delivery"] += 1

            # Route Wise Memo List — validated, not loaded
            for i, route in enumerate(routes):
                for j in range(2):
                    idx = i * 2 + j
                    customer = customers[idx % len(customers)]
                    employee = employees[idx % len(employees)]
                    order = _base_order(
                        depot=depot,
                        customer=customer,
                        employee=employee,
                        route=route,
                        delivery_date=today + timedelta(days=2),
                        status=models.OrderStatusEnum.APPROVED,
                        validated=True,
                        printed=j == 0,
                        printed_at=datetime.utcnow() if j == 0 else None,
                        loaded=False,
                        postponed=False,
                        delivery_status="ORDER_CREATED",
                        memo_number=_next_memo(db, memo_counter),
                    )
                    db.add(order)
                    db.flush()
                    order.order_number = f"OM-RW-{order.id:04d}"
                    _add_items(order, products[(idx) % max(1, len(products) - 2) :], order.delivery_date, 55 + idx * 3)
                    created["route_wise"] += 1

            # Assigned Order List — pending delivery (no collection yet)
            for group in range(2):
                employee = employees[group % len(employees)]
                vehicle = vehicles[group % len(vehicles)]
                route = routes[group % len(routes)]
                loading_number = f"LOAD-{today.strftime('%Y%m%d')}-A{group + 1:02d}"
                for j in range(3):
                    idx = group * 3 + j
                    customer = customers[idx % len(customers)]
                    order = _base_order(
                        depot=depot,
                        customer=customer,
                        employee=employee,
                        route=route,
                        delivery_date=today,
                        status=models.OrderStatusEnum.APPROVED,
                        validated=True,
                        printed=True,
                        printed_at=datetime.utcnow() - timedelta(hours=6),
                        loaded=True,
                        loaded_at=datetime.utcnow() - timedelta(hours=3),
                        postponed=False,
                        assigned_to=employee.id,
                        assigned_vehicle=vehicle.id,
                        assignment_date=datetime.utcnow() - timedelta(hours=4),
                        loading_number=loading_number,
                        loading_date=today,
                        area=route.name.split()[0] if route.name else "Area",
                        delivery_status="DELIVERY_IN_PROGRESS",
                        memo_number=_next_memo(db, memo_counter),
                    )
                    db.add(order)
                    db.flush()
                    order.order_number = f"OM-AS-{order.id:04d}"
                    _add_items(order, products[idx % max(1, len(products) - 2) :], order.delivery_date, 30 + idx * 4)
                    created["assigned"] += 1

            # Remaining Cash and Collection — Web
            remaining_specs = [
                ("Pending", None, Decimal("1")),
                ("Partially Collected", "Partial", Decimal("0.55")),
                ("Postponed", "Postponed", Decimal("0")),
                ("Fully Collected", None, Decimal("1")),
            ]
            for g, (status_name, collection_type, ratio) in enumerate(remaining_specs):
                employee = employees[(g + 1) % len(employees)]
                vehicle = vehicles[(g + 1) % len(vehicles)]
                route = routes[g % len(routes)]
                loading_number = f"LOAD-{today.strftime('%Y%m%d')}-C{g + 1:02d}"
                for j in range(3):
                    idx = g * 3 + j
                    customer = customers[idx % len(customers)]
                    order = _base_order(
                        depot=depot,
                        customer=customer,
                        employee=employee,
                        route=route,
                        delivery_date=today - timedelta(days=1),
                        status=models.OrderStatusEnum.APPROVED,
                        validated=True,
                        printed=True,
                        printed_at=datetime.utcnow() - timedelta(days=1),
                        loaded=True,
                        loaded_at=datetime.utcnow() - timedelta(hours=20),
                        postponed=status_name == "Postponed",
                        assigned_to=employee.id,
                        assigned_vehicle=vehicle.id,
                        assignment_date=datetime.utcnow() - timedelta(days=1),
                        loading_number=loading_number,
                        loading_date=today - timedelta(days=1),
                        area=route.name.split()[0] if route.name else "Area",
                        collection_status=status_name,
                        collection_type=collection_type,
                        collection_source="Web",
                        collection_approved=False,
                        delivery_status="DELIVERED" if status_name != "Postponed" else "POSTPONED",
                        memo_number=_next_memo(db, memo_counter),
                    )
                    db.add(order)
                    db.flush()
                    order.order_number = f"OM-RC-{order.id:04d}"
                    total = _add_items(order, products[idx % max(1, len(products) - 2) :], order.delivery_date, 48 + idx)
                    order.collected_amount = (total * ratio).quantize(Decimal("0.01"))
                    order.pending_amount = (total - order.collected_amount).quantize(Decimal("0.01"))
                    created["remaining_cash"] += 1

            # Approval for Collection — Mobile App
            mobile_specs = [
                ("Partially Collected", "Partial", Decimal("0.4")),
                ("Postponed", "Postponed", Decimal("0")),
            ]
            for g, (status_name, collection_type, ratio) in enumerate(mobile_specs):
                employee = employees[(g + 2) % len(employees)]
                vehicle = vehicles[(g + 2) % len(vehicles)]
                route = routes[(g + 1) % len(routes)]
                loading_number = f"LOAD-{today.strftime('%Y%m%d')}-M{g + 1:02d}"
                for j in range(3):
                    idx = g * 3 + j
                    customer = customers[(idx + 2) % len(customers)]
                    order = _base_order(
                        depot=depot,
                        customer=customer,
                        employee=employee,
                        route=route,
                        delivery_date=today,
                        status=models.OrderStatusEnum.APPROVED,
                        validated=True,
                        printed=True,
                        printed_at=datetime.utcnow() - timedelta(hours=8),
                        loaded=True,
                        loaded_at=datetime.utcnow() - timedelta(hours=5),
                        postponed=status_name == "Postponed",
                        assigned_to=employee.id,
                        assigned_vehicle=vehicle.id,
                        assignment_date=datetime.utcnow() - timedelta(hours=6),
                        loading_number=loading_number,
                        loading_date=today,
                        area=route.name.split()[0] if route.name else "Area",
                        collection_status=status_name,
                        collection_type=collection_type,
                        collection_source="Mobile App",
                        collection_approved=False,
                        delivery_status="DELIVERED" if status_name != "Postponed" else "POSTPONED",
                        memo_number=_next_memo(db, memo_counter),
                    )
                    db.add(order)
                    db.flush()
                    order.order_number = f"OM-CA-{order.id:04d}"
                    total = _add_items(order, products[idx % max(1, len(products) - 2) :], order.delivery_date, 36 + idx)
                    order.collected_amount = (total * ratio).quantize(Decimal("0.01"))
                    order.pending_amount = (total - order.collected_amount).quantize(Decimal("0.01"))
                    created["collection_approval"] += 1

            # Lifecycle / MIS — fully progressed order with a billed deposit
            employee = employees[0]
            vehicle = vehicles[0]
            route = routes[0]
            customer = customers[0]
            lifecycle = _base_order(
                depot=depot,
                customer=customer,
                employee=employee,
                route=route,
                delivery_date=today - timedelta(days=2),
                status=models.OrderStatusEnum.APPROVED,
                validated=True,
                printed=True,
                printed_at=datetime.utcnow() - timedelta(days=2),
                loaded=True,
                loaded_at=datetime.utcnow() - timedelta(days=2, hours=-6),
                postponed=False,
                assigned_to=employee.id,
                assigned_vehicle=vehicle.id,
                assignment_date=datetime.utcnow() - timedelta(days=2),
                loading_number=f"LOAD-{today.strftime('%Y%m%d')}-LF",
                loading_date=today - timedelta(days=2),
                area=route.name.split()[0] if route.name else "Area",
                collection_status="Fully Collected",
                collection_source="Web",
                collection_approved=True,
                collection_approved_at=datetime.utcnow() - timedelta(days=1),
                collection_approved_by=employee.id,
                delivery_status="DELIVERED",
                memo_number=_next_memo(db, memo_counter),
            )
            db.add(lifecycle)
            db.flush()
            lifecycle.order_number = f"OM-LF-{lifecycle.id:04d}"
            total = _add_items(lifecycle, products, lifecycle.delivery_date, 80)
            lifecycle.collected_amount = total
            lifecycle.pending_amount = Decimal("0")

            deposit_number = f"DEP-OM-{today.strftime('%Y%m%d')}-0001"
            deposit = db.query(models.CollectionDeposit).filter(
                models.CollectionDeposit.deposit_number == deposit_number
            ).first()
            if not deposit:
                deposit = models.CollectionDeposit(
                    deposit_number=deposit_number,
                    deposit_date=today - timedelta(days=1),
                    collection_person_id=employee.id,
                    deposit_method="bKash",
                    deposit_amount=total,
                    transaction_number=f"OMBK{today.strftime('%Y%m%d')}001",
                    remaining_amount=Decimal("0"),
                    total_collection_amount=total,
                    notes="OM-DEMO lifecycle deposit",
                    approved=True,
                    approved_by=employee.id,
                    approved_at=datetime.utcnow() - timedelta(hours=12),
                )
                db.add(deposit)
                db.flush()

            db.add(
                models.CollectionTransaction(
                    order_id=lifecycle.id,
                    collection_person_id=employee.id,
                    collection_date=today - timedelta(days=1),
                    collection_type=models.CollectionTypeEnum.FULLY_COLLECTED,
                    collected_amount=total,
                    pending_amount=Decimal("0"),
                    total_amount=total,
                    deposit_id=deposit.id,
                    remarks="OM-DEMO billed collection",
                )
            )
            created["lifecycle"] += 1

        # Backfill memo numbers so Remaining Cash / Approval / Assigned rows are searchable
        missing_memos = (
            db.query(models.Order)
            .filter(
                models.Order.memo_number.is_(None),
                models.Order.validated == True,
            )
            .all()
        )
        for order in missing_memos:
            order.memo_number = _next_memo(db, memo_counter)
            created["memos_backfilled"] += 1

        db.commit()
        print("Order Management demo seed complete:")
        for key, value in created.items():
            print(f"  {key}: {value}")
        print("  Search lifecycle tracker with an OM-LF- or OM-RW- order number / 8-digit memo.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main():
    seed_order_management()


if __name__ == "__main__":
    seed_order_management()
