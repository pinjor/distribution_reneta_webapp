from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date
from app.database import get_db
from app.models import Invoice, PickingOrder, PickingOrderDelivery, DeliveryOrder, Customer, StockIssuance

router = APIRouter()

@router.get("/")
def get_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    invoices = db.query(Invoice).offset(skip).limit(limit).all()
    return invoices

@router.get("/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.post("/")
def create_invoice(invoice_data: dict, db: Session = Depends(get_db)):
    invoice = Invoice(**invoice_data)
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice

@router.post("/generate-bulk/{challan_id}")
def generate_bulk_invoices(challan_id: int, db: Session = Depends(get_db)):
    """
    Generate invoices for all chemist shops (customers) in a loading challan.
    Groups deliveries by customer and creates one invoice per customer.
    """
    # Get the picking order (loading challan)
    picking_order = db.query(PickingOrder).filter(PickingOrder.id == challan_id).first()
    if not picking_order:
        raise HTTPException(status_code=404, detail="Loading challan not found")
    
    if picking_order.status != "Approved":
        raise HTTPException(status_code=400, detail="Only approved loading challans can generate invoices")
    
    # Get all deliveries for this picking order
    picking_deliveries = db.query(PickingOrderDelivery).filter(
        PickingOrderDelivery.picking_order_id == challan_id
    ).all()
    
    if not picking_deliveries:
        raise HTTPException(status_code=400, detail="No deliveries found for this challan")
    
    # Group deliveries by customer
    customer_groups: dict[int, List[PickingOrderDelivery]] = {}
    
    for picking_delivery in picking_deliveries:
        if picking_delivery.delivery_id:
            delivery = db.query(DeliveryOrder).filter(DeliveryOrder.id == picking_delivery.delivery_id).first()
            if delivery and delivery.customer_id:
                customer_id = delivery.customer_id
                if customer_id not in customer_groups:
                    customer_groups[customer_id] = []
                customer_groups[customer_id].append(picking_delivery)
    
    if not customer_groups:
        raise HTTPException(status_code=400, detail="No customers found in deliveries")
    
    # Generate invoices for each customer
    generated_invoices = []
    invoice_date = picking_order.loading_date or date.today()
    
    for customer_id, deliveries in customer_groups.items():
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            continue
        
        # Calculate total amount for this customer
        total_amount = sum(float(d.value or 0) for d in deliveries)
        
        # Check if invoice already exists for this challan and customer
        existing_invoice = db.query(Invoice).filter(
            Invoice.customer_id == customer_id,
            Invoice.invoice_date == invoice_date,
            Invoice.invoice_number.like(f"%{picking_order.loading_no or picking_order.order_number}%")
        ).first()
        
        if existing_invoice:
            generated_invoices.append(existing_invoice)
            continue
        
        # Generate invoice number
        invoice_number = f"INV-{picking_order.loading_no or picking_order.order_number}-{customer.code}-{date.today().strftime('%Y%m%d')}"
        
        # Get the first delivery's issuance_id if available
        issuance_id = None
        if deliveries[0].delivery_id:
            delivery = db.query(DeliveryOrder).filter(DeliveryOrder.id == deliveries[0].delivery_id).first()
            if delivery:
                issuance = db.query(StockIssuance).filter(StockIssuance.customer_id == customer_id).first()
                if issuance:
                    issuance_id = issuance.id
        
        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            customer_id=customer_id,
            depot_id=picking_order.deliveries[0].delivery.depot_id if picking_order.deliveries else None,
            issuance_id=issuance_id,
            amount=total_amount,
            mode="Credit",  # Default mode
            status="Generated",
            due_date=None,  # Can be calculated based on credit terms
        )
        
        db.add(invoice)
        db.flush()
        generated_invoices.append(invoice)
    
    db.commit()
    
    # Refresh all invoices
    for invoice in generated_invoices:
        db.refresh(invoice)
    
    return {
        "message": f"Generated {len(generated_invoices)} invoice(s) successfully",
        "invoices": generated_invoices,
        "challan_id": challan_id,
    }

@router.get("/{invoice_id}/download")
def download_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    # In production, generate PDF and return file
    return {"invoice": invoice, "pdf_url": f"/api/invoices/{invoice_id}/pdf"}

