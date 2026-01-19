#!/usr/bin/env python3
"""
Migration script to add rotation_interval column to banners table
"""
import sqlite3
import os
import sys
from pathlib import Path

# Get database path (same as database.py)
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
    cursor.execute("PRAGMA table_info(banners)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'rotation_interval' not in columns:
        print("Adding rotation_interval column to banners table...")
        cursor.execute("""
            ALTER TABLE banners 
            ADD COLUMN rotation_interval INTEGER NOT NULL DEFAULT 3000
        """)
        conn.commit()
        print("✓ rotation_interval column added successfully!")
    else:
        print("✓ rotation_interval column already exists")
    
    conn.close()
    print("Migration completed successfully!")
    
except Exception as e:
    print(f"Error during migration: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
