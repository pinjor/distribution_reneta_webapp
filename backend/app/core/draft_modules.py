"""Availability of F.2/F.3 draft tables while live remains on d4_baseline.

Does not run Alembic. Missing tables return HTTP 503, not 500.
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy import inspect
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.database import get_db

SAMPLE_GIFT_TABLES = ("sample_gift_deliveries", "sample_gift_delivery_items")
EXPORT_TABLES = ("export_deliveries", "export_delivery_items")

SAMPLE_GIFT_UNAVAILABLE = (
    "Sample/Gift draft storage is unavailable until Alembic revision "
    "f2_sample_gift_draft is applied. Live remains at d4_baseline until that upgrade is approved."
)
EXPORT_UNAVAILABLE = (
    "Export draft storage is unavailable until Alembic revision "
    "f3_export_draft is applied. Apply f2_sample_gift_draft then f3_export_draft on an approved database."
)


def tables_exist(bind: Engine, table_names: tuple[str, ...]) -> bool:
    existing = set(inspect(bind).get_table_names())
    return all(name in existing for name in table_names)


def require_sample_gift_schema(db: Session = Depends(get_db)) -> Session:
    if not tables_exist(db.get_bind(), SAMPLE_GIFT_TABLES):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=SAMPLE_GIFT_UNAVAILABLE,
        )
    return db


def require_export_schema(db: Session = Depends(get_db)) -> Session:
    if not tables_exist(db.get_bind(), EXPORT_TABLES):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=EXPORT_UNAVAILABLE,
        )
    return db
