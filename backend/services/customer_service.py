"""
Customer Service
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from models import Customer, CustomerType, Sale, Order
from schemas import CustomerCreate, CustomerUpdate, CustomerResponse, CustomerStatsResponse


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

        # Validate referrer if provided
        referrer_id = customer_dict.get('referred_by_id')
        if referrer_id:
            referrer = db.query(Customer).filter(Customer.id == referrer_id).first()
            if not referrer:
                raise HTTPException(
                    status_code=400,
                    detail=f"Referrer topilmadi: {referrer_id}"
                )
        
        # Hash password if provided
        if password:
            customer_dict['password_hash'] = AuthService.hash_password(password)
        
        db_customer = Customer(**customer_dict)
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)

        # Ensure referral code is set
        if not db_customer.referral_code:
            db_customer.referral_code = f"CUST{db_customer.id:06d}"
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

        # Validate referrer if provided
        if 'referred_by_id' in update_data and update_data['referred_by_id']:
            referrer_id = update_data['referred_by_id']
            if referrer_id == customer_id:
                raise HTTPException(status_code=400, detail="Mijoz o'zini referer qila olmaydi")
            referrer = db.query(Customer).filter(Customer.id == referrer_id).first()
            if not referrer:
                raise HTTPException(status_code=400, detail=f"Referrer topilmadi: {referrer_id}")
        
        for field, value in update_data.items():
            setattr(db_customer, field, value)
        
        db.commit()
        db.refresh(db_customer)
        return db_customer
    
    @staticmethod
    def delete_customer(db: Session, customer_id: int) -> bool:
        """Delete a customer - prevents deletion only if customer has active debt (debt_balance > 0)
        Sales and orders will remain in the system with customer_id set to NULL"""
        from models import DebtHistory
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

    @staticmethod
    def get_customer_stats(db: Session, customer_id: int) -> CustomerStatsResponse:
        """Get aggregated statistics for a customer (orders & sales)"""
        # Total orders per status
        total_orders = db.query(func.count(Order.id)).filter(Order.customer_id == customer_id).scalar() or 0
        completed_orders = db.query(func.count(Order.id)).filter(
            Order.customer_id == customer_id,
            Order.status == 'completed'
        ).scalar() or 0
        cancelled_orders = db.query(func.count(Order.id)).filter(
            Order.customer_id == customer_id,
            Order.status == 'cancelled'
        ).scalar() or 0
        pending_orders = db.query(func.count(Order.id)).filter(
            Order.customer_id == customer_id,
            Order.status == 'pending'
        ).scalar() or 0

        # Sales amounts
        total_sales_amount = db.query(func.coalesce(func.sum(Sale.total_amount), 0.0)).filter(
            Sale.customer_id == customer_id
        ).scalar() or 0.0

        total_paid_amount = db.query(func.coalesce(func.sum(Sale.payment_amount), 0.0)).filter(
            Sale.customer_id == customer_id
        ).scalar() or 0.0

        # Debt amount is difference
        total_debt_amount = float(total_sales_amount) - float(total_paid_amount)

        # Average order amount
        average_order_amount = 0.0
        if total_orders > 0:
            total_order_amount = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
                Order.customer_id == customer_id
            ).scalar() or 0.0
            average_order_amount = float(total_order_amount) / float(total_orders)

        # Last order & sale dates
        last_order_date = db.query(func.max(Order.created_at)).filter(
            Order.customer_id == customer_id
        ).scalar()

        last_sale_date = db.query(func.max(Sale.created_at)).filter(
            Sale.customer_id == customer_id
        ).scalar()

        return CustomerStatsResponse(
            customer_id=customer_id,
            total_orders=int(total_orders),
            completed_orders=int(completed_orders),
            cancelled_orders=int(cancelled_orders),
            pending_orders=int(pending_orders),
            total_sales_amount=float(total_sales_amount),
            total_paid_amount=float(total_paid_amount),
            total_debt_amount=float(total_debt_amount),
            average_order_amount=float(average_order_amount),
            last_order_date=last_order_date,
            last_sale_date=last_sale_date,
        )