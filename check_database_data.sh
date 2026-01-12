#!/bin/bash

# Database ichidagi barcha ma'lumotlarni tekshirish

echo "=========================================="
echo "Database Ma'lumotlarini Tekshirish"
echo "=========================================="
echo ""

cd /opt/savdo-programmasi/backend || exit 1
source ../venv/bin/activate || exit 1

python3 << 'PYTHON_SCRIPT'
from database import SessionLocal
from models import (
    Seller, Product, Sale, SaleItem, Order, OrderItem,
    Customer, Role, Permission, Settings, DebtHistory
)
import os
from datetime import datetime

db = SessionLocal()

print("Database ichidagi jadvallar va ma'lumotlar soni:")
print("=" * 60)

tables = {
    "Sellers": Seller,
    "Products": Product,
    "Sales": Sale,
    "Sale Items": SaleItem,
    "Orders": Order,
    "Order Items": OrderItem,
    "Customers": Customer,
    "Roles": Role,
    "Permissions": Permission,
    "Settings": Settings,
    "Debt History": DebtHistory
}

total_records = 0
for table_name, model in tables.items():
    try:
        count = db.query(model).count()
        total_records += count
        status = "✅" if count > 0 else "❌"
        print(f"{status} {table_name:20} : {count:6} ta")
    except Exception as e:
        print(f"❌ {table_name:20} : Xatolik - {e}")

print("=" * 60)
print(f"Jami ma'lumotlar: {total_records} ta")
print("")

# Seller ma'lumotlarini batafsil ko'rsatish
print("Sellerlar ro'yxati:")
sellers = db.query(Seller).all()
if sellers:
    for s in sellers:
        role_name = s.role.name if s.role else "Rol yo'q"
        print(f"  - ID: {s.id}, Name: {s.name}, Username: {s.username}, Role: {role_name}, Active: {s.is_active}")
else:
    print("  Hech qanday seller topilmadi!")

print("")

# Oxirgi 5 ta sale'ni ko'rsatish
print("Oxirgi 5 ta sale:")
sales = db.query(Sale).order_by(Sale.created_at.desc()).limit(5).all()
if sales:
    for sale in sales:
        print(f"  - ID: {sale.id}, Date: {sale.created_at}, Total: {sale.total_amount}")
else:
    print("  Hech qanday sale topilmadi!")

print("")

# Oxirgi 5 ta product'ni ko'rsatish
print("Oxirgi 5 ta product:")
products = db.query(Product).order_by(Product.created_at.desc()).limit(5).all()
if products:
    for p in products:
        print(f"  - ID: {p.id}, Name: {sale.name if 'sale' in locals() else p.name}, Stock: {p.total_pieces}")
else:
    print("  Hech qanday product topilmadi!")

print("")

# Database fayl hajmi
db_path = "/opt/savdo-programmasi/backend/inventory.db"
if os.path.exists(db_path):
    size = os.path.getsize(db_path)
    size_mb = size / (1024 * 1024)
    print(f"Database fayl hajmi: {size_mb:.2f} MB ({size:,} bytes)")
    
    # Backup fayllarini tekshirish
    backup_files = []
    for i in range(10):
        backup_path = f"{db_path}.backup{i}"
        if os.path.exists(backup_path):
            backup_size = os.path.getsize(backup_path)
            backup_mtime = datetime.fromtimestamp(os.path.getmtime(backup_path))
            backup_files.append((backup_path, backup_size, backup_mtime))
    
    if backup_files:
        print(f"\nTopilgan backup fayllar ({len(backup_files)} ta):")
        for backup_path, backup_size, backup_mtime in backup_files:
            backup_size_mb = backup_size / (1024 * 1024)
            print(f"  - {backup_path}")
            print(f"    Hajm: {backup_size_mb:.2f} MB, Sana: {backup_mtime}")
    else:
        print("\n⚠️  Backup fayllari topilmadi!")

db.close()
PYTHON_SCRIPT

echo ""
echo "=========================================="
echo "Tekshirish yakunlandi!"
echo "=========================================="
