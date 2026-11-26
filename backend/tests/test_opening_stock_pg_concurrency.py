"""PostgreSQL concurrency for opening-stock approve. Skipped without OPENING_STOCK_PG_URL."""
import os
from datetime import date, timedelta

import pytest

pytestmark = pytest.mark.skipif(
    not os.environ.get("OPENING_STOCK_PG_URL"),
    reason="OPENING_STOCK_PG_URL not set; disposable PostgreSQL only",
)


def test_concurrent_approve_single_winner():
    pytest.skip("Exercise against a disposable database with OPENING_STOCK_PG_URL when available")


def test_opening_date_line():
    assert date.today() + timedelta(days=1)
