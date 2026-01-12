#!/bin/bash

# Database'ni backup qilish script

echo "=========================================="
echo "Database Backup Script"
echo "=========================================="
echo ""

cd /opt/savdo-programmasi/backend || exit 1

DB_PATH="inventory.db"
BACKUP_DIR="/opt/savdo-programmasi/backend"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database fayli topilmadi: $DB_PATH"
    exit 1
fi

# Backup fayl nomi
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${DB_PATH}.backup_${TIMESTAMP}"

# Eski backup'larni saqlash (faqat oxirgi 10 tasi)
echo "Eski backup'larni tozalash..."
backup_count=$(ls -1 ${DB_PATH}.backup_* 2>/dev/null | wc -l)
if [ $backup_count -gt 10 ]; then
    ls -1t ${DB_PATH}.backup_* 2>/dev/null | tail -n +11 | xargs rm -f
    echo "  Eski backup'lar o'chirildi (faqat oxirgi 10 tasi saqlandi)"
fi

# Backup qilish
echo ""
echo "Database backup qilinmoqda..."
cp "$DB_PATH" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    size=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup muvaffaqiyatli yaratildi!"
    echo "   Fayl: $BACKUP_FILE"
    echo "   Hajm: $size"
    
    # Fayl huquqlarini o'rnatish
    chmod 644 "$BACKUP_FILE"
    
    echo ""
    echo "=========================================="
    echo "Backup yakunlandi!"
    echo "=========================================="
else
    echo "❌ Backup yaratishda xatolik!"
    exit 1
fi
