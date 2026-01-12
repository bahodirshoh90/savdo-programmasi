#!/bin/bash

# Har kuni avtomatik backup sozlash scripti

echo "=========================================="
echo "Har Kuni Avtomatik Backup Sozlash"
echo "=========================================="
echo ""

cd /opt/savdo-programmasi || exit 1

# Backup scriptini executable qilish
chmod +x backup_database.sh

# Backup scriptini tekshirish
if [ ! -f "backup_database.sh" ]; then
    echo "❌ backup_database.sh fayli topilmadi!"
    exit 1
fi

echo "1. Backup scriptini tekshirish..."
if [ -x "backup_database.sh" ]; then
    echo "   ✅ backup_database.sh executable"
else
    echo "   ❌ backup_database.sh executable emas!"
    exit 1
fi

echo ""
echo "2. Mavjud cron job'larni tekshirish..."
EXISTING_CRON=$(crontab -l 2>/dev/null | grep "backup_database.sh")
if [ -n "$EXISTING_CRON" ]; then
    echo "   ⚠️  Mavjud cron job topildi:"
    echo "   $EXISTING_CRON"
    echo ""
    read -p "   Eski cron job'ni o'chirib, yangisini qo'shasizmi? (yes/no): " replace
    if [ "$replace" == "yes" ]; then
        # Eski cron job'ni o'chirish
        crontab -l 2>/dev/null | grep -v "backup_database.sh" | crontab -
        echo "   ✅ Eski cron job o'chirildi"
    else
        echo "   Operatsiya bekor qilindi."
        exit 0
    fi
fi

echo ""
echo "3. Yangi cron job qo'shish..."
echo "   Qaysi vaqtda backup qilish kerak?"
echo "   (Masalan: 2:00 kechasi - '2' yoki '02')"
read -p "   Soat (0-23, default: 2): " hour
read -p "   Daqiqa (0-59, default: 0): " minute

# Default qiymatlar
if [ -z "$hour" ]; then
    hour=2
fi
if [ -z "$minute" ]; then
    minute=0
fi

# Validatsiya
if ! [[ "$hour" =~ ^[0-9]+$ ]] || [ "$hour" -lt 0 ] || [ "$hour" -gt 23 ]; then
    echo "   ❌ Noto'g'ri soat! 0-23 orasida bo'lishi kerak."
    exit 1
fi

if ! [[ "$minute" =~ ^[0-9]+$ ]] || [ "$minute" -lt 0 ] || [ "$minute" -gt 59 ]; then
    echo "   ❌ Noto'g'ri daqiqa! 0-59 orasida bo'lishi kerak."
    exit 1
fi

# Cron job yaratish
CRON_JOB="$minute $hour * * * cd /opt/savdo-programmasi && ./backup_database.sh >> /var/log/db_backup.log 2>&1"

# Mavjud crontab'ni olish
crontab -l > /tmp/crontab_backup 2>/dev/null || touch /tmp/crontab_backup

# Yangi cron job qo'shish
echo "$CRON_JOB" >> /tmp/crontab_backup

# Crontab'ni yangilash
crontab /tmp/crontab_backup

# Tozalash
rm -f /tmp/crontab_backup

echo ""
echo "✅ Muntazam backup sozlandi!"
echo ""
echo "=========================================="
echo "Backup Sozlamalari:"
echo "=========================================="
echo "Vaqt: Har kuni $hour:$minute da"
echo "Fayl: /opt/savdo-programmasi/backend/inventory.db.backup_*"
echo "Log: /var/log/db_backup.log"
echo ""
echo "Mavjud cron job'lar:"
crontab -l | grep backup || echo "  (hech narsa topilmadi)"
echo ""
echo "=========================================="
echo "Test qilish:"
echo "=========================================="
echo "Backup'ni test qilish uchun:"
echo "  ./backup_database.sh"
echo ""
echo "Log'larni ko'rish:"
echo "  tail -f /var/log/db_backup.log"
echo ""
echo "Cron job'ni o'chirish:"
echo "  crontab -e"
echo "  (backup_database.sh qatorini o'chiring)"
echo ""
