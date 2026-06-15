"""Reporting API with registry, filters, and export."""
import csv
import io
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.database import get_db
from app.models import Employee
from app.services.report_registry import REPORT_REGISTRY, run_report

router = APIRouter()


@router.get("/registry")
def list_reports(user: Employee = Depends(require_permission("reports.read"))):
    return [
        {"id": rid, "name": meta["name"], "category": meta["category"]}
        for rid, meta in REPORT_REGISTRY.items()
    ]


@router.get("/{report_id}")
def get_report(
    report_id: str,
    depot_code: Optional[str] = None,
    order_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("reports.read")),
):
    params: Dict[str, Any] = {"depot_code": depot_code, "order_id": order_id, "date_from": date_from, "date_to": date_to}
    if (user.role or "").lower() != "admin" and user.depot_id:
        from app.models import Depot
        depot = db.query(Depot).filter(Depot.id == user.depot_id).first()
        if depot and not params.get("depot_code"):
            params["depot_code"] = depot.code
    try:
        return run_report(db, report_id, params)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{report_id}/export")
def export_report_csv(
    report_id: str,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("reports.export")),
):
    data = run_report(db, report_id, {})
    rows = data.get("rows", [])
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    else:
        output.write("no_data\n")
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{report_id}.csv"'},
    )
