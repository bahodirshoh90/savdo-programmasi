"""
Database Configuration
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path

# Get absolute path to database file (always in backend directory)
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "inventory.db"

# SQLite database URL with absolute path
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

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
        # Ensure permissions exist (create missing ones)
        existing_permissions = {p.code: p for p in db.query(Permission).all()}
        created_permissions = False
        for code, name in PERMISSIONS.items():
            if code not in existing_permissions:
                category = code.split('.')[0]
                permission = Permission(
                    code=code,
                    name=name,
                    category=category,
                    description=f"Ruxsat: {name}"
                )
                db.add(permission)
                created_permissions = True
        if created_permissions:
            db.commit()
            existing_permissions = {p.code: p for p in db.query(Permission).all()}

        all_permissions = list(existing_permissions.values())

        # Create default roles if missing
        super_admin = db.query(Role).filter(Role.name == "Super Admin").first()
        if not super_admin:
            super_admin = Role(
                name="Super Admin",
                description="Barcha ruxsatlarga ega",
                is_system=True
            )
            db.add(super_admin)
            db.flush()

        manager = db.query(Role).filter(Role.name == "Manager").first()
        if not manager:
            manager = Role(
                name="Manager",
                description="Ko'pchilik ruxsatlarga ega, admin ruxsatlari yo'q",
                is_system=True
            )
            db.add(manager)
            db.flush()

        seller_role = db.query(Role).filter(Role.name == "Seller").first()
        if not seller_role:
            seller_role = Role(
                name="Seller",
                description="Asosiy sotish ruxsatlari",
                is_system=True
            )
            db.add(seller_role)
            db.flush()

        viewer = db.query(Role).filter(Role.name == "Viewer").first()
        if not viewer:
            viewer = Role(
                name="Viewer",
                description="Faqat ko'rish ruxsati",
                is_system=True
            )
            db.add(viewer)
            db.flush()

        # Sync permissions for system roles
        super_admin.permissions = all_permissions

        manager_permissions = [p for p in all_permissions if not p.code.startswith("admin.")]
        manager.permissions = manager_permissions

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

        viewer_permissions = [p for p in all_permissions if p.code.endswith(".view")]
        viewer.permissions = viewer_permissions

        db.commit()
    finally:
        db.close()

