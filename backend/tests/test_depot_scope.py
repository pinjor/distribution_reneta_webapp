"""Depot scoping on list endpoints."""
from datetime import date

from app.models import Depot, Employee, Order, OrderStatusEnum, Vehicle
from app.core.depot_scope import apply_depot_code_filter, apply_depot_id_filter


def test_non_admin_orders_list_scoped(db_session, admin_user):
    depot_a = Depot(name="Depot A", code="DEP-A", city="Dhaka")
    depot_b = Depot(name="Depot B", code="DEP-B", city="Chittagong")
    db_session.add_all([depot_a, depot_b])
    db_session.flush()

    user_a = Employee(
        employee_id="EMP-A",
        email="depot_a@test.com",
        first_name="Depot",
        last_name="User A",
        role="manager",
        depot_id=depot_a.id,
        is_active=True,
    )
    db_session.add(user_a)
    db_session.flush()

    order_a = Order(
        order_number="ORD-A",
        customer_id="C1",
        customer_name="Customer A",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
        depot_code="DEP-A",
        route_code="R1",
        validated=False,
    )
    order_b = Order(
        order_number="ORD-B",
        customer_id="C2",
        customer_name="Customer B",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
        depot_code="DEP-B",
        route_code="R2",
        validated=False,
    )
    db_session.add_all([order_a, order_b])
    db_session.commit()

    query = db_session.query(Order)
    scoped = apply_depot_code_filter(query, user_a, Order.depot_code, db_session).all()
    codes = {o.depot_code for o in scoped}
    assert codes == {"DEP-A"}


def test_admin_sees_all_vehicles(db_session, admin_user):
    depot = Depot(name="Main", code="MAIN", city="Dhaka")
    db_session.add(depot)
    db_session.flush()
    db_session.add_all([
        Vehicle(
            vehicle_id="V1", vehicle_type="Van", registration_number="DHK-111",
            depot_id=depot.id,
        ),
        Vehicle(
            vehicle_id="V2", vehicle_type="Van", registration_number="CTG-222",
            depot_id=None,
        ),
    ])
    db_session.commit()

    all_vehicles = apply_depot_id_filter(db_session.query(Vehicle), admin_user, Vehicle.depot_id).all()
    assert len(all_vehicles) == 2
