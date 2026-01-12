#!/bin/bash

# Muntazam backup qilish uchun cron job sozlash

echo "=========================================="
echo "Muntazam Backup Sozlash"
echo "=========================================="
echo ""

cd /opt/savdo-programmasi || exit 1

# Backup scriptini executable qilish
chmod +x backup_database.sh

# Cron job qo'shish
CRON_JOB="0 2 * * * cd /opt/savdo-programmasi && ./backup_database.sh >> /var/log/db_backup.log 2>&1"

# Mavjud crontab'ni olish
crontab -l > /tmp/crontab_backup 2>/dev/null || touch /tmp/crontab_backup

# Agar allaqachon qo'shilgan bo'lsa, o'chirish
grep -v "backup_database.sh" /tmp/crontab_backup > /tmp/crontab_new || touch /tmp/crontab_new

# Yangi cron job qo'shish
echo "$CRON_JOB" >> /tmp/crontab_new

# Crontab'ni yangilash
crontab /tmp/crontab_new

# Tozalash
rm -f /tmp/crontab_backup /tmp/crontab_new

echo "✅ Muntazam backup sozlandi!"
echo ""
echo "Har kuni kechasi 2:00 da avtomatik backup qilinadi."
echo "Backup fayllar: /opt/savdo-programmasi/backend/inventory.db.backup_*"
echo ""
echo "Mavjud cron job'lar:"
crontab -l | grep backup || echo "  (hech narsa topilmadi)"

echo ""
echo "=========================================="
