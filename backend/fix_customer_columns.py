"""
Fix customers table - add username and password_hash columns if they don't exist
"""
import sqlite3
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'inventory.db')

def fix_customer_columns():
    """Add username and password_hash columns to customers table if they don't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if username column exists
        cursor.execute("PRAGMA table_info(customers)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'username' not in columns:
            print("Adding username column to customers table...")
            cursor.execute("ALTER TABLE customers ADD COLUMN username VARCHAR(100) UNIQUE")
            print("✅ username column added")
        else:
            print("✅ username column already exists")
        
        if 'password_hash' not in columns:
            print("Adding password_hash column to customers table...")
            cursor.execute("ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255)")
            print("✅ password_hash column added")
        else:
            print("✅ password_hash column already exists")
        
        conn.commit()
        print("✅ Database migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    fix_customer_columns()
