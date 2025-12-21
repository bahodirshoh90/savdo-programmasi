"""
Audit Service - Track all inventory changes
"""
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from models import AuditLog, Product, Seller
import json


class AuditService:
    """Service for audit log management"""
    
    @staticmethod
    def log_inventory_change(
        db: Session,
        action: str,
        product_id: int,
        quantity_before: int,
        quantity_after: int,
        packages_change: int,
        pieces_change: int,
        user_id: Optional[int] = None,
        user_name: str = "System",
        user_type: str = "system",
        reason: Optional[str] = None,
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log an inventory change"""
        product = db.query(Product).filter(Product.id == product_id).first()
        product_name = product.name if product else "Unknown"
        
        quantity_change = quantity_after - quantity_before
        
        extra_data_json = json.dumps(metadata) if metadata else None
        
        audit_log = AuditLog(
            user_id=user_id,
            user_name=user_name,
            user_type=user_type,
            action=action,
            product_id=product_id,
            product_name=product_name,
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            quantity_change=quantity_change,
            packages_change=packages_change,
            pieces_change=pieces_change,
            reason=reason,
            reference_id=reference_id,
            reference_type=reference_type,
            extra_data=extra_data_json
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        return audit_log
    
    @staticmethod
    def get_audit_logs(
        db: Session,
        product_id: Optional[int] = None,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get audit logs with filters"""
        query = db.query(AuditLog)
        
        if product_id:
            query = query.filter(AuditLog.product_id == product_id)
        
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        
        if action:
            query = query.filter(AuditLog.action == action)
        
        if start_date:
            start = datetime.fromisoformat(start_date)
            query = query.filter(AuditLog.created_at >= start)
        
        if end_date:
            end = datetime.fromisoformat(end_date)
            query = query.filter(AuditLog.created_at <= end)
        
        return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_audit_logs_count(
        db: Session,
        product_id: Optional[int] = None,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> int:
        """Get count of audit logs"""
        query = db.query(AuditLog)
        
        if product_id:
            query = query.filter(AuditLog.product_id == product_id)
        
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        
        if action:
            query = query.filter(AuditLog.action == action)
        
        if start_date:
            start = datetime.fromisoformat(start_date)
            query = query.filter(AuditLog.created_at >= start)
        
        if end_date:
            end = datetime.fromisoformat(end_date)
            query = query.filter(AuditLog.created_at <= end)
        
        return query.count()
    
    @staticmethod
    def audit_log_to_dict(log: AuditLog) -> Dict[str, Any]:
        """Convert AuditLog to dict"""
        extra_data = None
        if log.extra_data:
            try:
                extra_data = json.loads(log.extra_data)
            except:
                extra_data = None
        
        return {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": log.user_name,
            "user_type": log.user_type,
            "action": log.action,
            "product_id": log.product_id,
            "product_name": log.product_name,
            "quantity_before": log.quantity_before,
            "quantity_after": log.quantity_after,
            "quantity_change": log.quantity_change,
            "packages_change": log.packages_change,
            "pieces_change": log.pieces_change,
            "reason": log.reason,
            "reference_id": log.reference_id,
            "reference_type": log.reference_type,
            "extra_data": extra_data,
            "created_at": log.created_at.isoformat() if log.created_at else None
        }

