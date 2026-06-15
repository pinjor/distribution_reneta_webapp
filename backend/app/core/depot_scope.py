"""Depot-scoped query helpers for multi-depot data isolation."""
from typing import Optional, TypeVar

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


def apply_depot_code_filter(
    query: Query,
    user: Employee,
    depot_code_column: ColumnElement,
    db,
) -> Query:
    """Restrict query to user's depot unless admin."""
    if is_admin(user):
        return query
    code = user_depot_code(db, user)
    if code:
        return query.filter(depot_code_column == code)
    return query


def apply_depot_id_filter(
    query: Query,
    user: Employee,
    depot_id_column: ColumnElement,
) -> Query:
    """Restrict query to user's depot_id unless admin."""
    if is_admin(user):
        return query
    if user and user.depot_id:
        return query.filter(depot_id_column == user.depot_id)
    return query


def apply_depot_self_filter(query: Query, user: Employee) -> Query:
    """For Depot model lists — non-admins see only their depot."""
    if is_admin(user):
        return query
    if user and user.depot_id:
        return query.filter(Depot.id == user.depot_id)
    return query


def apply_depot_transfer_filter(query: Query, user: Employee, transfer_model) -> Query:
    """Depot transfers visible if user's depot is source or destination."""
    if is_admin(user):
        return query
    if user and user.depot_id:
        from sqlalchemy import or_

        return query.filter(
            or_(
                transfer_model.from_depot_id == user.depot_id,
                transfer_model.to_depot_id == user.depot_id,
            )
        )
    return query


def coerce_depot_id_param(user: Employee, requested: Optional[int]) -> Optional[int]:
    """Non-admins cannot override depot_id query params."""
    if is_admin(user):
        return requested
    return user.depot_id if user else requested
