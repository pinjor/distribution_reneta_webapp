from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.database import get_db
from app import models, schemas

router = APIRouter()


def generate_deposit_number(db: Session) -> str:
    """Generate a unique deposit number"""
    today = datetime.utcnow().strftime('%Y%m%d')
    prefix = f"DEP-{today}-"
    
    # Find the last deposit number for today
    last_deposit = db.query(models.CollectionDeposit).filter(
        models.CollectionDeposit.deposit_number.like(f"{prefix}%")
    ).order_by(models.CollectionDeposit.deposit_number.desc()).first()
    
    if last_deposit:
        try:
            # Extract the sequence number
            seq = int(last_deposit.deposit_number.split('-')[-1]) + 1
        except:
            seq = 1
    else:
        seq = 1
    
    return f"{prefix}{seq:04d}"


@router.post("/deposits", response_model=schemas.CollectionDeposit, status_code=status.HTTP_201_CREATED)
def create_collection_deposit(
    deposit_data: schemas.CollectionDepositCreate,
    db: Session = Depends(get_db)
):
    """Create a new collection deposit"""
    # Verify collection person exists
    collection_person = db.query(models.Employee).filter(
        models.Employee.id == deposit_data.collection_person_id
    ).first()
    
    if not collection_person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection person not found"
        )
    
    # Generate deposit number
    deposit_number = generate_deposit_number(db)
    
    # Create deposit
    deposit = models.CollectionDeposit(
        deposit_number=deposit_number,
        deposit_date=deposit_data.deposit_date,
        collection_person_id=deposit_data.collection_person_id,
        deposit_method=deposit_data.deposit_method,
        deposit_amount=deposit_data.deposit_amount,
        transaction_number=deposit_data.transaction_number,
        attachment_url=deposit_data.attachment_url,
        remaining_amount=deposit_data.remaining_amount,
        total_collection_amount=deposit_data.total_collection_amount,
        notes=deposit_data.notes,
        approved=False
    )
    
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    
    # Return with related data
    deposit_dict = {
        **deposit.__dict__,
        "collection_person_name": f"{collection_person.first_name} {collection_person.last_name or ''}".strip(),
        "approver_name": None
    }
    
    return deposit_dict


@router.get("/deposits", response_model=List[schemas.CollectionDeposit])
def list_collection_deposits(
    collection_person_id: Optional[int] = Query(None),
    approved: Optional[bool] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """List all collection deposits with filters"""
    query = db.query(models.CollectionDeposit)
    
    if collection_person_id:
        query = query.filter(models.CollectionDeposit.collection_person_id == collection_person_id)
    
    if approved is not None:
        query = query.filter(models.CollectionDeposit.approved == approved)
    
    if start_date:
        query = query.filter(models.CollectionDeposit.deposit_date >= start_date)
    
    if end_date:
        query = query.filter(models.CollectionDeposit.deposit_date <= end_date)
    
    deposits = query.order_by(models.CollectionDeposit.created_at.desc()).all()
    
    result = []
    for deposit in deposits:
        collection_person = db.query(models.Employee).filter(
            models.Employee.id == deposit.collection_person_id
        ).first()
        
        approver = None
        if deposit.approved_by:
            approver = db.query(models.Employee).filter(
                models.Employee.id == deposit.approved_by
            ).first()
        
        deposit_dict = {
            **deposit.__dict__,
            "collection_person_name": f"{collection_person.first_name} {collection_person.last_name or ''}".strip() if collection_person else "",
            "approver_name": f"{approver.first_name} {approver.last_name or ''}".strip() if approver else None
        }
        result.append(deposit_dict)
    
    return result


@router.get("/deposits/{deposit_id}", response_model=schemas.CollectionDeposit)
def get_collection_deposit(
    deposit_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific collection deposit"""
    deposit = db.query(models.CollectionDeposit).filter(
        models.CollectionDeposit.id == deposit_id
    ).first()
    
    if not deposit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deposit not found"
        )
    
    collection_person = db.query(models.Employee).filter(
        models.Employee.id == deposit.collection_person_id
    ).first()
    
    approver = None
    if deposit.approved_by:
        approver = db.query(models.Employee).filter(
            models.Employee.id == deposit.approved_by
        ).first()
    
    deposit_dict = {
        **deposit.__dict__,
        "collection_person_name": f"{collection_person.first_name} {collection_person.last_name or ''}".strip() if collection_person else "",
        "approver_name": f"{approver.first_name} {approver.last_name or ''}".strip() if approver else None
    }
    
    return deposit_dict


@router.put("/deposits/{deposit_id}", response_model=schemas.CollectionDeposit)
def update_collection_deposit(
    deposit_id: int,
    deposit_data: schemas.CollectionDepositUpdate,
    db: Session = Depends(get_db)
):
    """Update a collection deposit"""
    deposit = db.query(models.CollectionDeposit).filter(
        models.CollectionDeposit.id == deposit_id
    ).first()
    
    if not deposit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deposit not found"
        )
    
    if deposit.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update approved deposit"
        )
    
    # Update fields
    update_data = deposit_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(deposit, field, value)
    
    deposit.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(deposit)
    
    collection_person = db.query(models.Employee).filter(
        models.Employee.id == deposit.collection_person_id
    ).first()
    
    approver = None
    if deposit.approved_by:
        approver = db.query(models.Employee).filter(
            models.Employee.id == deposit.approved_by
        ).first()
    
    deposit_dict = {
        **deposit.__dict__,
        "collection_person_name": f"{collection_person.first_name} {collection_person.last_name or ''}".strip() if collection_person else "",
        "approver_name": f"{approver.first_name} {approver.last_name or ''}".strip() if approver else None
    }
    
    return deposit_dict


@router.post("/deposits/{deposit_id}/approve", response_model=schemas.CollectionDeposit)
def approve_collection_deposit(
    deposit_id: int,
    approver_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Approve a collection deposit"""
    deposit = db.query(models.CollectionDeposit).filter(
        models.CollectionDeposit.id == deposit_id
    ).first()
    
    if not deposit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deposit not found"
        )
    
    if deposit.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deposit already approved"
        )
    
    deposit.approved = True
    deposit.approved_by = approver_id
    deposit.approved_at = datetime.utcnow()
    deposit.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(deposit)
    
    collection_person = db.query(models.Employee).filter(
        models.Employee.id == deposit.collection_person_id
    ).first()
    
    approver = db.query(models.Employee).filter(
        models.Employee.id == approver_id
    ).first()
    
    deposit_dict = {
        **deposit.__dict__,
        "collection_person_name": f"{collection_person.first_name} {collection_person.last_name or ''}".strip() if collection_person else "",
        "approver_name": f"{approver.first_name} {approver.last_name or ''}".strip() if approver else ""
    }
    
    return deposit_dict


