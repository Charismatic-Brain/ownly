from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status

from app.schemas.finance import (
    TransactionCreateRequest,
    TransactionUpdateRequest,
    TransactionResponse,
    BillCreateRequest,
    BillUpdateRequest,
    BillResponse,
    CategorySpending,
    MonthlyTrend,
    FinanceSummaryResponse,
)


def _format_transaction(doc: Dict[str, Any]) -> TransactionResponse:
    occurred_at = doc.get("occurredAt", datetime.now(timezone.utc))
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)

    created_at = doc.get("createdAt", datetime.now(timezone.utc))
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    updated_at = doc.get("updatedAt", datetime.now(timezone.utc))
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)

    amount_paise = int(doc.get("amountPaise", 0))
    amount = float(amount_paise / 100.0)

    return TransactionResponse(
        id=str(doc["_id"]),
        ownerId=str(doc["ownerId"]),
        type=doc.get("type", "expense"),
        amount=amount,
        amountPaise=amount_paise,
        currency=doc.get("currency", "INR"),
        category=doc.get("category", "Other"),
        description=doc.get("description", ""),
        occurredAt=occurred_at,
        createdAt=created_at,
        updatedAt=updated_at,
    )


def _format_bill(doc: Dict[str, Any]) -> BillResponse:
    next_due_at = doc.get("nextDueAt", datetime.now(timezone.utc))
    if next_due_at.tzinfo is None:
        next_due_at = next_due_at.replace(tzinfo=timezone.utc)

    created_at = doc.get("createdAt", datetime.now(timezone.utc))
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    updated_at = doc.get("updatedAt", datetime.now(timezone.utc))
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)

    amount_paise = int(doc.get("amountPaise", 0))
    amount = float(amount_paise / 100.0)

    return BillResponse(
        id=str(doc["_id"]),
        ownerId=str(doc["ownerId"]),
        name=doc.get("name", ""),
        amount=amount,
        amountPaise=amount_paise,
        currency=doc.get("currency", "INR"),
        frequency=doc.get("frequency", "monthly"),
        nextDueAt=next_due_at,
        status=doc.get("status", "active"),
        category=doc.get("category", "Utilities"),
        autopay=doc.get("autopay", False),
        createdAt=created_at,
        updatedAt=updated_at,
    )


# ---------------------------------------------------------
# Transactions Service
# ---------------------------------------------------------

async def create_transaction(
    db: AsyncIOMotorDatabase,
    user_id: str,
    txn_in: TransactionCreateRequest
) -> TransactionResponse:
    owner_oid = ObjectId(user_id)
    occurred_at = txn_in.occurredAt or datetime.now(timezone.utc)
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)

    amount_paise = int(round(txn_in.amount * 100))
    now = datetime.now(timezone.utc)

    doc = {
        "ownerId": owner_oid,
        "type": txn_in.type,
        "amountPaise": amount_paise,
        "currency": txn_in.currency or "INR",
        "category": txn_in.category.strip(),
        "description": txn_in.description.strip() if txn_in.description else "",
        "occurredAt": occurred_at,
        "createdAt": now,
        "updatedAt": now,
        "deletedAt": None,
    }

    res = await db["transactions"].insert_one(doc)
    doc["_id"] = res.inserted_id
    return _format_transaction(doc)


