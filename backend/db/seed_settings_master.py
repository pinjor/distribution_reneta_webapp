"""Seed settings/master-data pages: vendors, UOM, packaging, prices, roles, shipping points."""

from datetime import date, timedelta
from decimal import Decimal

from app.database import SessionLocal
from app import models


def upsert_by_code(session, model, code_field, payload):
    code = payload[code_field]
    record = session.query(model).filter(getattr(model, code_field) == code).first()
    if record:
        for key, value in payload.items():
            setattr(record, key, value)
        return record
    record = model(**payload)
    session.add(record)
    session.flush()
    return record


def seed_settings_master():
    db = SessionLocal()
    try:
        depots = db.query(models.Depot).all()
        products = db.query(models.Product).all()
        employees = db.query(models.Employee).all()
        routes = db.query(models.Route).all()

        if not depots:
            print("⚠️  No depots found. Run seed_master_data first.")
            return

        # Vendors
        vendors = [
            {"name": "Square Pharmaceuticals Ltd", "code": "VEND-001", "city": "Dhaka", "state": "Dhaka", "phone": "+880 9611-111111", "email": "supply@squarepharma.com"},
            {"name": "Beximco Pharma Distribution", "code": "VEND-002", "city": "Dhaka", "state": "Dhaka", "phone": "+880 9611-222222", "email": "dist@beximco.com"},
            {"name": "MediCare Cold Chain BD", "code": "VEND-003", "city": "Khulna", "state": "Khulna", "phone": "+880 9611-333333", "email": "coldchain@medicare.bd"},
            {"name": "Incepta Logistics", "code": "VEND-004", "city": "Dhaka", "state": "Dhaka", "phone": "+880 9611-444444", "email": "logistics@incepta.com"},
            {"name": "Opsonin Distribution Hub", "code": "VEND-005", "city": "Chattogram", "state": "Chattogram", "phone": "+880 9611-555555", "email": "hub@opsonin.com"},
        ]
        for v in vendors:
            upsert_by_code(db, models.Vendor, "code", v)

        # UOM
        uoms = [
            {"code": "PCS", "name": "Pieces", "description": "Individual units"},
            {"code": "NOS", "name": "Numbers", "description": "Count-based unit"},
            {"code": "IFC", "name": "IFC", "description": "Inner foil count"},
            {"code": "BTL", "name": "Bottle", "description": "Bottle packaging"},
            {"code": "STR", "name": "Strip", "description": "Blister strip"},
            {"code": "PHL", "name": "Phial", "description": "Small liquid container"},
        ]
        uom_map = {}
        for u in uoms:
            uom_map[u["code"]] = upsert_by_code(db, models.UOM, "code", u)

        # Primary packaging
        packagings = [
            {"code": "BTL", "name": "Bottle", "description": "Bottle primary pack"},
            {"code": "BLR", "name": "Blister", "description": "Blister strip pack"},
            {"code": "VIL", "name": "Vial", "description": "Vial pack"},
            {"code": "INJ", "name": "Injection", "description": "Injection ampoule/vial"},
            {"code": "SYP", "name": "Syrup", "description": "Syrup bottle"},
        ]
        pack_map = {}
        for p in packagings:
            pack_map[p["code"]] = upsert_by_code(db, models.PrimaryPackaging, "code", p)

        # Link products to UOM/packaging where possible
        for product in products:
            uom_code = "PCS"
            if product.unit_of_measure:
                uom_code = product.unit_of_measure.upper()[:3]
                if uom_code not in uom_map:
                    uom_code = "PCS"
            product.uom_id = uom_map.get(uom_code, uom_map["PCS"]).id
            pack_code = "BLR"
            if product.primary_packaging:
                name = product.primary_packaging.lower()
                if "bottle" in name:
                    pack_code = "BTL"
                elif "vial" in name:
                    pack_code = "VIL"
                elif "injection" in name:
                    pack_code = "INJ"
            product.primary_packaging_id = pack_map.get(pack_code, pack_map["BLR"]).id

        # Price setup
        today = date.today()
        for idx, product in enumerate(products[:12]):
            code = f"PRICE-{product.code}"
            existing = db.query(models.PriceSetup).filter(models.PriceSetup.code == code).first()
            if existing:
                continue
            base = float(product.base_price or 100)
            db.add(models.PriceSetup(
                code=code,
                product_id=product.id,
                trade_price=Decimal(str(base)),
                unit_price=Decimal(str(round(base * 0.95, 2))),
                ifc_price=Decimal(str(round(base * 0.90, 2))),
                mc_price=Decimal(str(round(base * 0.88, 2))),
                validity_start_date=today - timedelta(days=30),
                validity_end_date=today + timedelta(days=365),
                is_active=True,
            ))

        # Role hierarchy
        roles_data = [
            {"code": "ROLE-NSH-001", "role_type": models.RoleTypeEnum.NSH, "name": "National Sales Head", "territory": "Bangladesh", "region": "National"},
            {"code": "ROLE-TSM-001", "role_type": models.RoleTypeEnum.TSM, "name": "Territory Manager - Khulna", "territory": "Khulna", "region": "South", "parent_code": "ROLE-NSH-001"},
            {"code": "ROLE-RSM-001", "role_type": models.RoleTypeEnum.RSM, "name": "Regional Manager - Dhaka", "territory": "Dhaka", "region": "Central", "parent_code": "ROLE-NSH-001"},
            {"code": "ROLE-DSM-001", "role_type": models.RoleTypeEnum.DSM, "name": "District Manager - Kushtia", "territory": "Kushtia", "district": "Kushtia", "parent_code": "ROLE-TSM-001"},
            {"code": "ROLE-SM-001", "role_type": models.RoleTypeEnum.SM, "name": "Sales Manager - Route North", "area": "North Circuit", "parent_code": "ROLE-DSM-001"},
            {"code": "ROLE-SO-001", "role_type": models.RoleTypeEnum.SO, "name": "Sales Officer - Rahim Uddin", "area": "Kushtia North", "parent_code": "ROLE-SM-001", "employee_idx": 0},
            {"code": "ROLE-SO-002", "role_type": models.RoleTypeEnum.SO, "name": "Sales Officer - Karim Ahmed", "area": "Khulna South", "parent_code": "ROLE-SM-001", "employee_idx": 1},
            {"code": "ROLE-SO-003", "role_type": models.RoleTypeEnum.SO, "name": "Sales Officer - Farhana Akter", "area": "Dhaka East", "parent_code": "ROLE-RSM-001", "employee_idx": 2},
        ]
        role_map = {}
        for role in roles_data:
            parent_code = role.pop("parent_code", None)
            employee_idx = role.pop("employee_idx", None)
            parent_id = role_map[parent_code].id if parent_code and parent_code in role_map else None
            employee_id = employees[employee_idx].id if employee_idx is not None and employee_idx < len(employees) else None
            record = upsert_by_code(db, models.RoleMaster, "code", {**role, "parent_id": parent_id, "employee_id": employee_id})
            role_map[record.code] = record

        # Shipping points
        depot_by_idx = {i: d for i, d in enumerate(depots)}
        shipping_points = [
            {"code": "SP-KHT-001", "name": "Kushtia Bazaar Hub", "depot_id": depot_by_idx.get(0, depots[0]).id, "city": "Kushtia", "state": "Khulna", "address": "Ishwardi Bypass Road"},
            {"code": "SP-KHT-002", "name": "Bheramara Distribution Point", "depot_id": depot_by_idx.get(0, depots[0]).id, "city": "Bheramara", "state": "Khulna", "address": "Bheramara Main Road"},
            {"code": "SP-KHL-001", "name": "Sonadanga Market", "depot_id": depot_by_idx.get(1, depots[0]).id, "city": "Khulna", "state": "Khulna", "address": "KDA Avenue"},
            {"code": "SP-KHL-002", "name": "Daulatpur Loading Bay", "depot_id": depot_by_idx.get(1, depots[0]).id, "city": "Khulna", "state": "Khulna", "address": "Daulatpur Industrial Area"},
            {"code": "SP-DHK-001", "name": "Badda Distribution Hub", "depot_id": depot_by_idx.get(2, depots[0]).id, "city": "Dhaka", "state": "Dhaka", "address": "Satarkul Road, Badda"},
            {"code": "SP-DHK-002", "name": "Gulshan Delivery Point", "depot_id": depot_by_idx.get(2, depots[0]).id, "city": "Dhaka", "state": "Dhaka", "address": "Gulshan-2"},
            {"code": "SP-CTG-001", "name": "Agrabad Pharma Point", "depot_id": depot_by_idx.get(0, depots[0]).id, "city": "Chattogram", "state": "Chattogram", "address": "Agrabad C/A"},
            {"code": "SP-RJB-001", "name": "Rajbari Clinic Hub", "depot_id": depot_by_idx.get(0, depots[0]).id, "city": "Rajbari", "state": "Dhaka", "address": "Rajbari Sadar"},
        ]
        sp_map = {}
        for sp in shipping_points:
            sp_map[sp["code"]] = upsert_by_code(db, models.ShippingPoint, "code", sp)

        # Route shipping points
        if routes:
            sp_list = list(sp_map.values())
            for route_idx, route in enumerate(routes[:5]):
                for seq, sp in enumerate(sp_list[route_idx:route_idx + 3], start=1):
                    existing = db.query(models.RouteShippingPoint).filter(
                        models.RouteShippingPoint.route_id == route.id,
                        models.RouteShippingPoint.shipping_point_id == sp.id,
                    ).first()
                    if existing:
                        continue
                    db.add(models.RouteShippingPoint(
                        route_id=route.id,
                        shipping_point_id=sp.id,
                        distance_km=Decimal(str(5 + seq * 3.5)),
                        sequence=seq,
                        is_active=True,
                    ))

        db.commit()
        print(f"✅ Settings master data seeded: {len(vendors)} vendors, {len(uoms)} UOMs, {len(packagings)} packagings, {len(roles_data)} roles, {len(shipping_points)} shipping points")
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding settings master: {e}")
        raise
    finally:
        db.close()


def main():
    seed_settings_master()


if __name__ == "__main__":
    main()
