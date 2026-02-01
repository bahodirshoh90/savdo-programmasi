"""
Customer Service
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from models import Customer, CustomerType, Sale, Order, OrderStatus
from schemas import CustomerCreate, CustomerUpdate, CustomerResponse, CustomerStatsResponse


class CustomerService:
    """Service for customer management"""

    @staticmethod
    def customer_to_response(customer: Customer) -> CustomerResponse:
        """Convert customer model to response schema"""
        customer_dict = {
            "id": customer.id,
            "name": customer.name,
            "phone": customer.phone,
            "address": customer.address,
            "customer_type": customer.customer_type.value if hasattr(customer.customer_type, 'value') else str(customer.customer_type),
            "notes": customer.notes,
            "username": customer.username,
            "debt_balance": customer.debt_balance if customer.debt_balance is not None else 0.0,
            "debt_limit": customer.debt_limit,
            "debt_due_date": customer.debt_due_date,
            "created_at": customer.created_at,
            "updated_at": customer.updated_at
        }
        return CustomerResponse.model_validate(customer_dict)
    
    @staticmethod
    def create_customer(db: Session, customer: CustomerCreate) -> Customer:
        """Create a new customer"""
        from services.auth_service import AuthService
        from fastapi import HTTPException
        from models import Referal
        
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
        referal_code = customer_dict.pop('referal_code', None)
        
        # Hash password if provided
        if password:
            customer_dict['password_hash'] = AuthService.hash_password(password)
        
        db_customer = Customer(**customer_dict)
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)

        # Link referal invite if provided (by code or phone)
        try:
            referal_record = None
            if referal_code:
                code_record = db.query(Referal).filter(
                    Referal.referal_code == referal_code,
                    Referal.referrer_id != db_customer.id
                ).first()
                if code_record:
                    # Prefer existing invite by phone (if any)
                    if db_customer.phone:
                        referal_record = db.query(Referal).filter(
                            Referal.referrer_id == code_record.referrer_id,
                            Referal.phone == db_customer.phone
                        ).first()
                    if not referal_record:
                        referal_record = Referal(
                            referrer_id=code_record.referrer_id,
                            referal_code=code_record.referal_code,
                            phone=db_customer.phone,
                            status="registered",
                            referred_id=db_customer.id
                        )
                        db.add(referal_record)

            if not referal_record and db_customer.phone:
                referal_record = db.query(Referal).filter(
                    Referal.phone == db_customer.phone,
                    Referal.status == "pending"
                ).first()

            if referal_record:
                referal_record.referred_id = db_customer.id
                if referal_record.status == "pending":
                    referal_record.status = "registered"
                db.commit()
        except Exception as e:
            db.rollback()
            print(f"[REFERAL] Failed to link referal for customer {db_customer.id}: {e}")
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
    def get_customer_stats(
        db: Session,
        customer_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> CustomerStatsResponse:
        """Get aggregated statistics for a customer (orders & sales)"""
        # Orders base query with optional date filters
        order_query = db.query(Order).filter(Order.customer_id == customer_id)
        if start_date:
            order_query = order_query.filter(Order.created_at >= start_date)
        if end_date:
            order_query = order_query.filter(Order.created_at <= end_date)

        total_orders = order_query.count() or 0

        orders_by_status = {}
        for status in OrderStatus:
            status_count = order_query.filter(Order.status == status).count()
            orders_by_status[status.value] = int(status_count or 0)

        completed_orders = orders_by_status.get(OrderStatus.COMPLETED.value, 0)
        cancelled_orders = orders_by_status.get(OrderStatus.CANCELLED.value, 0)
        pending_orders = orders_by_status.get(OrderStatus.PENDING.value, 0)

        # Total amount for completed orders
        completed_amount_query = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
            Order.customer_id == customer_id,
            Order.status == OrderStatus.COMPLETED
        )
        if start_date:
            completed_amount_query = completed_amount_query.filter(Order.created_at >= start_date)
        if end_date:
            completed_amount_query = completed_amount_query.filter(Order.created_at <= end_date)
        total_orders_amount = completed_amount_query.scalar() or 0.0

        # Sales amounts
        total_sales_amount = db.query(func.coalesce(func.sum(Sale.total_amount), 0.0)).filter(
            Sale.customer_id == customer_id
        )
        if start_date:
            total_sales_amount = total_sales_amount.filter(Sale.created_at >= start_date)
        if end_date:
            total_sales_amount = total_sales_amount.filter(Sale.created_at <= end_date)
        total_sales_amount = total_sales_amount.scalar() or 0.0

        total_paid_amount = db.query(func.coalesce(func.sum(Sale.payment_amount), 0.0)).filter(
            Sale.customer_id == customer_id
        )
        if start_date:
            total_paid_amount = total_paid_amount.filter(Sale.created_at >= start_date)
        if end_date:
            total_paid_amount = total_paid_amount.filter(Sale.created_at <= end_date)
        total_paid_amount = total_paid_amount.scalar() or 0.0

        # Debt amount is difference
        total_debt_amount = float(total_sales_amount) - float(total_paid_amount)

        # Average order amount
        average_order_amount = 0.0
        if total_orders > 0:
            total_order_amount_query = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
                Order.customer_id == customer_id
            )
            if start_date:
                total_order_amount_query = total_order_amount_query.filter(Order.created_at >= start_date)
            if end_date:
                total_order_amount_query = total_order_amount_query.filter(Order.created_at <= end_date)
            total_order_amount = total_order_amount_query.scalar() or 0.0
            average_order_amount = float(total_order_amount) / float(total_orders)

        # Last order & sale dates
        last_order_date_query = db.query(func.max(Order.created_at)).filter(Order.customer_id == customer_id)
        if start_date:
            last_order_date_query = last_order_date_query.filter(Order.created_at >= start_date)
        if end_date:
            last_order_date_query = last_order_date_query.filter(Order.created_at <= end_date)
        last_order_date = last_order_date_query.scalar()

        last_sale_date_query = db.query(func.max(Sale.created_at)).filter(Sale.customer_id == customer_id)
        if start_date:
            last_sale_date_query = last_sale_date_query.filter(Sale.created_at >= start_date)
        if end_date:
            last_sale_date_query = last_sale_date_query.filter(Sale.created_at <= end_date)
        last_sale_date = last_sale_date_query.scalar()

        return CustomerStatsResponse(
            customer_id=customer_id,
            total_orders=int(total_orders),
            total_orders_amount=float(total_orders_amount),
            completed_orders=int(completed_orders),
            cancelled_orders=int(cancelled_orders),
            pending_orders=int(pending_orders),
            orders_by_status=orders_by_status,
            total_sales_amount=float(total_sales_amount),
            total_paid_amount=float(total_paid_amount),
            total_debt_amount=float(total_debt_amount),
            average_order_amount=float(average_order_amount),
            last_order_date=last_order_date,
            last_sale_date=last_sale_date,
        )