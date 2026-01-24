#!/usr/bin/env python3
"""Check database structure"""
import sqlite3
from pathlib import Path

db_path = Path(__file__).parent / "inventory.db"

if not db_path.exists():
    print(f"Database not found: {db_path}")
    exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Check categories table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'")
categories_exists = cursor.fetchone() is not None
print(f"Categories table exists: {categories_exists}")

# Check products table columns
cursor.execute("PRAGMA table_info(products)")
products_columns = [col[1] for col in cursor.fetchall()]
print(f"\nProducts table columns: {products_columns}")
print(f"Has category_id: {'category_id' in products_columns}")

# Check if categories table has data
if categories_exists:
    cursor.execute("SELECT COUNT(*) FROM categories")
    count = cursor.fetchone()[0]
    print(f"\nCategories count: {count}")

conn.close()
