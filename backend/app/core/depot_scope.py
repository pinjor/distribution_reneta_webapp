"""Depot-scoped query helpers for multi-depot data isolation."""
from typing import Optional, TypeVar

from fastapi import HTTPException, status
from sqlalchemy import false
from sqlalchemy.orm import Query
from sqlalchemy.sql.elements import ColumnElement

from app.models import Depot, Employee

T = TypeVar("T")


def user_depot_code(db, user: Employee) -> Optional[str]:
    if not user or not user.depot_id:
        return None
    depot = db.query(Depot).filter(Depot.id == user.depot_id).first()
    return depot.code if depot else None


def is_admin(user: Employee) -> bool:
    return (user.role or "").lower() == "admin"


def _no_rows(query: Query) -> Query:
    return query.filter(false())


def apply_depot_code_filter(
    query: Query,
    user: Employee,
    depot_code_column: ColumnElement,
    db,
) -> Query:
    """Restrict query to user's depot unless admin. Unassigned users see nothing."""
    if is_admin(user):
        return query
    code = user_depot_code(db, user)
    if not code:
        return _no_rows(query)
    return query.filter(depot_code_column == code)


def apply_depot_id_filter(
    query: Query,
    user: Employee,
    depot_id_column: ColumnElement,
) -> Query:
    """Restrict query to user's depot_id unless admin. Unassigned users see nothing."""
    if is_admin(user):
        return query
    if not user or not user.depot_id:
        return _no_rows(query)
    return query.filter(depot_id_column == user.depot_id)


def apply_depot_self_filter(query: Query, user: Employee) -> Query:
    """For Depot model lists — non-admins see only their depot."""
    if is_admin(user):
        return query
    if not user or not user.depot_id:
        return _no_rows(query)
    return query.filter(Depot.id == user.depot_id)


def apply_depot_transfer_filter(query: Query, user: Employee, transfer_model) -> Query:
    """Depot transfers visible if user's depot is source or destination."""
    if is_admin(user):
        return query
    if not user or not user.depot_id:
        return _no_rows(query)
    from sqlalchemy import or_

    return query.filter(
        or_(
            transfer_model.from_depot_id == user.depot_id,
            transfer_model.to_depot_id == user.depot_id,
        )
    )


def coerce_depot_id_param(user: Employee, requested: Optional[int]) -> Optional[int]:
    """Non-admins cannot override depot_id query params."""
    if is_admin(user):
        return requested
    if not user or not user.depot_id:
        return -1
    return user.depot_id


def assign_depot_for_write(user: Employee, requested: Optional[int]) -> Optional[int]:
    """Depot id to store on create or update.

    Admin may choose any depot, including none.
    A non-admin may only write their own depot. Omitting the id uses that depot.
    A non-admin with no depot assignment is rejected.
    """
    if is_admin(user):
        return requested
    if not user or not user.depot_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No depot assignment")
    if requested is not None and requested != user.depot_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied for this depot")
    return user.depot_id


def hide_foreign_depot(user: Employee, depot_id: Optional[int]) -> None:
    """404 when a single record is outside the caller's depot. Avoids confirming it exists."""
    if is_admin(user):
        return
    if not user or not user.depot_id or depot_id != user.depot_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


def hide_transfer(user: Employee, from_depot_id: Optional[int], to_depot_id: Optional[int]) -> None:
    if is_admin(user):
        return
    if not user or not user.depot_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if user.depot_id not in (from_depot_id, to_depot_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


def stamp_depot_code(db, user: Employee, requested: Optional[str]) -> Optional[str]:
    """Depot code stored on an order. Admin may set any code. Others are pinned to their depot."""
    if is_admin(user):
        return requested
    code = user_depot_code(db, user)
    if not code:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No depot assignment")
    if requested and requested != code:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied for this depot")
    return code


def hide_order(db, user: Employee, order, detail: str = "Not found", missing_ok: bool = True) -> None:
    """404 when an order belongs to another depot. A missing order is left for the caller unless missing_ok is false."""
    if is_admin(user):
        return
    if order is None:
        if missing_ok:
            return
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    code = user_depot_code(db, user)
    if not code or order.depot_code != code:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def restrict_orders(db, user: Employee, orders, detail: str = "Not found") -> list:
    """Keep a batch only when every row is in the caller's depot. One foreign row hides the batch."""
    rows = list(orders)
    if is_admin(user):
        return rows
    code = user_depot_code(db, user)
    if not code or any(order.depot_code != code for order in rows):
        if rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    return rows


def filter_orders(db, user: Employee, orders) -> list:
    """Drop orders outside the caller's depot. Used by lists, not by writes."""
    rows = list(orders)
    if is_admin(user):
        return rows
    code = user_depot_code(db, user)
    if not code:
        return []
    return [order for order in rows if order.depot_code == code]
