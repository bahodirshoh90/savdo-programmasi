#!/bin/bash

# Database va Login Muammosini Tuzatish Script

echo "=========================================="
echo "Database va Login Muammosini Tekshirish"
echo "=========================================="
echo ""

cd /opt/savdo-programmasi/backend || exit 1
source ../venv/bin/activate || exit 1

# 1. Database faylini tekshirish
echo "1. Database faylini tekshirish..."
if [ -f "inventory.db" ]; then
    echo "✅ Database fayli mavjud: inventory.db"
    ls -lh inventory.db
else
    echo "❌ Database fayli topilmadi!"
    echo "   Yangi database yaratilmoqda..."
    python3 -c "
from database import init_db
init_db()
print('✅ Database yaratildi!')
"
fi

echo ""
echo "2. Database ichidagi seller ma'lumotlarini tekshirish..."
python3 << 'PYTHON_SCRIPT'
from database import SessionLocal
from models import Seller, Role
try:
    db = SessionLocal()
    sellers = db.query(Seller).all()
    print(f"   Sellerlar soni: {len(sellers)}")
    
    if len(sellers) == 0:
        print("   ⚠️  Hech qanday seller topilmadi!")
        print("   Admin yaratilmoqda...")
        
        # Super Admin rolni topish
        admin_role = db.query(Role).filter(Role.name == 'Super Admin').first()
        if admin_role:
            from services.auth_service import AuthService
            admin = Seller(
                name='Admin',
                username='admin',
                email='admin@savdo.uz',
                phone='+998901234567',
                is_active=True,
                role_id=admin_role.id
            )
            admin.password_hash = AuthService.hash_password('admin123')
            db.add(admin)
            db.commit()
            print("   ✅ Admin yaratildi!")
            print("   Username: admin")
            print("   Password: admin123")
        else:
            print("   ❌ Super Admin roli topilmadi!")
            print("   Database'ni qayta yaratish kerak...")
            from database import init_db
            init_db()
            print("   ✅ Database qayta yaratildi!")
    else:
        print("   Sellerlar ro'yxati:")
        for s in sellers:
            has_password = "Ha" if s.password_hash else "Yo'q"
            role_name = s.role.name if s.role else "Rol yo'q"
            print(f"   - ID: {s.id}, Name: {s.name}, Username: {s.username}, Active: {s.is_active}, Password: {has_password}, Role: {role_name}")
    
    db.close()
except Exception as e:
    print(f"   ❌ Xatolik: {e}")
    import traceback
    traceback.print_exc()
PYTHON_SCRIPT

echo ""
echo "3. Backend'ni qayta ishga tushirish..."
systemctl restart fastapi
sleep 2
systemctl status fastapi --no-pager -l

echo ""
echo "=========================================="
echo "Tekshirish yakunlandi!"
echo "=========================================="
echo ""
echo "Agar muammo davom etsa, log'larni tekshiring:"
echo "journalctl -u fastapi -n 50 --no-pager"
echo ""