async def list_transactions(
    db: AsyncIOMotorDatabase,
    user_id: str,
    type_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    skip: int = 0,
) -> List[TransactionResponse]:
    owner_oid = ObjectId(user_id)
    query: Dict[str, Any] = {"ownerId": owner_oid, "deletedAt": None}

    if type_filter:
        query["type"] = type_filter
    if category_filter:
        query["category"] = category_filter

    if start_date or end_date:
        date_q: Dict[str, Any] = {}
        if start_date:
            date_q["$gte"] = start_date if start_date.tzinfo else start_date.replace(tzinfo=timezone.utc)
        if end_date:
            date_q["$lte"] = end_date if end_date.tzinfo else end_date.replace(tzinfo=timezone.utc)
        query["occurredAt"] = date_q

    cursor = db["transactions"].find(query).sort("occurredAt", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [_format_transaction(d) for d in docs]


async def get_transaction(
    db: AsyncIOMotorDatabase,
    user_id: str,
    txn_id: str
) -> TransactionResponse:
    if not ObjectId.is_valid(txn_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction ID format",
        )

    doc = await db["transactions"].find_one({
        "_id": ObjectId(txn_id),
        "ownerId": ObjectId(user_id),
        "deletedAt": None,
    })
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    return _format_transaction(doc)


async def update_transaction(
    db: AsyncIOMotorDatabase,
    user_id: str,
    txn_id: str,
    txn_in: TransactionUpdateRequest
) -> TransactionResponse:
    if not ObjectId.is_valid(txn_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction ID format",
        )

    owner_oid = ObjectId(user_id)
    txn_oid = ObjectId(txn_id)

    existing = await db["transactions"].find_one({
        "_id": txn_oid,
        "ownerId": owner_oid,
        "deletedAt": None,
    })
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    updates: Dict[str, Any] = {"updatedAt": datetime.now(timezone.utc)}
    if txn_in.type is not None:
        updates["type"] = txn_in.type
    if txn_in.amount is not None:
        updates["amountPaise"] = int(round(txn_in.amount * 100))
    if txn_in.currency is not None:
        updates["currency"] = txn_in.currency
    if txn_in.category is not None:
        updates["category"] = txn_in.category.strip()
    if txn_in.description is not None:
        updates["description"] = txn_in.description.strip()
    if txn_in.occurredAt is not None:
        occ = txn_in.occurredAt
        if occ.tzinfo is None:
            occ = occ.replace(tzinfo=timezone.utc)
        updates["occurredAt"] = occ

    await db["transactions"].update_one(
        {"_id": txn_oid, "ownerId": owner_oid},
        {"$set": updates}
    )

    updated_doc = await db["transactions"].find_one({"_id": txn_oid})
    return _format_transaction(updated_doc)


async def delete_transaction(
    db: AsyncIOMotorDatabase,
    user_id: str,
    txn_id: str
) -> Dict[str, str]:
    if not ObjectId.is_valid(txn_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction ID format",
        )

    res = await db["transactions"].delete_one({
        "_id": ObjectId(txn_id),
        "ownerId": ObjectId(user_id),
    })
    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    return {"message": "Transaction deleted successfully"}


# ---------------------------------------------------------
# Bills & Subscriptions Service
# ---------------------------------------------------------

async def create_bill(
    db: AsyncIOMotorDatabase,
    user_id: str,
    bill_in: BillCreateRequest
) -> BillResponse:
    owner_oid = ObjectId(user_id)
    next_due_at = bill_in.nextDueAt
    if next_due_at.tzinfo is None:
        next_due_at = next_due_at.replace(tzinfo=timezone.utc)

    amount_paise = int(round(bill_in.amount * 100))
    now = datetime.now(timezone.utc)

    doc = {
        "ownerId": owner_oid,
        "name": bill_in.name.strip(),
        "amountPaise": amount_paise,
        "currency": bill_in.currency or "INR",
        "frequency": bill_in.frequency,
        "nextDueAt": next_due_at,
        "status": "active",
        "category": bill_in.category.strip() if bill_in.category else "Utilities",
        "autopay": bill_in.autopay,
        "createdAt": now,
        "updatedAt": now,
        "deletedAt": None,
    }

    res = await db["bills"].insert_one(doc)
    doc["_id"] = res.inserted_id
    return _format_bill(doc)


async def list_bills(
    db: AsyncIOMotorDatabase,
    user_id: str,
    status_filter: Optional[str] = None
) -> List[BillResponse]:
    owner_oid = ObjectId(user_id)
    query: Dict[str, Any] = {"ownerId": owner_oid, "deletedAt": None}

    if status_filter:
        query["status"] = status_filter

    cursor = db["bills"].find(query).sort("nextDueAt", 1)
    docs = await cursor.to_list(length=100)
    return [_format_bill(d) for d in docs]


async def get_bill(
    db: AsyncIOMotorDatabase,
    user_id: str,
    bill_id: str
) -> BillResponse:
    if not ObjectId.is_valid(bill_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bill ID format",
        )

    doc = await db["bills"].find_one({
        "_id": ObjectId(bill_id),
        "ownerId": ObjectId(user_id),
        "deletedAt": None,
    })
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found",
        )
    return _format_bill(doc)


