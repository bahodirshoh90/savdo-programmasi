"""
Migration script to update product price columns
Run this script to migrate from old price structure to new price structure:
- Remove: wholesale_package_price, wholesale_piece_price, retail_package_price, retail_piece_price
- Add: wholesale_price, retail_price, regular_price
"""
import sqlite3
import os
from pathlib import Path

def get_db_path():
    """Get the database path"""
    # Database path from database.py
    from pathlib import Path
    db_path = Path(__file__).parent / "inventory.db"
    
    if not db_path.exists():
        raise FileNotFoundError(f"Database fayl topilmadi: {db_path}\nIltimos, backend papkasida database faylini tekshiring.")
    
    return str(db_path)

def migrate_prices():
    """Migrate product price columns"""
    db_path = get_db_path()
    
    print(f"Database: {db_path}")
    
    # Backup database first
    backup_path = db_path + ".backup"
    if os.path.exists(backup_path):
        print(f"Backup allaqachon mavjud: {backup_path}")
    else:
        print(f"Backup yaratilmoqda: {backup_path}")
        import shutil
        shutil.copy2(db_path, backup_path)
        print("Backup yaratildi!")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if new columns already exist
        cursor.execute("PRAGMA table_info(products)")
        columns = [row[1] for row in cursor.fetchall()]
        
        has_wholesale_price = 'wholesale_price' in columns
        has_retail_price = 'retail_price' in columns
        has_regular_price = 'regular_price' in columns
        
        has_wholesale_package = 'wholesale_package_price' in columns
        has_wholesale_piece = 'wholesale_piece_price' in columns
        has_retail_package = 'retail_package_price' in columns
        has_retail_piece = 'retail_piece_price' in columns
        
        print(f"\nJadval holati:")
        print(f"  Yangi ustunlar: wholesale_price={has_wholesale_price}, retail_price={has_retail_price}, regular_price={has_regular_price}")
        print(f"  Eski ustunlar: wholesale_package_price={has_wholesale_package}, wholesale_piece_price={has_wholesale_piece}, retail_package_price={has_retail_package}, retail_piece_price={has_retail_piece}")
        
        # Add new columns if they don't exist
        if not has_wholesale_price:
            print("\nwholesale_price ustuni qo'shilmoqda...")
            cursor.execute("ALTER TABLE products ADD COLUMN wholesale_price REAL NOT NULL DEFAULT 0.0")
        
        if not has_retail_price:
            print("retail_price ustuni qo'shilmoqda...")
            cursor.execute("ALTER TABLE products ADD COLUMN retail_price REAL NOT NULL DEFAULT 0.0")
        
        if not has_regular_price:
            print("regular_price ustuni qo'shilmoqda...")
            cursor.execute("ALTER TABLE products ADD COLUMN regular_price REAL NOT NULL DEFAULT 0.0")
        
        # Migrate data from old columns to new columns
        if has_wholesale_piece or has_retail_piece:
            print("\nMa'lumotlar ko'chirilmoqda...")
            # Migrate wholesale_price from wholesale_piece_price
            if has_wholesale_piece and not has_wholesale_price:
                cursor.execute("""
                    UPDATE products 
                    SET wholesale_price = COALESCE(wholesale_piece_price, 0.0)
                    WHERE wholesale_price = 0.0
                """)
            
            # Migrate retail_price from retail_piece_price
            if has_retail_piece and not has_retail_price:
                cursor.execute("""
                    UPDATE products 
                    SET retail_price = COALESCE(retail_piece_price, 0.0)
                    WHERE retail_price = 0.0
                """)
            
            # Set regular_price to same as retail_price if not set
            cursor.execute("""
                UPDATE products 
                SET regular_price = COALESCE(retail_price, 0.0)
                WHERE regular_price = 0.0
            """)
            
            print(f"Migratsiya qilingan qatorlar: {cursor.rowcount}")
        
        conn.commit()
        print("\n✓ Migration muvaffaqiyatli yakunlandi!")
        
        # Ask if user wants to remove old columns
        # Note: SQLite doesn't support DROP COLUMN directly, so we need to recreate table
        if has_wholesale_package or has_wholesale_piece or has_retail_package or has_retail_piece:
            print("\n⚠ Eslatma: SQLite eski ustunlarni to'g'ridan-to'g'ri o'chirishni qo'llab-quvvatlamaydi.")
            print("Eski ustunlarni olib tashlash uchun jadvalni qayta yaratish kerak.")
            remove_old = input("Eski ustunlarni olib tashlashni xohlaysizmi? (ha/yoq): ").strip().lower()
            
            if remove_old == 'ha':
                print("\nJadval qayta yaratilmoqda...")
                # Create new table structure
                cursor.execute("""
                    CREATE TABLE products_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name VARCHAR(200) NOT NULL,
                        barcode VARCHAR(100) UNIQUE,
                        brand VARCHAR(100),
                        supplier VARCHAR(200),
                        received_date DATETIME,
                        image_url VARCHAR(500),
                        location VARCHAR(200),
                        pieces_per_package INTEGER NOT NULL DEFAULT 1,
                        cost_price REAL NOT NULL DEFAULT 0.0,
                        wholesale_price REAL NOT NULL DEFAULT 0.0,
                        retail_price REAL NOT NULL DEFAULT 0.0,
                        regular_price REAL NOT NULL DEFAULT 0.0,
                        packages_in_stock INTEGER NOT NULL DEFAULT 0,
                        pieces_in_stock INTEGER NOT NULL DEFAULT 0,
                        created_at DATETIME,
                        updated_at DATETIME
                    )
                """)
                
                # Copy data from old table
                cursor.execute("""
                    INSERT INTO products_new (
                        id, name, barcode, brand, supplier, received_date, image_url, location,
                        pieces_per_package, cost_price,
                        wholesale_price, retail_price, regular_price,
                        packages_in_stock, pieces_in_stock, created_at, updated_at
                    )
                    SELECT 
                        id, name, barcode, brand, supplier, received_date, image_url, location,
                        pieces_per_package, cost_price,
                        COALESCE(wholesale_piece_price, wholesale_price, 0.0) as wholesale_price,
                        COALESCE(retail_piece_price, retail_price, 0.0) as retail_price,
                        COALESCE(regular_price, retail_piece_price, retail_price, 0.0) as regular_price,
                        packages_in_stock, pieces_in_stock, created_at, updated_at
                    FROM products
                """)
                
                # Drop old table and rename new one
                cursor.execute("DROP TABLE products")
                cursor.execute("ALTER TABLE products_new RENAME TO products")
                
                # Recreate indexes if needed
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_products_id ON products(id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_products_name ON products(name)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_products_barcode ON products(barcode)")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_products_brand ON products(brand)")
                
                conn.commit()
                print("✓ Eski ustunlar olib tashlandi!")
        
        print("\nMigration yakunlandi!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Xatolik: {e}")
        print("O'zgarishlar bekor qilindi.")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    try:
        migrate_prices()
    except KeyboardInterrupt:
        print("\n\nMigration bekor qilindi.")
    except Exception as e:
        print(f"\nXatolik: {e}")
        import traceback
        traceback.print_exc()

