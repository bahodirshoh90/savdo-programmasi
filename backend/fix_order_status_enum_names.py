#!/usr/bin/env python3
"""
Fix Order.status values in SQLite to match SQLAlchemy Enum names.

Currently some rows store lowercase values like "pending", "processing",
but SQLAlchemy Enum(OrderStatus) expects the *names*:
  PENDING, PROCESSING, COMPLETED, CANCELLED, RETURNED

This script converts:
  pending   -> PENDING
  processing -> PROCESSING
  completed -> COMPLETED
  cancelled -> CANCELLED
  returned  -> RETURNED
"""

import sqlite3
import sys
from pathlib import Path


DB_PATH = Path(__file__).parent / "inventory.db"


def main() -> int:
    if not DB_PATH.exists():
        print(f"❌ Database fayl topilmadi: {DB_PATH}")
        return 1

    print(f"📁 Database fayl: {DB_PATH}")
    print("=" * 60)

    # lowercase value -> UPPERCASE enum name
    STATUS_MAPPING = {
        "pending": "PENDING",
        "processing": "PROCESSING",
        "completed": "COMPLETED",
        "cancelled": "CANCELLED",
        "returned": "RETURNED",
    }

    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()

        # Show distinct current statuses
        print("\n📊 Hozirgi statuslar:")
        cursor.execute("SELECT DISTINCT status FROM orders")
        current_statuses = [row[0] for row in cursor.fetchall()]
        print(f"  Topilgan statuslar: {current_statuses}")

        # Counts before
        print("\n📦 Migration oldidan buyurtmalar:")
        cursor.execute("SELECT status, COUNT(*) FROM orders GROUP BY status")
        for status, count in cursor.fetchall():
            print(f"  {status}: {count}")

        print("\n🔄 Statuslarni ENUM nomlariga moslab yangilash...")
        updated_count = 0

        for old_value, new_value in STATUS_MAPPING.items():
            cursor.execute("SELECT COUNT(*) FROM orders WHERE status = ?", (old_value,))
            count = cursor.fetchone()[0]
            if count > 0:
                cursor.execute(
                    "UPDATE orders SET status = ? WHERE status = ?",
                    (new_value, old_value),
                )
                print(f"  ✅ {old_value} -> {new_value}: {count} ta buyurtma yangilandi")
                updated_count += count

        conn.commit()

        # After
        print("\n📊 Migration keyin buyurtmalar:")
        cursor.execute("SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY status")
        for status, count in cursor.fetchall():
            print(f"  {status}: {count}")

        # Check for any lowercase / non-enum status values
        cursor.execute("SELECT DISTINCT status FROM orders")
        final_statuses = [row[0] for row in cursor.fetchall()]
        bad = [
            s for s in final_statuses
            if s not in {"PENDING", "PROCESSING", "COMPLETED", "CANCELLED", "RETURNED"}
        ]

        if bad:
            print(f"\n⚠️  ENUMdan tashqaridagi statuslar qolgan: {bad}")
        else:
            print("\n✅ Barcha Order.status qiymatlari ENUM nomlariga moslashdi.")

        print(f"\n✅ Jami {updated_count} ta buyurtma yangilandi.")

        conn.close()
        return 0

    except sqlite3.Error as e:
        print(f"❌ Database xatosi: {e}")
        try:
            conn.rollback()
        except Exception:
            pass
        return 1
    except Exception as e:
        print(f"❌ Xatolik: {e}")
        import traceback

        traceback.print_exc()
        try:
            conn.rollback()
        except Exception:
            pass
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

