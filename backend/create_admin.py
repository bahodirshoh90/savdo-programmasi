"""
Create default admin user script
Run this script to create a default admin user in the database
"""
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, init_db
from models import Seller, Role
from services.auth_service import AuthService

def create_default_admin():
    """Create default admin user"""
    # Initialize database first
    init_db()
    
    db = SessionLocal()
    try:
        # Check if admin user already exists
        admin_user = db.query(Seller).filter(Seller.username == "admin").first()
        if admin_user:
            print("⚠ Admin user already exists!")
            print(f"   Username: {admin_user.username}")
            print(f"   Email: {admin_user.email}")
            print(f"   Name: {admin_user.name}")
            return
        
        # Get Super Admin role
        super_admin_role = db.query(Role).filter(Role.name == "Super Admin").first()
        if not super_admin_role:
            print("❌ Error: Super Admin role not found!")
            print("   Please run the application first to create roles.")
            return
        
        # Create admin user
        admin_user = Seller(
            username="admin",
            email="admin@savdo.uz",
            name="Admin",
            phone="+998901234567",
            role_id=super_admin_role.id,
            is_active=True
        )
        
        # Set password
        password = "admin123"  # Default password
        admin_user.password_hash = AuthService.hash_password(password)
        
        db.add(admin_user)
        db.commit()
        
        print("✅ Default admin user created successfully!")
        print("=" * 50)
        print("Login credentials:")
        print(f"   Username: admin")
        print(f"   Password: {password}")
        print("=" * 50)
        print("⚠ IMPORTANT: Please change the password after first login!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin user: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_default_admin()

