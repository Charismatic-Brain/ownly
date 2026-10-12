from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.security.dependencies import get_db, get_current_user
from app.schemas.finance import (
    TransactionCreateRequest,
    TransactionUpdateRequest,
    TransactionResponse,
    BillCreateRequest,
    BillUpdateRequest,
    BillResponse,
    FinanceSummaryResponse,
)
from app.services import finance_service

router = APIRouter(prefix="", tags=["Personal Finance & Bills"])


# ---------------------------------------------------------
# Transactions Endpoints
# ---------------------------------------------------------

@router.get("/transactions", response_model=List[TransactionResponse], summary="List transactions")
async def list_transactions(
    type: Optional[str] = Query(None, description="income or expense"),
    category: Optional[str] = Query(None, description="Filter by category"),
    startDate: Optional[datetime] = Query(None, description="Start date filter"),
    endDate: Optional[datetime] = Query(None, description="End date filter"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await finance_service.list_transactions(
        db=db,
        user_id=current_user["id"],
        type_filter=type,
        category_filter=category,
        start_date=startDate,
        end_date=endDate,
        limit=limit,
        skip=skip,
    )


@router.post("/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED, summary="Create transaction")
async def create_transaction(
    txn_in: TransactionCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await finance_service.create_transaction(
        db=db,
        user_id=current_user["id"],
        txn_in=txn_in,
    )


@router.get("/transactions/{id}", response_model=TransactionResponse, summary="Get transaction by ID")
async def get_transaction(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await finance_service.get_transaction(
        db=db,
        user_id=current_user["id"],
        txn_id=id,
    )


@router.patch("/transactions/{id}", response_model=TransactionResponse, summary="Update transaction")
async def update_transaction(
    id: str,
    txn_in: TransactionUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await finance_service.update_transaction(
        db=db,
        user_id=current_user["id"],
        txn_id=id,
        txn_in=txn_in,
    )


@router.delete("/transactions/{id}", summary="Delete transaction")
async def delete_transaction(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await finance_service.delete_transaction(
        db=db,
        user_id=current_user["id"],
        txn_id=id,
    )


# ---------------------------------------------------------
# Bills & Subscriptions Endpoints
# ---------------------------------------------------------

@router.get("/bills", response_model=List[BillResponse], summary="List recurring bills")
async def list_bills(
    status: Optional[str] = Query(None, description="active, paused, paid, cancelled"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await finance_service.list_bills(
        db=db,
        user_id=current_user["id"],
        status_filter=status,
    )


@router.post("/bills", response_model=BillResponse, status_code=status.HTTP_201_CREATED, summary="Create recurring bill")
async def create_bill(
    bill_in: BillCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await finance_service.create_bill(
        db=db,
        user_id=current_user["id"],
        bill_in=bill_in,
    )


@router.get("/bills/{id}", response_model=BillResponse, summary="Get bill by ID")
async def get_bill(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await finance_service.get_bill(
        db=db,
        user_id=current_user["id"],
        bill_id=id,
    )


@router.patch("/bills/{id}", response_model=BillResponse, summary="Update bill")
async def update_bill(
    id: str,
    bill_in: BillUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await finance_service.update_bill(
        db=db,
        user_id=current_user["id"],
        bill_id=id,
        bill_in=bill_in,
    )


@router.delete("/bills/{id}", summary="Delete bill")
async def delete_bill(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await finance_service.delete_bill(
        db=db,
        user_id=current_user["id"],
        bill_id=id,
    )


@router.post("/bills/{id}/pay", response_model=BillResponse, summary="Mark bill paid and advance next due date")
async def pay_bill(
    id: str,
    createExpense: bool = Query(True, description="Create a corresponding expense transaction"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await finance_service.pay_bill(
        db=db,
        user_id=current_user["id"],
        bill_id=id,
        create_expense_transaction=createExpense,
    )


# ---------------------------------------------------------
# Finance Summary & Aggregation Analytics
# ---------------------------------------------------------

@router.get("/finance/summary", response_model=FinanceSummaryResponse, summary="Aggregated finance report & spending breakdowns")
async def get_finance_summary(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await finance_service.get_finance_summary(
        db=db,
        user_id=current_user["id"],
    )

