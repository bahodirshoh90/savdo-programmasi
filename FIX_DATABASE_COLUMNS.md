# Database'da username va password_hash maydonlarini qo'shish

## Muammo
Server'da `customers` jadvalida `username` va `password_hash` maydonlari yo'q. Bu sabab login xatosi yuz bermoqda.

## Yechim

### Variant 1: Python orqali (tavsiya etiladi)

```bash
# Server'ga SSH orqali ulanish
ssh root@161.97.184.217

# Loyiha papkasiga o'tish
cd /opt/savdo-programmasi/backend

# Virtual environment'ni faollashtirish
source ../venv/bin/activate

# Python orqali database'ga ulanish va maydonlarni qo'shish
python3 -c "
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'inventory.db')
if not os.path.exists(db_path):
    db_path = 'inventory.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Maydonlar mavjudligini tekshirish
cursor.execute('PRAGMA table_info(customers)')
columns = [col[1] for col in cursor.fetchall()]

# username maydonini qo'shish
if 'username' not in columns:
    print('Adding username column...')
    cursor.execute('ALTER TABLE customers ADD COLUMN username VARCHAR(100)')
    cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_username ON customers(username)')
    print('✅ username column added')
else:
    print('✅ username column already exists')

# password_hash maydonini qo'shish
if 'password_hash' not in columns:
    print('Adding password_hash column...')
    cursor.execute('ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255)')
    print('✅ password_hash column added')
else:
    print('✅ password_hash column already exists')

conn.commit()
conn.close()
print('✅ Migration completed!')
"

# Servisni qayta ishga tushirish
systemctl restart fastapi
```

### Variant 2: SQLite3 CLI orqali (agar sqlite3 o'rnatilgan bo'lsa)

```bash
# sqlite3 o'rnatish (agar yo'q bo'lsa)
apt install sqlite3 -y

# Database'ga ulanish
cd /opt/savdo-programmasi/backend
sqlite3 inventory.db

# SQL buyruqlari:
ALTER TABLE customers ADD COLUMN username VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_username ON customers(username);
ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255);
.quit

# Servisni qayta ishga tushirish
systemctl restart fastapi
```

### Variant 3: Python script yaratish

```bash
# Fix script yaratish
cat > /opt/savdo-programmasi/backend/fix_customers.py << 'EOF'
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'inventory.db')
if not os.path.exists(db_path):
    db_path = 'inventory.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute('PRAGMA table_info(customers)')
columns = [col[1] for col in cursor.fetchall()]

if 'username' not in columns:
    print('Adding username column...')
    cursor.execute('ALTER TABLE customers ADD COLUMN username VARCHAR(100)')
    cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_username ON customers(username)')
    print('✅ username added')
else:
    print('✅ username already exists')

if 'password_hash' not in columns:
    print('Adding password_hash column...')
    cursor.execute('ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255)')
    print('✅ password_hash added')
else:
    print('✅ password_hash already exists')

conn.commit()
conn.close()
print('✅ Done!')
EOF

# Scriptni ishga tushirish
python3 /opt/savdo-programmasi/backend/fix_customers.py

# Servisni qayta ishga tushirish
systemctl restart fastapi
```

## Tekshirish

```bash
# Python orqali tekshirish
python3 -c "
import sqlite3
conn = sqlite3.connect('/opt/savdo-programmasi/backend/inventory.db')
cursor = conn.cursor()
cursor.execute('PRAGMA table_info(customers)')
for col in cursor.fetchall():
    print(f'{col[1]} - {col[2]}')
conn.close()
"

# Yoki FastAPI loglarini ko'rish
journalctl -u fastapi -n 50 --no-pager
```

## Qo'shimcha ma'lumot

Agar muammo davom etsa:
1. `fix_customer_columns.py` scriptini ishga tushiring (GitHub'dan pull qiling)
2. `migrate_db.py` ni yangi versiyasini pull qiling va ishga tushiring
3. Database fayl huquqlarini tekshiring: `ls -la backend/inventory.db`
