"""
Database Configuration
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# SQLite database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./inventory.db"

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def init_db():
    """Initialize database - create all tables and initial data"""
    # Import here to avoid circular imports
    from models import Base, Role, Permission
    from auth import PERMISSIONS
    
    Base.metadata.create_all(bind=engine)
    
    # Initialize default roles and permissions
    db = SessionLocal()
    try:
        # Check if permissions already exist
        if db.query(Permission).count() == 0:
            # Create permissions
            for code, name in PERMISSIONS.items():
                category = code.split('.')[0]
                permission = Permission(
                    code=code,
                    name=name,
                    category=category,
                    description=f"Ruxsat: {name}"
                )
                db.add(permission)
            
            db.commit()
            
            # Create default roles
            # 1. Super Admin - all permissions
            super_admin = Role(
                name="Super Admin",
                description="Barcha ruxsatlarga ega",
                is_system=True
            )
            db.add(super_admin)
            db.flush()
            
            all_permissions = db.query(Permission).all()
            super_admin.permissions = all_permissions
            
            # 2. Manager - most permissions except admin
            manager = Role(
                name="Manager",
                description="Ko'pchilik ruxsatlarga ega, admin ruxsatlari yo'q",
                is_system=True
            )
            db.add(manager)
            db.flush()
            
            manager_permissions = [p for p in all_permissions if not p.code.startswith("admin.")]
            manager.permissions = manager_permissions
            
            # 3. Seller - basic selling permissions
            seller_role = Role(
                name="Seller",
                description="Asosiy sotish ruxsatlari",
                is_system=True
            )
            db.add(seller_role)
            db.flush()
            
            seller_permissions = [
                p for p in all_permissions 
                if p.code in [
                    "products.view", "customers.view", "customers.create",
                    "sales.create", "sales.view", "sales.receipt",
                    "orders.create", "orders.view", "prices.view",
                    "gps.update"
                ]
            ]
            seller_role.permissions = seller_permissions
            
            # 4. Viewer - read only
            viewer = Role(
                name="Viewer",
                description="Faqat ko'rish ruxsati",
                is_system=True
            )
            db.add(viewer)
            db.flush()
            
            viewer_permissions = [p for p in all_permissions if p.code.endswith(".view")]
            viewer.permissions = viewer_permissions
            
            db.commit()
    finally:
        db.close()