async def update_bill(
    db: AsyncIOMotorDatabase,
    user_id: str,
    bill_id: str,
    bill_in: BillUpdateRequest
) -> BillResponse:
    if not ObjectId.is_valid(bill_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bill ID format",
        )

    owner_oid = ObjectId(user_id)
    bill_oid = ObjectId(bill_id)

    existing = await db["bills"].find_one({
        "_id": bill_oid,
        "ownerId": owner_oid,
        "deletedAt": None,
    })
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found",
        )

    updates: Dict[str, Any] = {"updatedAt": datetime.now(timezone.utc)}
    if bill_in.name is not None:
        updates["name"] = bill_in.name.strip()
    if bill_in.amount is not None:
        updates["amountPaise"] = int(round(bill_in.amount * 100))
    if bill_in.currency is not None:
        updates["currency"] = bill_in.currency
    if bill_in.frequency is not None:
        updates["frequency"] = bill_in.frequency
    if bill_in.status is not None:
        updates["status"] = bill_in.status
    if bill_in.category is not None:
        updates["category"] = bill_in.category.strip()
    if bill_in.autopay is not None:
        updates["autopay"] = bill_in.autopay
    if bill_in.nextDueAt is not None:
        nd = bill_in.nextDueAt
        if nd.tzinfo is None:
            nd = nd.replace(tzinfo=timezone.utc)
        updates["nextDueAt"] = nd

    await db["bills"].update_one(
        {"_id": bill_oid, "ownerId": owner_oid},
        {"$set": updates}
    )

    updated_doc = await db["bills"].find_one({"_id": bill_oid})
    return _format_bill(updated_doc)


async def delete_bill(
    db: AsyncIOMotorDatabase,
    user_id: str,
    bill_id: str
) -> Dict[str, str]:
    if not ObjectId.is_valid(bill_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bill ID format",
        )

    res = await db["bills"].delete_one({
        "_id": ObjectId(bill_id),
        "ownerId": ObjectId(user_id),
    })
    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found",
        )

    return {"message": "Bill deleted successfully"}


async def pay_bill(
    db: AsyncIOMotorDatabase,
    user_id: str,
    bill_id: str,
    create_expense_transaction: bool = True
) -> BillResponse:
    bill = await get_bill(db, user_id, bill_id)

    owner_oid = ObjectId(user_id)
    bill_oid = ObjectId(bill_id)
    now = datetime.now(timezone.utc)

    # 1. Optionally create matching expense transaction
    if create_expense_transaction:
        await create_transaction(
            db,
            user_id,
            TransactionCreateRequest(
                type="expense",
                amount=bill.amount,
                currency=bill.currency,
                category=bill.category,
                description=f"Payment for bill: {bill.name}",
                occurredAt=now,
            )
        )

    # 2. Advance nextDueAt according to recurrence frequency
    updates: Dict[str, Any] = {"updatedAt": now}
    current_due = bill.nextDueAt

    if bill.frequency == "one_time":
        updates["status"] = "paid"
    elif bill.frequency == "weekly":
        updates["nextDueAt"] = current_due + timedelta(days=7)
    elif bill.frequency == "quarterly":
        updates["nextDueAt"] = current_due + timedelta(days=90)
    elif bill.frequency == "yearly":
        updates["nextDueAt"] = current_due + timedelta(days=365)
    else:  # default monthly
        # Advance 30 days
        updates["nextDueAt"] = current_due + timedelta(days=30)

    await db["bills"].update_one(
        {"_id": bill_oid, "ownerId": owner_oid},
        {"$set": updates}
    )

    updated_doc = await db["bills"].find_one({"_id": bill_oid})
    return _format_bill(updated_doc)


# ---------------------------------------------------------
# Aggregation Pipeline: Finance Summary & Analytics
# ---------------------------------------------------------

