"""Seed extra company master records for UI testing."""
from app.database import SessionLocal
from app.models import Company
from db.seed_master_data import DATA_COMPANIES, upsert_company


def seed_companies():
    db = SessionLocal()
    try:
        created = 0
        updated = 0
        for payload in DATA_COMPANIES:
            existing = db.query(Company).filter(Company.code == payload["code"]).first()
            upsert_company(db, payload)
            if existing:
                updated += 1
            else:
                created += 1
        db.commit()
        total = db.query(Company).count()
        print(f"Company seed complete. Created {created}, updated {updated}. Total companies: {total}")
        for company in db.query(Company).order_by(Company.code.asc()).all():
            status = "active" if company.is_active else "inactive"
            print(f"  - {company.code}  {company.name}  ({status})")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main():
    seed_companies()


if __name__ == "__main__":
    main()
