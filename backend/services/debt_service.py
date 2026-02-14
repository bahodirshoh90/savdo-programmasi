"""
Debt Service - Manage customer debts
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from datetime import datetime
from models import Customer, DebtHistory, Seller
from schemas import DebtHistoryResponse


class DebtService:
    """Service for debt management"""
    
    @staticmethod
    def add_debt(
        db: Session,
        customer_id: int,
        amount: float,
        reason: str,
        created_by: Optional[int] = None,
        created_by_name: str = "System",
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None
    ) -> DebtHistory:
        """Add debt to customer"""
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError("Customer not found")
        
        balance_before = customer.debt_balance
        customer.debt_balance += amount
        balance_after = customer.debt_balance
        
        db.commit()
        db.refresh(customer)
        
        # Record in history
        debt_history = DebtHistory(
            customer_id=customer_id,
            transaction_type="debt_added",
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            reference_id=reference_id,
            reference_type=reference_type,
            notes=reason,
            created_by=created_by,
            created_by_name=created_by_name
        )
        db.add(debt_history)
        db.commit()
        db.refresh(debt_history)
        
        return debt_history
    
    @staticmethod
    def pay_debt(
        db: Session,
        customer_id: int,
        amount: float,
        reason: str,
        created_by: Optional[int] = None,
        created_by_name: str = "System",
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None
    ) -> DebtHistory:
        """Pay customer debt"""
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError("Customer not found")
        
        balance_before = customer.debt_balance
        customer.debt_balance = max(0, customer.debt_balance - amount)  # Can't go negative
        balance_after = customer.debt_balance
        
        db.commit()
        db.refresh(customer)
        
        # Record in history
        debt_history = DebtHistory(
            customer_id=customer_id,
            transaction_type="debt_paid",
            amount=-amount,  # Negative for payment
            balance_before=balance_before,
            balance_after=balance_after,
            reference_id=reference_id,
            reference_type=reference_type,
            notes=reason,
            created_by=created_by,
            created_by_name=created_by_name
        )
        db.add(debt_history)
        db.commit()
        db.refresh(debt_history)
        
        return debt_history
    
    @staticmethod
    def process_order_payment(
        db: Session,
        customer_id: int,
        order_amount: float,
        payment_amount: float,
        order_id: int,
        allow_debt: bool = False,
        created_by: Optional[int] = None,
        created_by_name: str = "System"
    ) -> Dict[str, Any]:
        """
        Process order payment with debt handling.
        Returns: {
            "paid": amount_paid,
            "debt_added": debt_added,
            "excess_paid": excess_paid,
            "new_balance": new_balance
        }
        """
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError("Customer not found")
        
        balance_before = customer.debt_balance
        excess = payment_amount - order_amount
        debt_to_add = order_amount - payment_amount
        
        result = {
            "paid": min(payment_amount, order_amount),
            "debt_added": 0.0,
            "excess_paid": 0.0,
            "new_balance": balance_before
        }
        
        if excess > 0:
            # Customer paid more than order amount
            # Apply excess to debt if exists
            if customer.debt_balance > 0:
                debt_paid = min(excess, customer.debt_balance)
                customer.debt_balance -= debt_paid
                excess -= debt_paid
                
                # Record debt payment
                if debt_paid > 0:
                    debt_history = DebtHistory(
                        customer_id=customer_id,
                        transaction_type="debt_paid",
                        amount=-debt_paid,
                        balance_before=balance_before,
                        balance_after=customer.debt_balance,
                        reference_id=order_id,
                        reference_type="order",
                        notes=f"Buyurtma #{order_id} to'lovidan ortiqcha summa",
                        created_by=created_by,
                        created_by_name=created_by_name
                    )
                    db.add(debt_history)
            
            result["excess_paid"] = excess
            result["new_balance"] = customer.debt_balance
        
        elif debt_to_add > 0:
            # Customer paid less than order amount
            if allow_debt:
                customer.debt_balance += debt_to_add
                
                # Record debt addition
                debt_history = DebtHistory(
                    customer_id=customer_id,
                    transaction_type="order_payment",
                    amount=debt_to_add,
                    balance_before=balance_before,
                    balance_after=customer.debt_balance,
                    reference_id=order_id,
                    reference_type="order",
                    notes=f"Buyurtma #{order_id} to'lovi yetarli emas",
                    created_by=created_by,
                    created_by_name=created_by_name
                )
                db.add(debt_history)
                
                result["debt_added"] = debt_to_add
            else:
                raise ValueError("To'lov yetarli emas va qarzga qo'shish ruxsati yo'q")
        
        result["new_balance"] = customer.debt_balance
        db.commit()
        db.refresh(customer)
        
        return result
    
    @staticmethod
    def check_debt_limit(db: Session, customer_id: int, additional_debt: float = 0.0) -> tuple[bool, Optional[str]]:
        """
        Check if customer can take more debt.
        Returns: (can_take_debt, error_message)
        """
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return False, "Mijoz topilmadi"
        
        if customer.debt_limit is None:
            return True, None  # No limit
        
        new_balance = customer.debt_balance + additional_debt
        if new_balance > customer.debt_limit:
            return False, f"Qarz limiti oshib ketdi. Joriy qarz: {customer.debt_balance}, Limit: {customer.debt_limit}"
        
        return True, None
    
    @staticmethod
    def get_debt_history(
        db: Session,
        customer_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[DebtHistory]:
        """Get debt history for a customer"""
        return db.query(DebtHistory).filter(
            DebtHistory.customer_id == customer_id
        ).order_by(DebtHistory.created_at.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_total_debt(db: Session) -> float:
        """Get total debt of all customers"""
        result = db.query(func.sum(Customer.debt_balance)).scalar()
        return float(result) if result else 0.0

