"""
Seller Service
"""
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime
from models import Seller, Role
from schemas import SellerCreate, SellerUpdate, SellerResponse


class SellerService:
    """Service for seller management"""
    
    @staticmethod
    def create_seller(db: Session, seller: SellerCreate) -> Seller:
        """Create a new seller"""
        from auth_service import AuthService
        
        seller_data = seller.dict(exclude={'password'})
        # Handle role_id properly
        if 'role_id' in seller_data and seller_data['role_id'] is None:
            seller_data.pop('role_id')
        
        # Hash password if provided
        if seller.password:
            seller_data['password_hash'] = AuthService.hash_password(seller.password)
        
        db_seller = Seller(**seller_data)
        db.add(db_seller)
        db.commit()
        db.refresh(db_seller)
        # Reload with role relationship
        return db.query(Seller).options(selectinload(Seller.role)).filter(Seller.id == db_seller.id).first()
    
    @staticmethod
    def get_sellers(db: Session, skip: int = 0, limit: int = 100) -> List[Seller]:
        """Get all sellers"""
        return db.query(Seller).options(selectinload(Seller.role)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_seller(db: Session, seller_id: int) -> Optional[Seller]:
        """Get a specific seller by ID"""
        return db.query(Seller).options(selectinload(Seller.role)).filter(Seller.id == seller_id).first()
    
    @staticmethod
    def update_seller(db: Session, seller_id: int, seller: SellerUpdate) -> Optional[Seller]:
        """Update a seller"""
        from auth_service import AuthService
        
        db_seller = db.query(Seller).filter(Seller.id == seller_id).first()
        if not db_seller:
            return None
        
        try:
            update_data = seller.model_dump(exclude_unset=True, exclude={'password'})
        except AttributeError:
            update_data = seller.dict(exclude_unset=True)
            if 'password' in update_data:
                update_data.pop('password')
        
        # Handle password separately
        if seller.password:
            update_data['password_hash'] = AuthService.hash_password(seller.password)
        
        for field, value in update_data.items():
            # Handle None/empty values for role_id
            if field == 'role_id' and (value == '' or value is None):
                db_seller.role_id = None
                continue
            setattr(db_seller, field, value)
        
        db.commit()
        db.refresh(db_seller)
        # Reload with role relationship
        return db.query(Seller).options(selectinload(Seller.role)).filter(Seller.id == seller_id).first()
    
    @staticmethod
    def update_location(db: Session, seller_id: int, latitude: float, longitude: float) -> bool:
        """Update seller GPS location"""
        db_seller = db.query(Seller).filter(Seller.id == seller_id).first()
        if not db_seller:
            return False
        
        from utils import get_uzbekistan_now
        
        db_seller.latitude = latitude
        db_seller.longitude = longitude
        db_seller.last_location_update = get_uzbekistan_now()
        
        db.commit()
        return True
    
    @staticmethod
    def clear_location(db: Session, seller_id: int) -> bool:
        """Clear (delete) seller GPS location"""
        db_seller = db.query(Seller).filter(Seller.id == seller_id).first()
        if not db_seller:
            return False
        
        db_seller.latitude = None
        db_seller.longitude = None
        db_seller.last_location_update = None
        
        db.commit()
        return True
    
    @staticmethod
    def get_all_locations(db: Session, only_within_work_hours: bool = False) -> List[Dict[str, Any]]:
        """Get all sellers' current locations
        If only_within_work_hours is True, only return locations updated during work hours
        """
        try:
            from .settings_service import SettingsService
        except ImportError:
            from settings_service import SettingsService
        from datetime import datetime, timedelta
        from utils import to_uzbekistan_time
        
        sellers = db.query(Seller).filter(
            Seller.latitude.isnot(None),
            Seller.longitude.isnot(None),
            Seller.is_active == True
        ).all()
        
        locations = []
        
        for seller in sellers:
            # If filtering by work hours, check if last update was during work hours
            if only_within_work_hours:
                if not seller.last_location_update:
                    continue
                
                from utils import get_uzbekistan_now, to_uzbekistan_time
                
                # Check if location update was recent (within last hour) and during work hours
                now = get_uzbekistan_now()
                update_time_uz = to_uzbekistan_time(seller.last_location_update)
                time_since_update = (now - update_time_uz).total_seconds()
                
                # Only show locations updated in the last hour during work hours
                if time_since_update > 3600:  # More than 1 hour ago
                    continue
                
                # Check if update was during work hours
                update_time = update_time_uz
                update_day = update_time.weekday() + 1
                update_time_str = update_time.strftime("%H:%M")
                
                settings = SettingsService.get_settings(db)
                if settings.work_start_time and settings.work_end_time:
                    try:
                        start_hour, start_min = map(int, settings.work_start_time.split(":"))
                        end_hour, end_min = map(int, settings.work_end_time.split(":"))
                        
                        start_time_minutes = start_hour * 60 + start_min
                        end_time_minutes = end_hour * 60 + end_min
                        update_time_minutes = update_time.hour * 60 + update_time.minute
                        
                        if start_time_minutes > end_time_minutes:
                            is_within_time = update_time_minutes >= start_time_minutes or update_time_minutes <= end_time_minutes
                        else:
                            is_within_time = start_time_minutes <= update_time_minutes <= end_time_minutes
                        
                        work_days = settings.work_days or "1,2,3,4,5,6,7"
                        work_days_list = [int(d.strip()) for d in work_days.split(",")]
                        is_within_days = update_day in work_days_list
                        
                        if not (is_within_time and is_within_days):
                            continue
                    except Exception:
                        # On error, include the location
                        pass
            
            locations.append({
                "id": seller.id,
                "name": seller.name,
                "latitude": seller.latitude,
                "longitude": seller.longitude,
                "last_update": to_uzbekistan_time(seller.last_location_update).isoformat() if seller.last_location_update else None
            })
        
        return locations
    
    @staticmethod
    def delete_seller(db: Session, seller_id: int) -> bool:
        """Delete a seller (hard delete)"""
        from models import Sale, SaleItem, Order, OrderItem, AuditLog, DebtHistory
        
        db_seller = db.query(Seller).filter(Seller.id == seller_id).first()
        if not db_seller:
            return False
        
        try:
            # Delete related data first (in correct order to avoid foreign key constraints)
            
            # 1. Delete audit logs where seller is the user
            db.query(AuditLog).filter(AuditLog.user_id == seller_id).delete()
            
            # 2. Delete debt history where seller created it
            db.query(DebtHistory).filter(DebtHistory.created_by == seller_id).delete()
            
            # 3. Location history is stored in Seller model itself (latitude, longitude, last_location_update)
            # Just clear these fields before deletion (optional, but cleaner)
            db_seller.latitude = None
            db_seller.longitude = None
            db_seller.last_location_update = None
            
            # 4. Delete order items first, then orders
            orders = db.query(Order).filter(Order.seller_id == seller_id).all()
            for order in orders:
                db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()
            db.query(Order).filter(Order.seller_id == seller_id).delete()
            
            # 5. Delete sale items first, then sales
            sales = db.query(Sale).filter(Sale.seller_id == seller_id).all()
            for sale in sales:
                db.query(SaleItem).filter(SaleItem.sale_id == sale.id).delete()
            db.query(Sale).filter(Sale.seller_id == seller_id).delete()
            
            # 6. Update approved_by in sales to NULL if this seller approved them
            db.query(Sale).filter(Sale.approved_by == seller_id).update({Sale.approved_by: None})
            
            # 7. Finally delete the seller
            db.delete(db_seller)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error deleting seller {seller_id}: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    @staticmethod
    def get_seller_permissions(db: Session, seller_id: int) -> List[Dict[str, Any]]:
        """Get all permissions for a seller"""
        seller = db.query(Seller).options(selectinload(Seller.role).selectinload(Role.permissions)).filter(Seller.id == seller_id).first()
        if not seller or not seller.role:
            return []
        
        return [
            {
                "id": p.id,
                "code": p.code,
                "name": p.name,
                "category": p.category
            }
            for p in seller.role.permissions
        ]

