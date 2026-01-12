# Database va Login Muammosini Tekshirish

Server'da quyidagi buyruqlarni bajaring:

## 1. Database faylini tekshirish

```bash
cd /opt/savdo-programmasi/backend
ls -lh inventory.db
```

Agar database fayli yo'q bo'lsa, yangi database yaratish kerak.

## 2. Database mavjudligini va seller ma'lumotlarini tekshirish

```bash
cd /opt/savdo-programmasi/backend
source ../venv/bin/activate
python3 -c "
from database import SessionLocal
from models import Seller
db = SessionLocal()
sellers = db.query(Seller).all()
print(f'Sellers count: {len(sellers)}')
for s in sellers:
    print(f'ID: {s.id}, Name: {s.name}, Username: {s.username}, Active: {s.is_active}, Has Password: {bool(s.password_hash)}')
db.close()
"
```

## 3. Agar database yo'q bo'lsa yoki seller yo'q bo'lsa

### Variant A: Database mavjud, lekin seller yo'q

```bash
cd /opt/savdo-programmasi/backend
source ../venv/bin/activate
python3 create_admin.py
```

### Variant B: Database yo'q - yangi database yaratish

```bash
cd /opt/savdo-programmasi/backend
source ../venv/bin/activate
python3 -c "
from database import init_db
init_db()
print('Database yaratildi!')
"
```

Keyin admin yaratish:

```bash
python3 create_admin.py
```

## 4. Admin yaratish (agar create_admin.py mavjud bo'lsa)

```bash
cd /opt/savdo-programmasi/backend
source ../venv/bin/activate
python3 create_admin.py
```

Yoki interaktiv:

```bash
python3 -c "
from database import SessionLocal
from models import Seller, Role
from services.auth_service import AuthService
db = SessionLocal()
# Super Admin rolni topish
admin_role = db.query(Role).filter(Role.name == 'Super Admin').first()
if admin_role:
    # Yangi admin yaratish
    admin = Seller(
        name='Admin',
        username='admin',
        email='admin@example.com',
        phone='+998901234567',
        is_active=True,
        role_id=admin_role.id
    )
    admin.password_hash = AuthService.hash_password('admin123')
    db.add(admin)
    db.commit()
    print(f'Admin yaratildi! Username: admin, Password: admin123')
else:
    print('Super Admin roli topilmadi. Avval init_db() ni chaqiring.')
db.close()
"
```

## 5. Backend'ni qayta ishga tushirish

```bash
systemctl restart fastapi
systemctl status fastapi
```

## 6. Log'larni tekshirish

```bash
journalctl -u fastapi -n 50 --no-pager
```
