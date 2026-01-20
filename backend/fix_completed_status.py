#!/usr/bin/env python3
"""
Fix 'completed' status values in database to 'COMPLETED' (uppercase enum name).
This fixes the LookupError when SQLAlchemy tries to map database values to OrderStatus enum.
"""
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / "inventory.db"

if not DB_PATH.exists():
    print(f"❌ Database fayl topilmadi: {DB_PATH}")
    sys.exit(1)

print(f"📁 Database fayl: {DB_PATH}")
print("=" * 60)

try:
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # Check current statuses
    print("\n📊 Hozirgi statuslar:")
    cursor.execute("SELECT DISTINCT status FROM orders")
    current_statuses = [row[0] for row in cursor.fetchall()]
    print(f"  Topilgan statuslar: {current_statuses}")
    
    # Count orders with lowercase 'completed'
    cursor.execute("SELECT COUNT(*) FROM orders WHERE status = 'completed'")
    completed_count = cursor.fetchone()[0]
    
    if completed_count > 0:
        print(f"\n🔄 {completed_count} ta 'completed' statusni 'COMPLETED' ga o'zgartirish...")
        cursor.execute("UPDATE orders SET status = 'COMPLETED' WHERE status = 'completed'")
        conn.commit()
        print(f"✅ {completed_count} ta buyurtma yangilandi!")
    else:
        print("\n✅ 'completed' statusli buyurtmalar topilmadi.")
    
    # Verify changes
    print("\n📊 Yangilangan statuslar:")
    cursor.execute("SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY status")
    for status, count in cursor.fetchall():
        print(f"  {status}: {count}")
    
    # Check for any remaining lowercase 'completed'
    cursor.execute("SELECT COUNT(*) FROM orders WHERE status = 'completed'")
    remaining = cursor.fetchone()[0]
    
    if remaining > 0:
        print(f"\n⚠️  Hali ham {remaining} ta 'completed' status qolgan!")
    else:
        print("\n✅ Barcha 'completed' statuslar 'COMPLETED' ga o'zgartirildi!")
    
    conn.close()
    
except sqlite3.Error as e:
    print(f"❌ Database xatosi: {e}")
    if conn:
        conn.rollback()
    sys.exit(1)
except Exception as e:
    print(f"❌ Xatolik: {e}")
    import traceback
    traceback.print_exc()
    if conn:
        conn.rollback()
    sys.exit(1)
