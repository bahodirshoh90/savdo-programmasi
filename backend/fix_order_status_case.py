#!/usr/bin/env python3
"""
Fix order status case in database
Converts uppercase status values to lowercase to match OrderStatus enum
"""
import sqlite3
import sys
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / "inventory.db"

if not DB_PATH.exists():
    print(f"❌ Database fayl topilmadi: {DB_PATH}")
    sys.exit(1)

print(f"📁 Database fayl: {DB_PATH}")
print("=" * 60)

# Status mapping: uppercase -> lowercase
STATUS_MAPPING = {
    'PENDING': 'pending',
    'PROCESSING': 'processing',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled',
    'RETURNED': 'returned',
}

try:
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # Check current statuses
    print("\n📊 Hozirgi statuslar:")
    cursor.execute("SELECT DISTINCT status FROM orders")
    current_statuses = [row[0] for row in cursor.fetchall()]
    print(f"  Topilgan statuslar: {current_statuses}")
    
    # Count orders by status before migration
    print("\n📦 Migration oldidan buyurtmalar:")
    cursor.execute("SELECT status, COUNT(*) FROM orders GROUP BY status")
    before_counts = cursor.fetchall()
    for status, count in before_counts:
        print(f"  {status}: {count}")
    
    # Update statuses
    print("\n🔄 Statuslarni yangilash...")
    updated_count = 0
    
    for old_status, new_status in STATUS_MAPPING.items():
        cursor.execute("SELECT COUNT(*) FROM orders WHERE status = ?", (old_status,))
        count = cursor.fetchone()[0]
        
        if count > 0:
            cursor.execute("UPDATE orders SET status = ? WHERE status = ?", (new_status, old_status))
            print(f"  ✅ {old_status} -> {new_status}: {count} ta buyurtma yangilandi")
            updated_count += count
    
    # Also handle 'completed' (already lowercase but might be inconsistent)
    cursor.execute("SELECT COUNT(*) FROM orders WHERE status = 'completed'")
    completed_count = cursor.fetchone()[0]
    if completed_count > 0:
        cursor.execute("UPDATE orders SET status = 'completed' WHERE status = 'completed'")
        print(f"  ✅ completed (unchanged): {completed_count} ta buyurtma")
    
    # Commit changes
    conn.commit()
    
    # Verify changes
    print("\n📊 Migration keyin buyurtmalar:")
    cursor.execute("SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY status")
    after_counts = cursor.fetchall()
    for status, count in after_counts:
        print(f"  {status}: {count}")
    
    # Check for any remaining uppercase statuses
    cursor.execute("SELECT DISTINCT status FROM orders WHERE status != LOWER(status)")
    remaining_uppercase = cursor.fetchall()
    
    if remaining_uppercase:
        print(f"\n⚠️  Hali ham katta harfli statuslar qolgan: {[s[0] for s in remaining_uppercase]}")
    else:
        print("\n✅ Barcha statuslar kichik harflarga o'zgartirildi!")
    
    print(f"\n✅ Jami {updated_count} ta buyurtma yangilandi!")
    
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
