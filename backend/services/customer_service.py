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
        from services.auth_service import AuthService
        from fastapi import HTTPException
        
        # Check for duplicate username
        if customer.username:
            existing_username = db.query(Customer).filter(
                Customer.username == customer.username
            ).first()
            if existing_username:
                raise HTTPException(
                    status_code=400,
                    detail=f"Bu foydalanuvchi nomi allaqachon mavjud: {customer.username}"
                )
        
        # Check for duplicate phone
        if customer.phone:
            existing_phone = db.query(Customer).filter(
                Customer.phone == customer.phone
            ).first()
            if existing_phone:
                raise HTTPException(
                    status_code=400,
                    detail=f"Bu telefon raqam allaqachon mavjud: {customer.phone}"
                )
        
        customer_dict = customer.dict()
        password = customer_dict.pop('password', None)
        
        # Hash password if provided
        if password:
            customer_dict['password_hash'] = AuthService.hash_password(password)
        
        db_customer = Customer(**customer_dict)
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
        from services.auth_service import AuthService
        from fastapi import HTTPException
        
        db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not db_customer:
            return None
        
        update_data = customer.dict(exclude_unset=True)
        
        # Check for duplicate username (exclude current customer)
        if 'username' in update_data and update_data['username']:
            existing_username = db.query(Customer).filter(
                Customer.username == update_data['username'],
                Customer.id != customer_id
            ).first()
            if existing_username:
                raise HTTPException(
                    status_code=400,
                    detail=f"Bu foydalanuvchi nomi allaqachon mavjud: {update_data['username']}"
                )
        
        # Check for duplicate phone (exclude current customer)
        if 'phone' in update_data and update_data['phone']:
            existing_phone = db.query(Customer).filter(
                Customer.phone == update_data['phone'],
                Customer.id != customer_id
            ).first()
            if existing_phone:
                raise HTTPException(
                    status_code=400,
                    detail=f"Bu telefon raqam allaqachon mavjud: {update_data['phone']}"
                )
        
        # Handle password hashing separately
        password = update_data.pop('password', None)
        if password:
            update_data['password_hash'] = AuthService.hash_password(password)
        
        for field, value in update_data.items():
            setattr(db_customer, field, value)
        
        db.commit()
        db.refresh(db_customer)
        return db_customer
    
    @staticmethod
    def delete_customer(db: Session, customer_id: int) -> bool:
        """Delete a customer - prevents deletion only if customer has active debt (debt_balance > 0)
        Sales and orders will remain in the system with customer_id set to NULL"""
        from models import DebtHistory, Sale, Order
        from sqlalchemy.exc import IntegrityError
        
        db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not db_customer:
            return False
        
        # Check if customer has active debt (debt_balance > 0)
        if db_customer.debt_balance and db_customer.debt_balance > 0:
            raise ValueError(f"Mijozni o'chirib bo'lmaydi: {db_customer.debt_balance:,.0f} so'm qarzi bor. Avval qarzni to'lang.")
        
        try:
            # Set customer_id to NULL in sales (keep sales records)
            db.query(Sale).filter(Sale.customer_id == customer_id).update({Sale.customer_id: None})
            
            # Set customer_id to NULL in orders (keep order records)
            db.query(Order).filter(Order.customer_id == customer_id).update({Order.customer_id: None})
            
            # Delete debt history records (if any) before deleting customer
            db.query(DebtHistory).filter(DebtHistory.customer_id == customer_id).delete()
            
            db.delete(db_customer)
            db.commit()
            return True
        except IntegrityError as e:
            db.rollback()
            raise ValueError("Mijozni o'chirib bo'lmaydi: bog'liq ma'lumotlar mavjud.")

