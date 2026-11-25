"""Row locks for Sample/Gift and Export document headers.

PUT and the isolated transition helper must lock the same primary-key row
with SELECT FOR UPDATE so Draft updates serialize against Submit.
"""
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.depot_scope import hide_foreign_depot
from app.models import Employee

DRAFT_STATUS = "Draft"
NOT_DRAFT_DETAIL = "Only Draft documents can be updated"


def load_document_for_update(db: Session, model, document_id: int):
    row = (
        db.query(model)
        .filter(model.id == document_id)
        .with_for_update()
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return row


def require_draft_for_write(db: Session, model, document_id: int, user: Employee):
    """Lock the header, hide foreign depots, then require status Draft.

    Raises 409 if another transaction already moved the document out of Draft.
    """
    row = load_document_for_update(db, model, document_id)
    hide_foreign_depot(user, row.depot_id)
    if (row.status or DRAFT_STATUS) != DRAFT_STATUS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=NOT_DRAFT_DETAIL,
        )
    return row


def abort_unlocked(db: Session) -> None:
    """Release FOR UPDATE by rolling back an incomplete write."""
    db.rollback()


def commit_draft_write(db: Session) -> None:
    """Commit header + items, or roll back without leaking SQL text."""
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Delivery number already exists",
        )
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The document could not be saved",
        )
