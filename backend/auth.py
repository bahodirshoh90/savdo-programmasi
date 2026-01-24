"""
Authorization and Permission Management
"""
from functools import wraps
from fastapi import HTTPException, Depends, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from database import SessionLocal
from models import Seller, Role, Permission


# Predefined permission codes
PERMISSIONS = {
    # Products
    "products.view": "Mahsulotlarni ko'rish",
    "products.create": "Mahsulot qo'shish",
    "products.update": "Mahsulotni tahrirlash",
    "products.delete": "Mahsulotni o'chirish",
    "products.export": "Mahsulotlarni export qilish",
    "products.import": "Mahsulotlarni import qilish",
    "products.barcode": "Barcode/QR kod generatsiya",
    
    # Customers
    "customers.view": "Mijozlarni ko'rish",
    "customers.create": "Mijoz qo'shish",
    "customers.update": "Mijozni tahrirlash",
    "customers.delete": "Mijozni o'chirish",
    
    # Sales
    "sales.view": "Sotuvlarni ko'rish",
    "sales.create": "Sotuv yaratish",
    "sales.update": "Sotuvni tahrirlash",
    "sales.receipt": "Chek chiqarish",
    "sales.export": "Sotuvlarni export qilish",
    
    # Orders
    "orders.view": "Buyurtmalarni ko'rish",
    "orders.create": "Buyurtma yaratish",
    "orders.update": "Buyurtma statusini o'zgartirish",
    "orders.delete": "Buyurtmani bekor qilish",
    
    # Statistics
    "statistics.view": "Statistikani ko'rish",
    "statistics.export": "Hisobotlarni export qilish",
    
    # Inventory
    "inventory.view": "Omborni ko'rish",
    "inventory.update": "Ombor miqdorini o'zgartirish",
    
    # Prices
    "prices.view": "Narxlarni ko'rish",
    "prices.update": "Narxlarni o'zgartirish",
    
    # Administration
    "admin.sellers": "Sotuvchilarni boshqarish",
    "admin.roles": "Rollarni boshqarish",
    "admin.permissions": "Ruxsatlarni boshqarish",
    "admin.settings": "Sozlamalarni boshqarish",
    
    # GPS
    "gps.view": "GPS xaritani ko'rish",
    "gps.update": "GPS joylashuvni yangilash",
    
    # Notifications
    "notifications.send": "Push bildirishnomalar yuborish",
}


def get_db():
    """Database dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_seller_from_header(
    x_seller_id: Optional[int] = Header(None, alias="X-Seller-ID"),
    db: Session = Depends(get_db)
) -> Optional[Seller]:
    """Get seller from X-Seller-ID header"""
    if not x_seller_id:
        return None
    
    seller = db.query(Seller).filter(Seller.id == x_seller_id).first()
    if not seller or not seller.is_active:
        raise HTTPException(status_code=403, detail="Seller not found or inactive")
    
    return seller


def check_permission(permission_code: str):
    """Decorator to check if seller has required permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            seller: Seller = kwargs.get('seller')
            db: Session = kwargs.get('db')
            
            # If no seller provided, allow (for admin panel access)
            if not seller:
                return await func(*args, **kwargs)
            
            # Check if seller has permission
            if not has_permission(db, seller, permission_code):
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission denied: {permission_code}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def has_permission(db: Session, seller: Seller, permission_code: str) -> bool:
    """Check if seller has specific permission"""
    if not seller.role:
        return False
    
    # Get all permissions for seller's role
    role = db.query(Role).filter(Role.id == seller.role_id).first()
    if not role:
        return False
    
    # Check if role has the permission
    permission = db.query(Permission).filter(Permission.code == permission_code).first()
    if not permission:
        return False
    
    return permission in role.permissions


def get_seller_permissions(db: Session, seller: Seller) -> List[str]:
    """Get all permission codes for a seller"""
    if not seller.role:
        return []
    
    role = db.query(Role).filter(Role.id == seller.role_id).first()
    if not role:
        return []
    
    return [perm.code for perm in role.permissions]


def require_permission(permission_code: str):
    """Dependency for FastAPI routes that require permission"""
    async def permission_dependency(
        seller: Optional[Seller] = Depends(get_seller_from_header),
        db: Session = Depends(get_db)
    ):
        if not seller:
            raise HTTPException(status_code=401, detail="Seller ID required")
        
        if not has_permission(db, seller, permission_code):
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {permission_code}"
            )
        
        return seller
    
    return permission_dependency

