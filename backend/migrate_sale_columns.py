"""
Migration script to add new columns to sales table
"""
import sqlite3
import os
from pathlib import Path

# Database path - same as in database.py
DB_PATH = Path(__file__).parent / "inventory.db"

def migrate():
    """Add new columns to sales table"""
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(sales)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add payment_amount if not exists
        if 'payment_amount' not in columns:
            print("Adding payment_amount column...")
            cursor.execute("ALTER TABLE sales ADD COLUMN payment_amount REAL")
            print("✓ payment_amount column added")
        else:
            print("✓ payment_amount column already exists")
        
        # Add excess_action if not exists
        if 'excess_action' not in columns:
            print("Adding excess_action column...")
            cursor.execute("ALTER TABLE sales ADD COLUMN excess_action VARCHAR(20)")
            print("✓ excess_action column added")
        else:
            print("✓ excess_action column already exists")
        
        # Add requires_admin_approval if not exists
        if 'requires_admin_approval' not in columns:
            print("Adding requires_admin_approval column...")
            cursor.execute("ALTER TABLE sales ADD COLUMN requires_admin_approval BOOLEAN NOT NULL DEFAULT 0")
            print("✓ requires_admin_approval column added")
        else:
            print("✓ requires_admin_approval column already exists")
        
        # Add admin_approved if not exists
        if 'admin_approved' not in columns:
            print("Adding admin_approved column...")
            cursor.execute("ALTER TABLE sales ADD COLUMN admin_approved BOOLEAN")
            print("✓ admin_approved column added")
        else:
            print("✓ admin_approved column already exists")
        
        # Add approved_by if not exists
        if 'approved_by' not in columns:
            print("Adding approved_by column...")
            cursor.execute("ALTER TABLE sales ADD COLUMN approved_by INTEGER REFERENCES sellers(id)")
            print("✓ approved_by column added")
        else:
            print("✓ approved_by column already exists")
        
        # Add approved_at if not exists
        if 'approved_at' not in columns:
            print("Adding approved_at column...")
            cursor.execute("ALTER TABLE sales ADD COLUMN approved_at DATETIME")
            print("✓ approved_at column added")
        else:
            print("✓ approved_at column already exists")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting sales table migration...")
    migrate()

