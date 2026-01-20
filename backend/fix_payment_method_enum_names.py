#!/usr/bin/env python3
"""
Fix Order.payment_method values in SQLite to match SQLAlchemy Enum names.

Currently rows may store lowercase values like "cash", "card", "debt", "bank_transfer",
but SQLAlchemy Enum(PaymentMethod) expects the *names*:
  CASH, CARD, DEBT, BANK_TRANSFER

This script converts:
  cash          -> CASH
  card          -> CARD
  debt          -> DEBT
  bank_transfer -> BANK_TRANSFER
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
    PM_MAPPING = {
        "cash": "CASH",
        "card": "CARD",
        "debt": "DEBT",
        "bank_transfer": "BANK_TRANSFER",
    }

    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()

        # Show distinct current payment_method values
        print("\n📊 Hozirgi payment_method qiymatlari:")
        cursor.execute("SELECT DISTINCT payment_method FROM orders")
        current_pms = [row[0] for row in cursor.fetchall()]
        print(f"  Topilgan payment_method'lar: {current_pms}")

        # Counts before
        print("\n📦 Migration oldidan buyurtmalar (payment_method bo‘yicha):")
        cursor.execute(
            "SELECT payment_method, COUNT(*) FROM orders GROUP BY payment_method"
        )
        for pm, count in cursor.fetchall():
            print(f"  {pm}: {count}")

        print("\n🔄 payment_method qiymatlarini ENUM nomlariga moslab yangilash...")
        updated_count = 0

        for old_value, new_value in PM_MAPPING.items():
            cursor.execute(
                "SELECT COUNT(*) FROM orders WHERE payment_method = ?", (old_value,)
            )
            count = cursor.fetchone()[0]
            if count > 0:
                cursor.execute(
                    "UPDATE orders SET payment_method = ? WHERE payment_method = ?",
                    (new_value, old_value),
                )
                print(
                    f"  ✅ {old_value} -> {new_value}: {count} ta buyurtma yangilandi"
                )
                updated_count += count

        conn.commit()

        # After
        print("\n📊 Migration keyin payment_method bo‘yicha buyurtmalar:")
        cursor.execute(
            "SELECT payment_method, COUNT(*) FROM orders GROUP BY payment_method ORDER BY payment_method"
        )
        for pm, count in cursor.fetchall():
            print(f"  {pm}: {count}")

        # Check for any non-enum values
        cursor.execute("SELECT DISTINCT payment_method FROM orders")
        final_pms = [row[0] for row in cursor.fetchall()]
        bad = [
            p
            for p in final_pms
            if p not in {"CASH", "CARD", "DEBT", "BANK_TRANSFER", None}
        ]

        if bad:
            print(f"\n⚠️  ENUMdan tashqaridagi payment_method qiymatlari qolgan: {bad}")
        else:
            print(
                "\n✅ Barcha Order.payment_method qiymatlari ENUM nomlariga moslashdi."
            )

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

