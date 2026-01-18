# Server Login Xatolikni Tuzatish

## Muammo
Server'da `git pull` qilgandan keyin login ishlamayapti.

## Muammoni Aniqlash

### 1. Backend xatoliklarini ko'rish

```bash
# SSH orqali server'ga ulanish
ssh root@161.97.184.217

# FastAPI loglarini ko'rish
journalctl -u fastapi -n 100 --no-pager

# Yoki real-time kuzatish
journalctl -u fastapi -f
```

### 2. Backend holatini tekshirish

```bash
# Backend servis holatini ko'rish
systemctl status fastapi

# Agar ishlamayotgan bo'lsa, qayta ishga tushirish
systemctl restart fastapi
```

### 3. Python xatoliklarini tekshirish

```bash
cd /opt/savdo-programmasi/backend

# Virtual environment'ni faollashtirish
source ../venv/bin/activate

# Backend'ni qo'lda ishga tushirish va xatolarni ko'rish
python main.py
```

## Muammoni Tuzatish

### Variant 1: Database migration muammosi

Agar `username` maydoni database'da mavjud bo'lmasa:

```bash
cd /opt/savdo-programmasi/backend

# SQLite database'ni ochish
sqlite3 inventory.db

# username va password_hash maydonlarini tekshirish
.schema customers

# Agar maydonlar yo'q bo'lsa, qo'shish:
ALTER TABLE customers ADD COLUMN username VARCHAR(100) UNIQUE;
ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255);

# Database'dan chiqish
.quit
```

### Variant 2: Backend kod muammosi

Agar schema'da muammo bo'lsa, `schemas.py` ni tekshirish:

```bash
cd /opt/savdo-programmasi/backend

# schemas.py ni ko'rish
cat schemas.py | grep -A 20 "class CustomerBase"

# Agar username dublikat bo'lsa, tuzatish kerak
```

### Variant 3: Previous commit'ga qaytish

Agar hech narsa ishlamasa, previous commit'ga qaytish:

```bash
cd /opt/savdo-programmasi

# So'nggi commit'larni ko'rish
git log --oneline -10

# Previous commit'ga qaytish (masalan, aaaa777 dan oldingisiga)
git reset --hard HEAD~1

# Yoki ma'lum commit'ga qaytish
git reset --hard <commit-hash>

# Servisni qayta ishga tushirish
systemctl restart fastapi
```

### Variant 4: To'liq restore

```bash
# 1. Database backup'dan restore qilish
cd /opt/savdo-programmasi
cp backups/inventory_YYYYMMDD_HHMMSS.db backend/inventory.db

# 2. Git'dan oldingi versiyaga qaytish
git reset --hard origin/main~1

# 3. Servislarni qayta ishga tushirish
systemctl restart fastapi
systemctl restart nginx
```

## Tekshirish

```bash
# Login'ni test qilish
curl -X POST https://uztoysavdo.uz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Backend holatini ko'rish
systemctl status fastapi
```

## Yordam

Agar muammo hal bo'lmasa, quyidagi ma'lumotlarni yuboring:

1. `journalctl -u fastapi -n 100 --no-pager` output'i
2. `systemctl status fastapi` output'i
3. `git log --oneline -5` output'i
