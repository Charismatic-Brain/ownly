from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


TransactionType = Literal["income", "expense"]
BillFrequency = Literal["monthly", "quarterly", "yearly", "weekly", "one_time"]
BillStatus = Literal["active", "paused", "paid", "cancelled"]


class TransactionCreateRequest(BaseModel):
    type: TransactionType
    amount: float = Field(..., gt=0, description="Amount in currency units (e.g. 500.50)")
    currency: str = Field(default="INR", max_length=10)
    category: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default="", max_length=1000)
    occurredAt: Optional[datetime] = None


class TransactionUpdateRequest(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=10)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    occurredAt: Optional[datetime] = None


class TransactionResponse(BaseModel):
    id: str
    ownerId: str
    type: TransactionType
    amount: float
    amountPaise: int
    currency: str
    category: str
    description: str = ""
    occurredAt: datetime
    createdAt: datetime
    updatedAt: datetime


class BillCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0)
    currency: str = Field(default="INR", max_length=10)
    frequency: BillFrequency = "monthly"
    nextDueAt: datetime
    category: str = Field(default="Utilities", max_length=100)
    autopay: bool = False


class BillUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=10)
    frequency: Optional[BillFrequency] = None
    nextDueAt: Optional[datetime] = None
    status: Optional[BillStatus] = None
    category: Optional[str] = Field(None, max_length=100)
    autopay: Optional[bool] = None


class BillResponse(BaseModel):
    id: str
    ownerId: str
    name: str
    amount: float
    amountPaise: int
    currency: str
    frequency: BillFrequency
    nextDueAt: datetime
    status: BillStatus
    category: str
    autopay: bool
    createdAt: datetime
    updatedAt: datetime


class CategorySpending(BaseModel):
    category: str
    totalAmount: float
    totalPaise: int
    count: int
    percentage: float = 0.0


class MonthlyTrend(BaseModel):
    month: str  # YYYY-MM
    income: float
    expense: float
    net: float


class FinanceSummaryResponse(BaseModel):
    totalIncome: float
    totalExpense: float
    netSavings: float
    currency: str
    categoryBreakdown: List[CategorySpending]
    monthlyTrends: List[MonthlyTrend]
    upcomingBillsTotal: float
    activeBillsCount: int

