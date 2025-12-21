"""
Fix debt_history table - remove records with NULL customer_id
"""
import sqlite3
import os
from pathlib import Path

def fix_debt_history():
    """Fix debt_history table by removing records with NULL customer_id"""
    # Find database file
    backend_dir = Path(__file__).parent
    db_path = backend_dir / "inventory.db"
    
    if not db_path.exists():
        print(f"❌ Database file not found: {db_path}")
        return
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Check for NULL customer_id records
        cursor.execute("SELECT COUNT(*) FROM debt_history WHERE customer_id IS NULL")
        null_count = cursor.fetchone()[0]
        
        if null_count > 0:
            print(f"⚠️ Found {null_count} debt_history records with NULL customer_id")
            print("Deleting these records...")
            
            cursor.execute("DELETE FROM debt_history WHERE customer_id IS NULL")
            conn.commit()
            print(f"✅ Deleted {null_count} invalid records")
        else:
            print("✅ No NULL customer_id records found")
        
        # Verify all customer_id values are valid
        cursor.execute("""
            SELECT COUNT(*) FROM debt_history 
            WHERE customer_id NOT IN (SELECT id FROM customers)
        """)
        invalid_count = cursor.fetchone()[0]
        
        if invalid_count > 0:
            print(f"⚠️ Found {invalid_count} debt_history records with invalid customer_id")
            print("Deleting these records...")
            
            cursor.execute("""
                DELETE FROM debt_history 
                WHERE customer_id NOT IN (SELECT id FROM customers)
            """)
            conn.commit()
            print(f"✅ Deleted {invalid_count} invalid records")
        else:
            print("✅ All customer_id values are valid")
        
        # Final check
        cursor.execute("SELECT COUNT(*) FROM debt_history")
        total_count = cursor.fetchone()[0]
        print(f"\n✅ Total debt_history records: {total_count}")
        print("✅ Database fix completed successfully!")
        
    except sqlite3.Error as e:
        print(f"❌ Error fixing database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_debt_history()

