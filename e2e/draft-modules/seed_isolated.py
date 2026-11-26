"""Seed synthetic Draft E2E fixtures. Refuses the live database name."""
from __future__ import annotations

import json
import os
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from datetime import date

from app.auth import get_password_hash
from app.models import Depot, Employee, Product
from app.services.isolated_inventory_simulation import IsoLotRow, create_isolated_schema

LIVE_NAME = "swift_distro_hub"
ALLOWED_NAMES = frozenset({"reneta_e2e", "f4b1b_iso"})
PASSWORD = os.environ.get("E2E_ISOLATED_PASSWORD", "E2eIsolatedPass!9")


def main() -> None:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise SystemExit("DATABASE_URL is required")
    dbname = url.rsplit("/", 1)[-1].split("?")[0]
    if dbname == LIVE_NAME or "swift_distro_hub" in url:
        raise SystemExit(f"Refusing to seed live database {dbname!r}")
    if dbname not in ALLOWED_NAMES:
        raise SystemExit(f"Expected one of {sorted(ALLOWED_NAMES)}, got {dbname!r}")

    engine = create_engine(url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    try:
        current = db.execute(text("SELECT current_database()")).scalar()
        if current not in ALLOWED_NAMES:
            raise SystemExit(f"current_database() is {current!r}")
        hashed = get_password_hash(PASSWORD)
        depot_a = db.query(Depot).order_by(Depot.id).first()
        if depot_a is None:
            depot_a = Depot(name="E2E Depot A", code="E2E-A")
            db.add(depot_a)
            db.flush()
        depot_b = db.query(Depot).filter(Depot.code == "E2E-B").first()
        if depot_b is None:
            depot_b = Depot(name="E2E Depot B", code="E2E-B")
            db.add(depot_b)
            db.flush()

        def upsert_user(employee_id, email, first, role, depot_id):
            row = (
                db.query(Employee)
                .filter((Employee.email == email) | (Employee.employee_id == employee_id))
                .first()
            )
            if row is None:
                row = Employee(
                    employee_id=employee_id,
                    first_name=first,
                    last_name="E2E",
                    email=email,
                    hashed_password=hashed,
                    role=role,
                    depot_id=depot_id,
                    is_active=True,
                    is_blocked=False,
                )
                db.add(row)
            else:
                row.email = email
                row.hashed_password = hashed
                row.role = role
                row.depot_id = depot_id
                row.is_active = True
                row.is_blocked = False
            return row

        upsert_user("E2E-ADM", "e2e.admin.f4b1b@example.com", "E2EAdmin", "admin", depot_a.id)
        upsert_user("E2E-MGR", "e2e.manager.f4b1b@example.com", "E2EManager", "manager", depot_a.id)
        upsert_user("E2E-PSO", "e2e.pso.f4b1b@example.com", "E2EPSO", "user", depot_a.id)
        upsert_user("E2E-FRN", "e2e.foreign.f4b1b@example.com", "E2EForeign", "user", depot_b.id)
        upsert_user(
            "E2E-FRN-MGR",
            "e2e.foreign.manager.f4b1b@example.com",
            "E2EForeignMgr",
            "manager",
            depot_b.id,
        )
        upsert_user("E2E-BILL", "e2e.billing.f4b1b@example.com", "E2EBilling", "billing", depot_a.id)

        sample = db.query(Product).filter(Product.code == "E2E-SAMPLE-SKU").first()
        if sample is None:
            sample = Product(
                name="E2E Sample Product",
                code="E2E-SAMPLE-SKU",
                sku="E2E-SAMPLE-SKU",
                product_type_sample=True,
                product_type_export=False,
                is_active=True,
            )
            db.add(sample)
        else:
            sample.product_type_sample = True
            sample.is_active = True

        export = db.query(Product).filter(Product.code == "E2E-EXPORT-SKU").first()
        if export is None:
            export = Product(
                name="E2E Export Product",
                code="E2E-EXPORT-SKU",
                sku="E2E-EXPORT-SKU",
                product_type_sample=False,
                product_type_export=True,
                is_active=True,
            )
            db.add(export)
        else:
            export.product_type_export = True
            export.is_active = True

        db.flush()
        create_isolated_schema(engine)
        today = date.today()
        existing_lot = db.query(IsoLotRow).filter(IsoLotRow.batch_no == "SG-EARLY").first()
        if existing_lot is None:
            db.add_all(
                [
                    IsoLotRow(
                        depot_id=depot_a.id,
                        product_id=sample.id,
                        batch_no="SG-EXPIRED",
                        expiry_date=date(today.year - 1, 1, 1),
                        quantity=100,
                        available=100,
                        reserved=0,
                        status="Unrestricted",
                        product_active=1,
                    ),
                    IsoLotRow(
                        depot_id=depot_a.id,
                        product_id=sample.id,
                        batch_no="SG-EARLY",
                        expiry_date=date(today.year + 1, 1, 15),
                        quantity=20,
                        available=20,
                        reserved=0,
                        status="Unrestricted",
                        product_active=1,
                    ),
                    IsoLotRow(
                        depot_id=depot_a.id,
                        product_id=sample.id,
                        batch_no="SG-LATE",
                        expiry_date=date(today.year + 2, 6, 1),
                        quantity=80,
                        available=80,
                        reserved=0,
                        status="Unrestricted",
                        product_active=1,
                    ),
                    IsoLotRow(
                        depot_id=depot_a.id,
                        product_id=sample.id,
                        batch_no="SG-NULL",
                        expiry_date=None,
                        quantity=40,
                        available=40,
                        reserved=0,
                        status="Unrestricted",
                        product_active=1,
                    ),
                    IsoLotRow(
                        depot_id=depot_a.id,
                        product_id=sample.id,
                        batch_no="SG-HOLD",
                        expiry_date=date(today.year + 1, 3, 1),
                        quantity=30,
                        available=30,
                        reserved=0,
                        status="Restricted",
                        product_active=1,
                    ),
                    IsoLotRow(
                        depot_id=depot_a.id,
                        product_id=export.id,
                        batch_no="EX-EARLY",
                        expiry_date=date(today.year + 1, 2, 1),
                        quantity=15,
                        available=15,
                        reserved=0,
                        status="Unrestricted",
                        product_active=1,
                    ),
                    IsoLotRow(
                        depot_id=depot_a.id,
                        product_id=export.id,
                        batch_no="EX-LATE",
                        expiry_date=date(today.year + 3, 1, 1),
                        quantity=60,
                        available=60,
                        reserved=0,
                        status="Unrestricted",
                        product_active=1,
                    ),
                    IsoLotRow(
                        depot_id=depot_a.id,
                        product_id=export.id,
                        batch_no="EX-EXPIRED",
                        expiry_date=date(today.year - 1, 5, 1),
                        quantity=50,
                        available=50,
                        reserved=0,
                        status="Unrestricted",
                        product_active=1,
                    ),
                ]
            )
        db.commit()
        db.refresh(sample)
        db.refresh(export)
        payload = {
            "database": current,
            "depot_a_id": depot_a.id,
            "depot_b_id": depot_b.id,
            "sample_product_id": sample.id,
            "export_product_id": export.id,
        }
        print("ISOLATION_JSON:" + json.dumps(payload))
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
