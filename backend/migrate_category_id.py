#!/usr/bin/env python3
"""
Migration script to add category_id column to products table
"""
import sqlite3
import sys
from pathlib import Path

# Get database path
BASE_DIR = Path(__file__).resolve().parent
db_path = BASE_DIR / "inventory.db"

if not db_path.exists():
    print(f"Database file not found: {db_path}")
    print(f"Please make sure inventory.db exists in the backend directory.")
    sys.exit(1)

try:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Check if column already exists
    cursor.execute("PRAGMA table_info(products)")
    columns = [col[1] for col in cursor.fetchall()]
    
    print(f"Current products table columns: {columns}")
    
    if 'category_id' not in columns:
        print("Adding category_id column to products table...")
        cursor.execute("ALTER TABLE products ADD COLUMN category_id INTEGER")
        
        # Create index for better performance
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_products_category_id ON products(category_id)")
            print("[OK] Created index on category_id")
        except Exception as idx_error:
            print(f"Warning: Could not create index on category_id: {idx_error}")
        
        conn.commit()
        print("[OK] category_id column added successfully!")
    else:
        print("[OK] category_id column already exists")
    
    # Verify
    cursor.execute("PRAGMA table_info(products)")
    columns_after = [col[1] for col in cursor.fetchall()]
    print(f"Products table columns after migration: {columns_after}")
    
    conn.close()
    print("\nMigration completed successfully!")
    
except Exception as e:
    print(f"Error during migration: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
