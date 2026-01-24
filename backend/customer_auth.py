"""
Customer authentication helper functions
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Customer
from typing import Optional

def get_customer_from_header(
    x_customer_id: Optional[str] = None
) -> int:
    """Get customer ID from header string"""
    if not x_customer_id:
        raise HTTPException(status_code=401, detail="Customer ID required")
    
    try:
        customer_id = int(x_customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    # Verify customer exists
    db = SessionLocal()
    try:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer_id
    finally:
        db.close()
