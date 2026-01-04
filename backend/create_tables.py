"""
Create Database Tables
This script creates all necessary database tables
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import Base, engine
from models import (
    Seller, Role, Customer, Product, Sale, SaleItem, 
    DebtHistory, Order, OrderItem, Settings, AuditLog
)

def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
        
        # List created tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print(f"\n📋 Created {len(tables)} tables:")
        for table in sorted(tables):
            print(f"  - {table}")
        
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

if __name__ == "__main__":
    create_tables()
