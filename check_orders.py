#!/usr/bin/env python3
"""
Script to check orders in the database
Run this on the server to check order status
"""
import sqlite3
import sys
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / "backend" / "inventory.db"

if not DB_PATH.exists():
    print(f"❌ Database fayl topilmadi: {DB_PATH}")
    sys.exit(1)

print(f"📁 Database fayl: {DB_PATH}")
print("=" * 60)

try:
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # Check orders table structure
    print("\n📋 Orders jadval strukturasini tekshirish:")
    cursor.execute("PRAGMA table_info(orders)")
    columns = cursor.fetchall()
    print("Columns:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
    
    # Check all orders
    print("\n📦 Barcha buyurtmalar:")
    cursor.execute("SELECT id, status, customer_id, seller_id, total_amount, created_at FROM orders ORDER BY id DESC LIMIT 20")
    orders = cursor.fetchall()
    
    if not orders:
        print("  ❌ Buyurtmalar topilmadi!")
    else:
        print(f"  ✅ {len(orders)} ta buyurtma topildi:")
        print(f"\n{'ID':<5} {'Status':<15} {'Customer':<8} {'Seller':<8} {'Amount':<12} {'Created':<20}")
        print("-" * 80)
        for order in orders:
            order_id, status, customer_id, seller_id, total_amount, created_at = order
            print(f"{order_id:<5} {str(status):<15} {customer_id or 'N/A':<8} {seller_id or 'N/A':<8} {total_amount or 0:<12} {created_at or 'N/A':<20}")
    
    # Check specific order
    print("\n🔍 Order ID 31 ni tekshirish:")
    cursor.execute("SELECT id, status, customer_id, seller_id, total_amount, created_at, updated_at FROM orders WHERE id = 31")
    order_31 = cursor.fetchone()
    
    if order_31:
        print(f"  ✅ Order 31 topildi:")
        print(f"     ID: {order_31[0]}")
        print(f"     Status: {order_31[1]} (type: {type(order_31[1])})")
        print(f"     Customer ID: {order_31[2]}")
        print(f"     Seller ID: {order_31[3]}")
        print(f"     Total Amount: {order_31[4]}")
        print(f"     Created At: {order_31[5]}")
        print(f"     Updated At: {order_31[6]}")
        
        # Check status value in detail
        cursor.execute("SELECT status FROM orders WHERE id = 31")
        status_raw = cursor.fetchone()
        if status_raw:
            print(f"     Status raw value: {repr(status_raw[0])}")
    else:
        print("  ❌ Order 31 topilmadi!")
    
    # Check orders by status
    print("\n📊 Status bo'yicha buyurtmalar:")
    cursor.execute("SELECT status, COUNT(*) FROM orders GROUP BY status")
    status_counts = cursor.fetchall()
    
    if status_counts:
        print("  Status distribution:")
        for status, count in status_counts:
            print(f"    {status}: {count}")
    else:
        print("  ❌ Hech qanday buyurtma topilmadi!")
    
    # Check processing orders specifically
    print("\n⚙️ Processing status'dagi buyurtmalar:")
    cursor.execute("SELECT id, status, customer_id, created_at FROM orders WHERE status = 'processing'")
    processing_orders = cursor.fetchall()
    
    if processing_orders:
        print(f"  ✅ {len(processing_orders)} ta processing buyurtma topildi:")
        for order in processing_orders:
            print(f"    - Order {order[0]}: status={order[1]}, customer={order[2]}, created={order[3]}")
    else:
        print("  ❌ Processing status'dagi buyurtmalar topilmadi!")
        
        # Check if there are any orders with similar status
        cursor.execute("SELECT DISTINCT status FROM orders")
        all_statuses = cursor.fetchall()
        print(f"  📋 Database'dagi barcha statuslar: {[s[0] for s in all_statuses]}")
    
    conn.close()
    print("\n✅ Tekshiruv yakunlandi!")
    
except sqlite3.Error as e:
    print(f"❌ Database xatosi: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Xatolik: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
