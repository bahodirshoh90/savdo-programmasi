"""
Migration script to add payment_method column to orders table
"""
import sqlite3
import os
from pathlib import Path

# Database path - same as in database.py
DB_PATH = Path(__file__).parent / "inventory.db"

def migrate():
    """Add payment_method column to orders table"""
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        print("Database will be created when you run the application")
        return
    
    # Backup database first
    backup_path = str(DB_PATH) + ".backup"
    if not os.path.exists(backup_path):
        print(f"Creating backup: {backup_path}")
        import shutil
        shutil.copy2(str(DB_PATH), backup_path)
        print("[OK] Backup created")
    else:
        print(f"Backup already exists: {backup_path}")
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(orders)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add payment_method if not exists
        if 'payment_method' not in columns:
            print("Adding payment_method column to orders table...")
            # SQLite doesn't support ENUM directly, so we use VARCHAR
            # The enum constraint will be enforced at the application level
            cursor.execute("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) NOT NULL DEFAULT 'cash'")
            
            # Update existing orders to have 'cash' as default payment method
            cursor.execute("UPDATE orders SET payment_method = 'cash' WHERE payment_method IS NULL OR payment_method = ''")
            
            conn.commit()
            print("[OK] payment_method column added to orders table")
        else:
            print("[OK] payment_method column already exists in orders table")
        
        print("\n[OK] Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Orders table migration: Adding payment_method column")
    print("=" * 60)
    migrate()
    print("\nDone!")
