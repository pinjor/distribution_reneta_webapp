"""Proposed Sample/Gift and Export product eligibility.

Policy status is pending. Draft routers must not import this until a product
owner signs the F.4A decision table. Live Draft writes remain disabled.

Proposed rules (not approved):
- sample and gift require product_type_sample
- export requires product_type_export
- inactive products are rejected
- multiple category flags on one SKU are allowed
"""
from typing import Iterable, Literal, Mapping, Sequence

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Product

POLICY_STATUS = "pending"
POLICY_APPROVED = False

DraftCategory = Literal["sample", "gift", "export"]

REQUIRED_FLAG: Mapping[DraftCategory, str] = {
    "sample": "product_type_sample",
    "gift": "product_type_sample",
    "export": "product_type_export",
}

CATEGORY_LABEL = {
    "sample": "Sample",
    "gift": "Gift",
    "export": "Export",
}


def required_flag_for(category: DraftCategory) -> str:
    if category not in REQUIRED_FLAG:
        raise ValueError(f"Unknown draft category: {category}")
    return REQUIRED_FLAG[category]


def product_is_eligible(product: Product, category: DraftCategory) -> bool:
    flag = required_flag_for(category)
    return bool(getattr(product, flag, False))


def require_eligible_products(
    db: Session,
    product_ids: Sequence[int],
    category: DraftCategory,
    *,
    require_active: bool = True,
) -> dict[int, Product]:
    """Load products and apply the proposed eligibility policy.

    Raises HTTP 400. Does not write inventory or documents.
    """
    ids = list(dict.fromkeys(int(pid) for pid in product_ids))
    if not ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one product_id is required",
        )
    rows = db.query(Product).filter(Product.id.in_(ids)).all()
    found = {row.id: row for row in rows}
    missing = sorted(set(ids) - set(found))
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid product_id: {', '.join(str(i) for i in missing)}",
        )
    inactive = sorted(pid for pid in ids if require_active and not found[pid].is_active)
    if inactive:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inactive product_id: {', '.join(str(i) for i in inactive)}",
        )
    ineligible = [
        pid for pid in ids if not product_is_eligible(found[pid], category)
    ]
    if ineligible:
        label = CATEGORY_LABEL[category]
        flag = required_flag_for(category)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Product not eligible for {label} delivery "
                f"(requires {flag}=true): {', '.join(str(i) for i in ineligible)}"
            ),
        )
    return found


def collect_line_product_ids(items: Iterable) -> list[int]:
    return [int(item.product_id) for item in items]


def category_for_sample_gift(document_kind: str) -> DraftCategory:
    kind = (document_kind or "").strip().lower()
    if kind not in ("sample", "gift"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="document_kind must be 'sample' or 'gift'",
        )
    return kind  # type: ignore[return-value]


def validate_lines_for_submit(
    db: Session,
    items: Iterable,
    category: DraftCategory,
    *,
    require_active: bool = True,
) -> dict[int, Product]:
    """Proposed submit-time eligibility. Not called by Draft routers until Gate B."""
    return require_eligible_products(
        db,
        collect_line_product_ids(items),
        category,
        require_active=require_active,
    )
