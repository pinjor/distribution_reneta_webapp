"""Isolated opening-stock arithmetic. Never writes ProductItemStock / StockLedger."""
from collections import defaultdict
from decimal import Decimal
from typing import Iterable


class OpeningStockSimulationError(Exception):
    pass


def simulate_post(lines: Iterable[dict], existing: dict | None = None) -> dict:
    """Apply opening quantities onto an in-memory map keyed by (depot_id, product_id, batch)."""
    balances = defaultdict(lambda: Decimal("0"), existing or {})
    seen = set()
    for line in lines:
        key = (int(line["depot_id"]), int(line["product_id"]), str(line["batch_number"]))
        if key in seen:
            raise OpeningStockSimulationError("duplicate product/batch in posting set")
        seen.add(key)
        qty = Decimal(str(line["quantity"]))
        if qty <= 0:
            raise OpeningStockSimulationError("quantity must be greater than 0")
        if key in balances and balances[key] > 0:
            raise OpeningStockSimulationError("opening already simulated for this batch")
        balances[key] += qty
    return dict(balances)
