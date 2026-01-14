# Qo'lda Server Yangilash Ko'rsatmasi

Bu ko'rsatma server'ni qo'lda yangilash uchun qadama-baqadam yo'riqnoma.

## 1. Server'ga ulanish

```bash
ssh root@161.97.184.217
```

Agar parol so'rasa, parolni kiriting.

## 2. Loyiha papkasiga o'tish

```bash
cd /opt/savdo-programmasi
```

## 3. Database'ni backup qilish (muhim!)

```bash
# Backup papkasini yaratish
mkdir -p backups

# Database'ni backup qilish
cp inventory.db backups/inventory_$(date +%Y%m%d_%H%M%S).db

# Yoki eng so'nggi backup'ni ko'rish
ls -lt backups/ | head -5
```

## 4. Git holatini tekshirish

```bash
# Git holatini ko'rish
git status

# Agar o'zgarishlar bo'lsa, ularni ko'rish
git diff
```

## 5. Git'dan yangi o'zgarishlarni olish

```bash
# Remote repository'dan o'zgarishlarni olish
git fetch origin

# Eng so'nggi o'zgarishlarni ko'rish
git log origin/main --oneline -10

# Local repository'ni remote bilan bir xil qilish
git reset --hard origin/main
```

**Eslatma:** `git reset --hard` barcha local o'zgarishlarni o'chirib tashlaydi. Agar muhim o'zgarishlar bo'lsa, avval ularni saqlab qo'ying.

## 6. Virtual environment'ni faollashtirish

```bash
source venv/bin/activate
```

## 7. Python paketlarini yangilash

```bash
pip install -r requirements.txt
```

## 8. Servislarni qayta ishga tushirish

```bash
# FastAPI servisini qayta ishga tushirish
systemctl restart fastapi

# Telegram bot servisini qayta ishga tushirish
systemctl restart telegrambot

# Nginx servisini qayta ishga tushirish
systemctl restart nginx
```

## 9. Servislar holatini tekshirish

```bash
# FastAPI holatini tekshirish
systemctl status fastapi

# Telegram bot holatini tekshirish
systemctl status telegrambot

# Nginx holatini tekshirish
systemctl status nginx
```

## 10. Loglarni tekshirish

```bash
# FastAPI loglarini ko'rish
journalctl -u fastapi -f

# Yoki oxirgi 50 ta log
journalctl -u fastapi -n 50

# Telegram bot loglarini ko'rish
journalctl -u telegrambot -f
```

## 11. Database'ni tekshirish

```bash
# Database faylini tekshirish
ls -lh inventory.db

# Database'da mahsulotlar sonini tekshirish
sqlite3 inventory.db "SELECT COUNT(*) FROM products;"

# Database'da sotuvchilar sonini tekshirish
sqlite3 inventory.db "SELECT COUNT(*) FROM sellers;"
```

## Muammo bo'lsa

### Agar database yo'qolsa:

```bash
# Eng so'nggi backup'ni topish
ls -lt backups/ | head -1

# Backup'ni restore qilish (masalan, inventory_20260114_163000.db)
cp backups/inventory_20260114_163000.db inventory.db

# Database fayl huquqlarini to'g'rilash
chmod 644 inventory.db
chown root:root inventory.db
```

### Agar servis ishlamasa:

```bash
# FastAPI loglarini ko'rish
journalctl -u fastapi -n 100

# Xatolikni topish va tuzatish
# Masalan, agar port band bo'lsa:
netstat -tulpn | grep 8000

# Yoki agar virtual environment ishlamasa:
source venv/bin/activate
python --version
pip list
```

### Agar git pull ishlamasa:

```bash
# Git holatini to'liq ko'rish
git status
git log --oneline -10

# Remote repository'ni tekshirish
git remote -v

# Agar conflict bo'lsa:
git stash
git pull origin main
git stash pop
```

## To'liq yangilash jarayoni (qisqa versiya)

```bash
# 1. Server'ga ulanish
ssh root@161.97.184.217

# 2. Papkaga o'tish
cd /opt/savdo-programmasi

# 3. Database backup
mkdir -p backups
cp inventory.db backups/inventory_$(date +%Y%m%d_%H%M%S).db

# 4. Git yangilash
git fetch origin
git reset --hard origin/main

# 5. Virtual environment
source venv/bin/activate

# 6. Paketlar
pip install -r requirements.txt

# 7. Servislarni qayta ishga tushirish
systemctl restart fastapi
systemctl restart telegrambot
systemctl restart nginx

# 8. Holatni tekshirish
systemctl status fastapi
```

## Foydali buyruqlar

```bash
# Disk hajmini ko'rish
df -h

# Memory holatini ko'rish
free -h

# CPU holatini ko'rish
top

# Network holatini ko'rish
netstat -tulpn

# Process'larni ko'rish
ps aux | grep python

# Loglarni real-time kuzatish
journalctl -u fastapi -f
```

## Xavfsizlik

- Har doim database'ni backup qiling
- `git reset --hard` dan oldin local o'zgarishlarni tekshiring
- Servislarni qayta ishga tushirishdan oldin loglarni ko'rib chiqing
- Production server'da ehtiyotkor bo'ling