@router.post("/transactions", response_model=schemas.CollectionTransaction, status_code=status.HTTP_201_CREATED)
def create_collection_transaction(
    transaction_data: schemas.CollectionTransactionCreate,
    db: Session = Depends(get_db)
):
    """Create a new collection transaction"""
    # Verify order exists
    order = db.query(models.Order).filter(
        models.Order.id == transaction_data.order_id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Verify collection person exists
    collection_person = db.query(models.Employee).filter(
        models.Employee.id == transaction_data.collection_person_id
    ).first()
    
    if not collection_person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection person not found"
        )
    
    # Create transaction
    transaction = models.CollectionTransaction(
        order_id=transaction_data.order_id,
        collection_person_id=transaction_data.collection_person_id,
        collection_date=transaction_data.collection_date,
        collection_type=transaction_data.collection_type,
        collected_amount=transaction_data.collected_amount,
        pending_amount=transaction_data.pending_amount,
        total_amount=transaction_data.total_amount,
        deposit_id=transaction_data.deposit_id,
        remarks=transaction_data.remarks
    )
    
    db.add(transaction)
    
    # Update order collection status
    order.collection_status = transaction_data.collection_type.value
    order.collected_amount = transaction_data.collected_amount
    order.pending_amount = transaction_data.pending_amount
    
    db.commit()
    db.refresh(transaction)
    
    # Return with related data
    transaction_dict = {
        **transaction.__dict__,
        "order_number": order.order_number,
        "memo_number": order.memo_number,
        "customer_name": order.customer_name,
        "collection_person_name": f"{collection_person.first_name} {collection_person.last_name or ''}".strip()
    }
    
    return transaction_dict