async def get_finance_summary(
    db: AsyncIOMotorDatabase,
    user_id: str
) -> FinanceSummaryResponse:
    owner_oid = ObjectId(user_id)

    # Aggregation Pipeline 1: Totals by Transaction Type (income vs expense)
    type_pipeline = [
        {"$match": {"ownerId": owner_oid, "deletedAt": None}},
        {
            "$group": {
                "_id": "$type",
                "totalPaise": {"$sum": "$amountPaise"},
                "count": {"$sum": 1},
            }
        }
    ]
    type_cursor = db["transactions"].aggregate(type_pipeline)
    type_docs = await type_cursor.to_list(length=10)

    total_income_paise = 0
    total_expense_paise = 0
    for doc in type_docs:
        if doc["_id"] == "income":
            total_income_paise = doc["totalPaise"]
        elif doc["_id"] == "expense":
            total_expense_paise = doc["totalPaise"]

    total_income = float(total_income_paise / 100.0)
    total_expense = float(total_expense_paise / 100.0)
    net_savings = round(total_income - total_expense, 2)

    # Aggregation Pipeline 2: Category Breakdown for Expenses
    category_pipeline = [
        {
            "$match": {
                "ownerId": owner_oid,
                "deletedAt": None,
                "type": "expense",
            }
        },
        {
            "$group": {
                "_id": "$category",
                "totalPaise": {"$sum": "$amountPaise"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"totalPaise": -1}},
    ]
    cat_cursor = db["transactions"].aggregate(category_pipeline)
    cat_docs = await cat_cursor.to_list(length=50)

    categories: List[CategorySpending] = []
    for cd in cat_docs:
        c_paise = cd["totalPaise"]
        c_amount = float(c_paise / 100.0)
        percentage = round((c_paise / total_expense_paise * 100), 1) if total_expense_paise > 0 else 0.0
        categories.append(
            CategorySpending(
                category=cd["_id"] or "Other",
                totalAmount=c_amount,
                totalPaise=c_paise,
                count=cd["count"],
                percentage=percentage,
            )
        )

    # Aggregation Pipeline 3: Monthly Trends (past 6 months)
    six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
    trend_pipeline = [
        {
            "$match": {
                "ownerId": owner_oid,
                "deletedAt": None,
                "occurredAt": {"$gte": six_months_ago},
            }
        },
        {
            "$project": {
                "type": 1,
                "amountPaise": 1,
                "month": {
                    "$dateToString": {"format": "%Y-%m", "date": "$occurredAt"}
                },
            }
        },
        {
            "$group": {
                "_id": {
                    "month": "$month",
                    "type": "$type",
                },
                "totalPaise": {"$sum": "$amountPaise"},
            }
        },
        {"$sort": {"_id.month": 1}},
    ]
    trend_cursor = db["transactions"].aggregate(trend_pipeline)
    trend_docs = await trend_cursor.to_list(length=50)

    # Reorganize trends by month
    monthly_map: Dict[str, Dict[str, float]] = {}
    for td in trend_docs:
        m = td["_id"]["month"]
        t = td["_id"]["type"]
        val = float(td["totalPaise"] / 100.0)
        if m not in monthly_map:
            monthly_map[m] = {"income": 0.0, "expense": 0.0}
        monthly_map[m][t] = val

    monthly_trends = [
        MonthlyTrend(
            month=m,
            income=vals["income"],
            expense=vals["expense"],
            net=round(vals["income"] - vals["expense"], 2),
        )
        for m, vals in sorted(monthly_map.items())
    ]

    # Aggregation 4: Active Bills Totals
    bills_pipeline = [
        {
            "$match": {
                "ownerId": owner_oid,
                "deletedAt": None,
                "status": "active",
            }
        },
        {
            "$group": {
                "_id": None,
                "totalPaise": {"$sum": "$amountPaise"},
                "count": {"$sum": 1},
            }
        }
    ]
    bills_cursor = db["bills"].aggregate(bills_pipeline)
    bills_summary = await bills_cursor.to_list(length=1)

    upcoming_bills_total = float(bills_summary[0]["totalPaise"] / 100.0) if bills_summary else 0.0
    active_bills_count = bills_summary[0]["count"] if bills_summary else 0

    return FinanceSummaryResponse(
        totalIncome=total_income,
        totalExpense=total_expense,
        netSavings=net_savings,
        currency="INR",
        categoryBreakdown=categories,
        monthlyTrends=monthly_trends,
        upcomingBillsTotal=upcoming_bills_total,
        activeBillsCount=active_bills_count,
    )

