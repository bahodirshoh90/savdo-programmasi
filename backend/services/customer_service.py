"""
Customer Service
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from models import Customer, CustomerType
from schemas import CustomerCreate, CustomerUpdate, CustomerResponse


class CustomerService:
    """Service for customer management"""
    
    @staticmethod
    def create_customer(db: Session, customer: CustomerCreate) -> Customer:
        """Create a new customer"""
        db_customer = Customer(**customer.dict())
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)
        return db_customer
    
    @staticmethod
    def get_customers(
        db: Session,
        customer_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[Customer]:
        """Get all customers, optionally filtered by type and search"""
        query = db.query(Customer)
        
        if customer_type:
            query = query.filter(Customer.customer_type == CustomerType(customer_type))
        
        # Search by name or phone
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Customer.name.ilike(search_term)) | 
                (Customer.phone.ilike(search_term))
            )
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def get_customers_count(
        db: Session,
        customer_type: Optional[str] = None,
        search: Optional[str] = None
    ) -> int:
        """Get total count of customers matching filters"""
        query = db.query(Customer)
        
        if customer_type:
            query = query.filter(Customer.customer_type == CustomerType(customer_type))
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Customer.name.ilike(search_term)) | 
                (Customer.phone.ilike(search_term))
            )
        
        return query.count()
    
    @staticmethod
    def get_customer(db: Session, customer_id: int) -> Optional[Customer]:
        """Get a specific customer by ID"""
        return db.query(Customer).filter(Customer.id == customer_id).first()
    
    @staticmethod
    def update_customer(db: Session, customer_id: int, customer: CustomerUpdate) -> Optional[Customer]:
        """Update a customer"""
        db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not db_customer:
            return None
        
        update_data = customer.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_customer, field, value)
        
        db.commit()
        db.refresh(db_customer)
        return db_customer
    
    @staticmethod
    def delete_customer(db: Session, customer_id: int) -> bool:
        """Delete a customer"""
        db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not db_customer:
            return False
        
        db.delete(db_customer)
        db.commit()
        return True