@router.get("/transactions", response_model=List[schemas.CollectionTransaction])
def list_collection_transactions(
    collection_person_id: Optional[int] = Query(None),
    order_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """List all collection transactions with filters"""
    query = db.query(models.CollectionTransaction)
    
    if collection_person_id:
        query = query.filter(models.CollectionTransaction.collection_person_id == collection_person_id)
    
    if order_id:
        query = query.filter(models.CollectionTransaction.order_id == order_id)
    
    if start_date:
        query = query.filter(models.CollectionTransaction.collection_date >= start_date)
    
    if end_date:
        query = query.filter(models.CollectionTransaction.collection_date <= end_date)
    
    transactions = query.order_by(models.CollectionTransaction.created_at.desc()).all()
    
    result = []
    for transaction in transactions:
        order = db.query(models.Order).filter(
            models.Order.id == transaction.order_id
        ).first()
        
        collection_person = db.query(models.Employee).filter(
            models.Employee.id == transaction.collection_person_id
        ).first()
        
        transaction_dict = {
            **transaction.__dict__,
            "order_number": order.order_number if order else None,
            "memo_number": order.memo_number if order else None,
            "customer_name": order.customer_name if order else None,
            "collection_person_name": f"{collection_person.first_name} {collection_person.last_name or ''}".strip() if collection_person else ""
        }
        result.append(transaction_dict)
    
    return result


@router.get("/reports/collection-person/{collection_person_id}", response_model=schemas.CollectionReportResponse)
def get_collection_person_report(
    collection_person_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """Get collection report for a specific collection person"""
    collection_person = db.query(models.Employee).filter(
        models.Employee.id == collection_person_id
    ).first()
    
    if not collection_person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection person not found"
        )
    
    # Get all transactions for this person
    transaction_query = db.query(models.CollectionTransaction).filter(
        models.CollectionTransaction.collection_person_id == collection_person_id
    )
    
    if start_date:
        transaction_query = transaction_query.filter(
            models.CollectionTransaction.collection_date >= start_date
        )
    
    if end_date:
        transaction_query = transaction_query.filter(
            models.CollectionTransaction.collection_date <= end_date
        )
    
    transactions = transaction_query.all()
    
    # Get all deposits for this person
    deposit_query = db.query(models.CollectionDeposit).filter(
        models.CollectionDeposit.collection_person_id == collection_person_id
    )
    
    if start_date:
        deposit_query = deposit_query.filter(
            models.CollectionDeposit.deposit_date >= start_date
        )
    
    if end_date:
        deposit_query = deposit_query.filter(
            models.CollectionDeposit.deposit_date <= end_date
        )
    
    deposits = deposit_query.all()
    
    # Calculate totals
    total_collected = sum(t.collected_amount for t in transactions)
    total_deposited = sum(d.deposit_amount for d in deposits)
    total_pending = sum(t.pending_amount for t in transactions)
    
    # Format deposits
    deposits_list = []
    for deposit in deposits:
        approver = None
        if deposit.approved_by:
            approver = db.query(models.Employee).filter(
                models.Employee.id == deposit.approved_by
            ).first()
        
        deposit_dict = {
            **deposit.__dict__,
            "collection_person_name": f"{collection_person.first_name} {collection_person.last_name or ''}".strip(),
            "approver_name": f"{approver.first_name} {approver.last_name or ''}".strip() if approver else None
        }
        deposits_list.append(deposit_dict)
    
    # Format transactions
    transactions_list = []
    for transaction in transactions:
        order = db.query(models.Order).filter(
            models.Order.id == transaction.order_id
        ).first()
        
        transaction_dict = {
            **transaction.__dict__,
            "order_number": order.order_number if order else None,
            "memo_number": order.memo_number if order else None,
            "customer_name": order.customer_name if order else None,
            "collection_person_name": f"{collection_person.first_name} {collection_person.last_name or ''}".strip()
        }
        transactions_list.append(transaction_dict)
    
    return {
        "collection_person_id": collection_person_id,
        "collection_person_name": f"{collection_person.first_name} {collection_person.last_name or ''}".strip(),
        "total_collected": total_collected,
        "total_deposited": total_deposited,
        "total_pending": total_pending,
        "transaction_count": len(transactions),
        "deposits": deposits_list,
        "transactions": transactions_list
    }


@router.get("/reports/all", response_model=List[schemas.CollectionReportResponse])
def get_all_collection_reports(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """Get collection reports for all collection persons"""
    # Get all unique collection person IDs from transactions
    collection_person_ids = db.query(
        models.CollectionTransaction.collection_person_id
    ).distinct().all()
    
    collection_person_ids = [cp_id[0] for cp_id in collection_person_ids]
    
    reports = []
    for person_id in collection_person_ids:
        report = get_collection_person_report(person_id, start_date, end_date, db)
        reports.append(report)
    
    return reports


@router.post("/deposits/{deposit_id}/receive-remaining", response_model=schemas.CollectionDeposit)
def receive_remaining_cash(
    deposit_id: int,
    received_amount: Decimal = Query(...),
    received_by: int = Query(...),
    receipt_notes: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Receive remaining cash from collection person at depot"""
    deposit = db.query(models.CollectionDeposit).filter(
        models.CollectionDeposit.id == deposit_id
    ).first()
    
    if not deposit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deposit not found"
        )
    
    if deposit.remaining_amount == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No remaining amount to receive"
        )
    
    # Update remaining amount (reduce by received amount)
    if received_amount > deposit.remaining_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Received amount ({received_amount}) exceeds remaining amount ({deposit.remaining_amount})"
        )
    
    deposit.remaining_amount = deposit.remaining_amount - received_amount
    
    # Add receipt notes
    if receipt_notes:
        deposit.notes = (deposit.notes or "") + f"\n[Remaining Cash Received] {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}: {received_amount} BDT received by employee ID {received_by}. Notes: {receipt_notes}"
    else:
        deposit.notes = (deposit.notes or "") + f"\n[Remaining Cash Received] {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}: {received_amount} BDT received by employee ID {received_by}."
    
    deposit.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(deposit)
    
    collection_person = db.query(models.Employee).filter(
        models.Employee.id == deposit.collection_person_id
    ).first()
    
    approver = None
    if deposit.approved_by:
        approver = db.query(models.Employee).filter(
            models.Employee.id == deposit.approved_by
        ).first()
    
    receiver = db.query(models.Employee).filter(
        models.Employee.id == received_by
    ).first()
    
    deposit_dict = {
        **deposit.__dict__,
        "collection_person_name": f"{collection_person.first_name} {collection_person.last_name or ''}".strip() if collection_person else "",
        "approver_name": f"{approver.first_name} {approver.last_name or ''}".strip() if approver else None,
        "receiver_name": f"{receiver.first_name} {receiver.last_name or ''}".strip() if receiver else ""
    }
    
    return deposit_dict

