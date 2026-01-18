"""
Database Migration Script
Adds missing columns: role_id to sellers, brand/supplier/received_date to products
"""
import sqlite3
import os
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / "inventory.db"

def migrate_database():
    """Add missing columns to existing database"""
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        print("Database will be created when you run the application")
        return
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Check and add role_id, username, password_hash to sellers table
        cursor.execute("PRAGMA table_info(sellers)")
        seller_columns = [col[1] for col in cursor.fetchall()]
        
        if 'role_id' not in seller_columns:
            print("Adding role_id column to sellers table...")
            cursor.execute("ALTER TABLE sellers ADD COLUMN role_id INTEGER")
            print("✓ Added role_id to sellers")
        else:
            print("✓ role_id already exists in sellers")
        
        if 'username' not in seller_columns:
            print("Adding username column to sellers table...")
            cursor.execute("ALTER TABLE sellers ADD COLUMN username VARCHAR(100)")
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_sellers_username ON sellers(username)")
            print("✓ Added username to sellers")
        else:
            print("✓ username already exists in sellers")
        
        if 'password_hash' not in seller_columns:
            print("Adding password_hash column to sellers table...")
            cursor.execute("ALTER TABLE sellers ADD COLUMN password_hash VARCHAR(255)")
            print("✓ Added password_hash to sellers")
        else:
            print("✓ password_hash already exists in sellers")
        
        # Check and add brand, supplier, received_date to products table
        cursor.execute("PRAGMA table_info(products)")
        product_columns = [col[1] for col in cursor.fetchall()]
        
        if 'brand' not in product_columns:
            print("Adding brand column to products table...")
            cursor.execute("ALTER TABLE products ADD COLUMN brand VARCHAR(100)")
            print("✓ Added brand to products")
        else:
            print("✓ brand already exists in products")
        
        if 'supplier' not in product_columns:
            print("Adding supplier column to products table...")
            cursor.execute("ALTER TABLE products ADD COLUMN supplier VARCHAR(200)")
            print("✓ Added supplier to products")
        else:
            print("✓ supplier already exists in products")
        
        if 'received_date' not in product_columns:
            print("Adding received_date column to products table...")
            cursor.execute("ALTER TABLE products ADD COLUMN received_date DATETIME")
            print("✓ Added received_date to products")
        else:
            print("✓ received_date already exists in products")
        
        if 'image_url' not in product_columns:
            print("Adding image_url column to products table...")
            cursor.execute("ALTER TABLE products ADD COLUMN image_url VARCHAR(500)")
            print("✓ Added image_url to products")
        else:
            print("✓ image_url already exists in products")
        
        if 'cost_price' not in product_columns:
            print("Adding cost_price column to products table...")
            cursor.execute("ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0.0")
            print("✓ Added cost_price to products")
        else:
            print("✓ cost_price already exists in products")
        
        if 'location' not in product_columns:
            print("Adding location column to products table...")
            cursor.execute("ALTER TABLE products ADD COLUMN location VARCHAR(200)")
            print("✓ Added location to products")
        else:
            print("✓ location already exists in products")
        
        # Check and add payment_method to sales table
        cursor.execute("PRAGMA table_info(sales)")
        sale_columns = [col[1] for col in cursor.fetchall()]
        
        if 'payment_method' not in sale_columns:
            print("Adding payment_method column to sales table...")
            cursor.execute("ALTER TABLE sales ADD COLUMN payment_method VARCHAR(50)")
            cursor.execute("UPDATE sales SET payment_method = 'cash' WHERE payment_method IS NULL")
            print("✓ Added payment_method to sales")
        else:
            print("✓ payment_method already exists in sales")
        
        # Check and add debt fields to customers table
        cursor.execute("PRAGMA table_info(customers)")
        customer_columns = [col[1] for col in cursor.fetchall()]
        
        if 'debt_balance' not in customer_columns:
            print("Adding debt_balance column to customers table...")
            cursor.execute("ALTER TABLE customers ADD COLUMN debt_balance REAL DEFAULT 0.0")
            print("✓ Added debt_balance to customers")
        else:
            print("✓ debt_balance already exists in customers")
        
        if 'debt_limit' not in customer_columns:
            print("Adding debt_limit column to customers table...")
            cursor.execute("ALTER TABLE customers ADD COLUMN debt_limit REAL")
            print("✓ Added debt_limit to customers")
        else:
            print("✓ debt_limit already exists in customers")
        
        if 'debt_due_date' not in customer_columns:
            print("Adding debt_due_date column to customers table...")
            cursor.execute("ALTER TABLE customers ADD COLUMN debt_due_date DATETIME")
            print("✓ Added debt_due_date to customers")
        else:
            print("✓ debt_due_date already exists in customers")
        
        # Check and add username and password_hash to customers table
        if 'username' not in customer_columns:
            print("Adding username column to customers table...")
            cursor.execute("ALTER TABLE customers ADD COLUMN username VARCHAR(100)")
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_username ON customers(username)")
            print("✓ Added username to customers")
        else:
            print("✓ username already exists in customers")
        
        if 'password_hash' not in customer_columns:
            print("Adding password_hash column to customers table...")
            cursor.execute("ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255)")
            print("✓ Added password_hash to customers")
        else:
            print("✓ password_hash already exists in customers")
            print("Adding debt_due_date column to customers table...")
            cursor.execute("ALTER TABLE customers ADD COLUMN debt_due_date DATETIME")
            print("✓ Added debt_due_date to customers")
        else:
            print("✓ debt_due_date already exists in customers")
        
        # Check and create debt_history table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='debt_history'")
        if not cursor.fetchone():
            print("Creating debt_history table...")
            cursor.execute("""
                CREATE TABLE debt_history (
                    id INTEGER NOT NULL PRIMARY KEY,
                    customer_id INTEGER NOT NULL,
                    transaction_type VARCHAR(50) NOT NULL,
                    amount REAL NOT NULL,
                    balance_before REAL NOT NULL,
                    balance_after REAL NOT NULL,
                    reference_id INTEGER,
                    reference_type VARCHAR(50),
                    notes TEXT,
                    created_by INTEGER,
                    created_by_name VARCHAR(200),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(customer_id) REFERENCES customers (id),
                    FOREIGN KEY(created_by) REFERENCES sellers (id)
                )
            """)
            cursor.execute("CREATE INDEX idx_debt_history_customer ON debt_history(customer_id)")
            cursor.execute("CREATE INDEX idx_debt_history_created_at ON debt_history(created_at)")
            print("✓ Created debt_history table")
        else:
            print("✓ debt_history table already exists")
        
        conn.commit()
        print("\n✅ Database migration completed successfully!")
        
    except sqlite3.Error as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting database migration...\n")
    migrate_database()

