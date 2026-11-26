from decimal import Decimal

import pytest

from app.services.opening_stock_simulation import OpeningStockSimulationError, simulate_post


def test_opening_arithmetic():
    result = simulate_post(
        [
            {"depot_id": 1, "product_id": 9, "batch_number": "A", "quantity": 500},
        ]
    )
    assert result[(1, 9, "A")] == Decimal("500")


def test_simulation_rejects_duplicate_and_non_positive():
    with pytest.raises(OpeningStockSimulationError):
        simulate_post(
            [
                {"depot_id": 1, "product_id": 9, "batch_number": "A", "quantity": 1},
                {"depot_id": 1, "product_id": 9, "batch_number": "A", "quantity": 1},
            ]
        )
    with pytest.raises(OpeningStockSimulationError):
        simulate_post([{"depot_id": 1, "product_id": 9, "batch_number": "A", "quantity": 0}])
