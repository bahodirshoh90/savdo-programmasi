"""
Inventory Service
"""
from sqlalchemy.orm import Session
from typing import Optional
from models import InventoryTransaction


class InventoryService:
    """Service for inventory transaction management"""
    
    @staticmethod
    def record_transaction(
        db: Session,
        product_id: int,
        transaction_type: str,
        packages_change: int,
        pieces_change: int,
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None,
        notes: Optional[str] = None
    ) -> InventoryTransaction:
        """Record an inventory transaction"""
        transaction = InventoryTransaction(
            product_id=product_id,
            transaction_type=transaction_type,
            packages_change=packages_change,
            pieces_change=pieces_change,
            reference_id=reference_id,
            reference_type=reference_type,
            notes=notes
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
