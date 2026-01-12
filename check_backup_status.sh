#!/bin/bash

# Backup holatini tekshirish scripti

echo "=========================================="
echo "Backup Holatini Tekshirish"
echo "=========================================="
echo ""

cd /opt/savdo-programmasi/backend || exit 1

echo "1. Cron job holati:"
echo ""
CRON_JOBS=$(crontab -l 2>/dev/null | grep "backup_database.sh")
if [ -n "$CRON_JOBS" ]; then
    echo "   ✅ Mavjud cron job'lar:"
    echo "$CRON_JOBS" | while read line; do
        echo "      $line"
    done
else
    echo "   ❌ Hech qanday cron job topilmadi!"
    echo "      Quyidagi buyruqni bajaring:"
    echo "      cd /opt/savdo-programmasi"
    echo "      ./setup_daily_backup.sh"
fi

echo ""
echo "2. Backup fayllari:"
echo ""
BACKUP_COUNT=$(ls -1 inventory.db.backup_* 2>/dev/null | wc -l)
if [ $BACKUP_COUNT -gt 0 ]; then
    echo "   ✅ $BACKUP_COUNT ta backup fayl topildi:"
    echo ""
    ls -lh inventory.db.backup_* 2>/dev/null | tail -5 | while read line; do
        echo "      $line"
    done
    if [ $BACKUP_COUNT -gt 5 ]; then
        echo "      ... va yana $((BACKUP_COUNT - 5)) ta fayl"
    fi
    
    # Eng so'nggi backup
    LATEST_BACKUP=$(ls -t inventory.db.backup_* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        LATEST_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
        LATEST_DATE=$(stat -c "%y" "$LATEST_BACKUP" | cut -d' ' -f1,2 | cut -d'.' -f1)
        echo ""
        echo "   Eng so'nggi backup:"
        echo "      Fayl: $LATEST_BACKUP"
        echo "      Hajm: $LATEST_SIZE"
        echo "      Sana: $LATEST_DATE"
    fi
else
    echo "   ⚠️  Hech qanday backup fayli topilmadi!"
    echo "      Backup qilish uchun:"
    echo "      cd /opt/savdo-programmasi"
    echo "      ./backup_database.sh"
fi

echo ""
echo "3. Backup log fayli:"
echo ""
if [ -f "/var/log/db_backup.log" ]; then
    LOG_SIZE=$(du -h /var/log/db_backup.log | cut -f1)
    LOG_LINES=$(wc -l < /var/log/db_backup.log)
    echo "   ✅ Log fayli mavjud:"
    echo "      Fayl: /var/log/db_backup.log"
    echo "      Hajm: $LOG_SIZE"
    echo "      Qatorlar: $LOG_LINES"
    echo ""
    echo "   Oxirgi 5 ta log yozuvi:"
    tail -5 /var/log/db_backup.log | while read line; do
        echo "      $line"
    done
else
    echo "   ⚠️  Log fayli topilmadi!"
    echo "      Backup hali ishlamagan yoki xatolik bo'lgan."
fi

echo ""
echo "4. Database fayl holati:"
echo ""
if [ -f "inventory.db" ]; then
    DB_SIZE=$(du -h inventory.db | cut -f1)
    DB_DATE=$(stat -c "%y" inventory.db | cut -d' ' -f1,2 | cut -d'.' -f1)
    echo "   ✅ Database fayli mavjud:"
    echo "      Hajm: $DB_SIZE"
    echo "      O'zgartirilgan: $DB_DATE"
else
    echo "   ❌ Database fayli topilmadi!"
fi

echo ""
echo "=========================================="
echo "Tekshirish yakunlandi!"
echo "=========================================="
