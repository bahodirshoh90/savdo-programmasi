"""
Authentication Service
Handles seller and customer login, password hashing, and token generation
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from models import Seller, Customer
from auth import get_seller_permissions


class AuthService:
    """Service for authentication operations"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using SHA256 (simple, can be upgraded to bcrypt)"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        return AuthService.hash_password(password) == password_hash
    
    @staticmethod
    def generate_token() -> str:
        """Generate a simple token (can be upgraded to JWT)"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def authenticate_seller(db: Session, username: str, password: str) -> Optional[Seller]:
        """Authenticate seller by username/email and password"""
        # Try to find seller by username or email
        seller = db.query(Seller).filter(
            (Seller.username == username) | (Seller.email == username)
        ).first()
        
        if not seller:
            return None
        
        # Check if seller is active
        if not seller.is_active:
            return None
        
        # Check if seller has password set
        if not seller.password_hash:
            return None
        
        # Verify password
        if not AuthService.verify_password(password, seller.password_hash):
            return None
        
        return seller
    
    @staticmethod
    def login(db: Session, username: str, password: str) -> Dict[str, Any]:
        """Login seller and return token with permissions"""
        seller = AuthService.authenticate_seller(db, username, password)
        
        if not seller:
            return {
                "success": False,
                "message": "Noto'g'ri login yoki parol"
            }
        
        # Generate token (simple token, can be stored in database for session management)
        token = AuthService.generate_token()
        
        # Get seller permissions
        permissions = get_seller_permissions(db, seller)
        
        return {
            "success": True,
            "seller_id": seller.id,
            "seller_name": seller.name,
            "token": token,
            "permissions": permissions,
            "role_id": seller.role_id,
            "role_name": seller.role.name if seller.role else None
        }
    
    @staticmethod
    def authenticate_customer(db: Session, username: str, password: str) -> Optional[Customer]:
        """Authenticate customer by username and password"""
        customer = db.query(Customer).filter(Customer.username == username).first()
        
        if not customer:
            return None
        
        # Check if customer has password set
        if not customer.password_hash:
            return None
        
        # Verify password
        if not AuthService.verify_password(password, customer.password_hash):
            return None
        
        return customer
    
    @staticmethod
    def login_customer(db: Session, username: str, password: str) -> Dict[str, Any]:
        """Login customer and return token"""
        customer = AuthService.authenticate_customer(db, username, password)
        
        if not customer:
            return {
                "success": False,
                "message": "Noto'g'ri login yoki parol"
            }
        
        # Generate token
        token = AuthService.generate_token()
        
        return {
            "success": True,
            "customer_id": customer.id,
            "customer_name": customer.name,
            "token": token,
            "user": {
                "customer_id": customer.id,
                "name": customer.name,
                "phone": customer.phone,
            }
        }
    
    @staticmethod
    def get_seller_by_id(db: Session, seller_id: int) -> Optional[Seller]:
        """Get seller by ID"""
        return db.query(Seller).filter(Seller.id == seller_id, Seller.is_active == True).first()
    
    @staticmethod
    def set_password(db: Session, seller_id: int, password: str) -> bool:
        """Set password for seller"""
        seller = db.query(Seller).filter(Seller.id == seller_id).first()
        if not seller:
            return False
        
        seller.password_hash = AuthService.hash_password(password)
        db.commit()
        return True

