from __future__ import annotations

import hashlib
import json
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from app.services.logicollect.errors import LcError

DHAKA = ZoneInfo("Asia/Dhaka")
ZERO = Decimal("0")


def now_dhaka() -> datetime:
    return datetime.now(DHAKA)


def business_date(at: datetime | None = None) -> date:
    return (at or now_dhaka()).astimezone(DHAKA).date()


def iso_dt(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=DHAKA)
    return value.astimezone(DHAKA).isoformat()


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value[:10])


def D(value) -> Decimal:
    if value is None:
        return ZERO
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def to_int_bdt(value) -> int:
    amount = D(value)
    if amount != amount.to_integral_value():
        raise ValueError("fractional taka")
    return int(amount)


def require_int_bdt(value, field: str) -> int:
    try:
        return to_int_bdt(value)
    except Exception:
        raise LcError(
            409,
            "MONEY_FRACTION_UNSUPPORTED",
            f"{field} contains fractional taka and cannot be exposed as integer BDT.",
        )


def payload_hash(obj) -> str:
    raw = json.dumps(obj, sort_keys=True, default=str, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def next_business_day(from_day: date | None = None) -> date:
    day = from_day or business_date()
    return day + timedelta(days=1)


def start_of_day(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=DHAKA)


def end_of_day(day: date) -> datetime:
    return datetime.combine(day, time.max, tzinfo=DHAKA)
