"""
Service classes for business logic
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

# Import models and schemas
from models import (
    Product, Customer, Sale, SaleItem, Seller, Order, OrderItem, 
    CustomerType, OrderStatus, PaymentMethod, Role, Permission
)
from schemas import (
    CustomerCreate, CustomerUpdate, CustomerResponse,
    ProductCreate, ProductUpdate,
    SaleCreate, SellerCreate, SellerUpdate,
    OrderCreate
)


class CustomerService:
    """Service for customer operations"""
    
    @staticmethod
    def create_customer(db: Session, customer: CustomerCreate):
        """Create a new customer"""
        from customer_auth import get_password_hash
        
        db_customer = Customer(
            name=customer.name,
            phone=customer.phone,
            address=customer.address,
            customer_type=customer.customer_type,
            notes=customer.notes,
            username=customer.username,
            debt_limit=customer.debt_limit,
            debt_due_date=customer.debt_due_date
        )
        
        # Hash password if provided
        if customer.password:
            db_customer.password_hash = get_password_hash(customer.password)
        
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
    ):
        """Get all customers with optional filtering"""
        query = db.query(Customer)
        
        if customer_type:
            query = query.filter(Customer.customer_type == customer_type)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Customer.name.ilike(search_term)) |
                (Customer.phone.ilike(search_term)) |
                (Customer.username.ilike(search_term))
            )
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def get_customers_count(
        db: Session,
        customer_type: Optional[str] = None,
        search: Optional[str] = None
    ):
        """Get total count of customers"""
        query = db.query(Customer)
        
        if customer_type:
            query = query.filter(Customer.customer_type == customer_type)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Customer.name.ilike(search_term)) |
                (Customer.phone.ilike(search_term)) |
                (Customer.username.ilike(search_term))
            )
        
        return query.count()
    
    @staticmethod
    def get_customer(db: Session, customer_id: int):
        """Get a specific customer"""
        return db.query(Customer).filter(Customer.id == customer_id).first()
    
    @staticmethod
    def get_customer_stats(db: Session, customer_id: int):
        """Get customer statistics"""
        from schemas import CustomerStatsResponse
        
        # Get order statistics
        orders = db.query(Order).filter(Order.customer_id == customer_id).all()
        
        total_orders = len(orders)
        completed_orders = sum(1 for o in orders if o.status == OrderStatus.COMPLETED)
        cancelled_orders = sum(1 for o in orders if o.status == OrderStatus.CANCELLED)
        pending_orders = sum(1 for o in orders if o.status == OrderStatus.PENDING)
        
        # Get sales statistics
        sales = db.query(Sale).filter(Sale.customer_id == customer_id).all()
        
        total_sales_amount = sum(s.total_amount for s in sales)
        total_paid_amount = sum(s.paid_amount for s in sales)
        total_debt_amount = sum(s.debt_amount for s in sales)
        
        average_order_amount = total_sales_amount / total_orders if total_orders > 0 else 0.0
        
        return CustomerStatsResponse(
            customer_id=customer_id,
            total_orders=total_orders,
            completed_orders=completed_orders,
            cancelled_orders=cancelled_orders,
            pending_orders=pending_orders,
            total_sales_amount=total_sales_amount,
            total_paid_amount=total_paid_amount,
            total_debt_amount=total_debt_amount,
            average_order_amount=average_order_amount
        )
    
    @staticmethod
    def update_customer(db: Session, customer_id: int, customer: CustomerUpdate):
        """Update a customer"""
        db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not db_customer:
            return None
        
        update_data = customer.dict(exclude_unset=True)
        
        # Handle password update separately
        if 'password' in update_data and update_data['password']:
            from customer_auth import get_password_hash
            db_customer.password_hash = get_password_hash(update_data.pop('password'))
        elif 'password' in update_data:
            update_data.pop('password')
        
        for field, value in update_data.items():
            setattr(db_customer, field, value)
        
        db.commit()
        db.refresh(db_customer)
        return db_customer
    
    @staticmethod
    def delete_customer(db: Session, customer_id: int):
        """Delete a customer"""
        db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not db_customer:
            return False
        
        # Check if customer has any orders or sales
        has_orders = db.query(Order).filter(Order.customer_id == customer_id).count() > 0
        has_sales = db.query(Sale).filter(Sale.customer_id == customer_id).count() > 0
        
        if has_orders or has_sales:
            raise ValueError("Cannot delete customer with existing orders or sales")
        
        db.delete(db_customer)
        db.commit()
        return True
    
    @staticmethod
    def customer_to_response(customer: Customer) -> CustomerResponse:
        """Convert Customer model to CustomerResponse schema"""
        return CustomerResponse(
            id=customer.id,
            name=customer.name,
            phone=customer.phone,
            address=customer.address,
            customer_type=customer.customer_type.value if hasattr(customer.customer_type, 'value') else str(customer.customer_type),
            notes=customer.notes,
            username=customer.username,
            debt_balance=customer.debt_balance if customer.debt_balance is not None else 0.0,
            debt_limit=customer.debt_limit,
            debt_due_date=customer.debt_due_date,
            created_at=customer.created_at,
            updated_at=customer.updated_at
        )


class ProductService:
    """Service for product operations"""
    pass


class SaleService:
    """Service for sale operations"""
    pass


class SellerService:
    """Service for seller operations"""
    pass


class OrderService:
    """Service for order operations"""
    pass


class CalculationService:
    """Service for calculation operations"""
    pass


class PDFService:
    """Service for PDF generation"""
    pass


class ExcelService:
    """Service for Excel generation"""
    pass


class BarcodeService:
    """Service for barcode operations"""
    pass


class RoleService:
    """Service for role and permission operations"""
    pass


# Export all services
__all__ = [
    'CustomerService',
    'ProductService',
    'SaleService',
    'SellerService',
    'OrderService',
    'CalculationService',
    'PDFService',
    'ExcelService',
    'BarcodeService',
    'RoleService'
]
