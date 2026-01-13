#!/bin/bash
# Xavfsiz server yangilash skripti
# Database faylini himoya qiladi

set -e  # Xatolik bo'lsa to'xtatish

echo "=========================================="
echo "Xavfsiz Server Yangilash"
echo "=========================================="

cd /opt/savdo-programmasi

# 1. Database faylini backup qilish
if [ -f backend/inventory.db ]; then
    BACKUP_NAME="backend/inventory.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp backend/inventory.db "$BACKUP_NAME"
    echo "✅ Database backup yaratildi: $BACKUP_NAME"
else
    echo "⚠️  Database fayl topilmadi!"
fi

# 2. Git o'zgarishlarini tekshirish
echo ""
echo "Git o'zgarishlarini tekshirish..."
git status
git fetch origin

# 3. Database faylini Git'dan himoya qilish
echo ""
echo "Database faylini Git'dan himoya qilish..."
git restore --staged backend/inventory.db 2>/dev/null || true
git restore backend/inventory.db 2>/dev/null || true

# 4. Yangilash
echo ""
echo "Git'dan yangilash..."
git reset --hard origin/main

# 5. Database faylini qayta tiklash (agar o'chib ketgan bo'lsa)
if [ ! -f backend/inventory.db ]; then
    echo ""
    echo "⚠️  Database fayl o'chib ketgan! Backup'dan tiklanmoqda..."
    LATEST_BACKUP=$(ls -t backend/inventory.db.backup.* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        cp "$LATEST_BACKUP" backend/inventory.db
        echo "✅ Database backup'dan tiklandi: $LATEST_BACKUP"
    else
        echo "❌ Backup topilmadi! Database yaratilmoqda..."
        # Database yaratish
        source venv/bin/activate
        python3 backend/create_admin.py
    fi
else
    echo "✅ Database fayl saqlanib qoldi"
fi

# 6. Dependencies yangilash
echo ""
echo "Dependencies yangilash..."
source venv/bin/activate
pip install -r requirements.txt --quiet

# 7. Service'larni qayta ishga tushirish
echo ""
echo "Service'larni qayta ishga tushirish..."
systemctl restart fastapi
systemctl restart telegrambot
systemctl restart nginx

echo ""
echo "=========================================="
echo "✅ Yangilash muvaffaqiyatli yakunlandi!"
echo "=========================================="
echo ""
echo "Tekshirish:"
echo "  journalctl -u fastapi -n 20 --no-pager"
echo "  systemctl status fastapi"
