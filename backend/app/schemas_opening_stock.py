from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class OpeningStockItemIn(BaseModel):
    productId: int
    batchNumber: str
    manufacturingDate: Optional[date] = None
    expiryDate: date
    quantity: float
    unitOfMeasure: Optional[str] = None
    unitCost: Optional[float] = None
    remarks: Optional[str] = None


class OpeningStockCreate(BaseModel):
    depotId: int
    openingDate: date
    remarks: Optional[str] = None
    items: list[OpeningStockItemIn] = Field(min_length=1)


class OpeningStockPatch(BaseModel):
    depotId: Optional[int] = None
    openingDate: Optional[date] = None
    remarks: Optional[str] = None
    items: Optional[list[OpeningStockItemIn]] = None


class OpeningStockReject(BaseModel):
    reason: str


class OpeningStockItemOut(BaseModel):
    id: int
    productId: int
    productName: Optional[str] = None
    productCode: Optional[str] = None
    sku: Optional[str] = None
    batchNumber: str
    manufacturingDate: Optional[date] = None
    expiryDate: Optional[date] = None
    quantity: float
    unitOfMeasure: Optional[str] = None
    unitCost: Optional[float] = None
    remarks: Optional[str] = None


class OpeningStockHistoryOut(BaseModel):
    id: int
    action: str
    fromStatus: Optional[str] = None
    toStatus: Optional[str] = None
    actorId: int
    actorName: Optional[str] = None
    note: Optional[str] = None
    createdAt: Optional[datetime] = None


class OpeningStockSummaryOut(BaseModel):
    total: int
    draft: int
    pendingApproval: int
    approved: int
    rejected: int
