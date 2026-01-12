#!/bin/bash

# Database'ni backup'dan restore qilish

echo "=========================================="
echo "Database Restore Script"
echo "=========================================="
echo ""

cd /opt/savdo-programmasi/backend || exit 1

DB_PATH="inventory.db"
BACKUP_DIR="/opt/savdo-programmasi/backend"

# Backup fayllarini topish
echo "Mavjud backup fayllar:"
echo ""

backup_files=()
for i in {0..9}; do
    backup_path="${DB_PATH}.backup${i}"
    if [ -f "$backup_path" ]; then
        size=$(du -h "$backup_path" | cut -f1)
        mtime=$(stat -c %y "$backup_path" | cut -d' ' -f1)
        backup_files+=("$backup_path")
        echo "  [$i] $backup_path - $size - $mtime"
    fi
done

if [ ${#backup_files[@]} -eq 0 ]; then
    echo "  ❌ Hech qanday backup fayli topilmadi!"
    echo ""
    echo "Boshqa joylardan backup qidirish..."
    
    # Boshqa mumkin bo'lgan joylar
    possible_locations=(
        "/opt/savdo-programmasi/backend/inventory.db.backup"
        "/opt/savdo-programmasi/backend/inventory.db.old"
        "/root/inventory.db.backup"
        "/root/inventory.db"
        "/tmp/inventory.db.backup"
    )
    
    for loc in "${possible_locations[@]}"; do
        if [ -f "$loc" ]; then
            size=$(du -h "$loc" | cut -f1)
            echo "  ✅ Topildi: $loc - $size"
            backup_files+=("$loc")
        fi
    done
fi

if [ ${#backup_files[@]} -eq 0 ]; then
    echo ""
    echo "❌ Hech qanday backup fayli topilmadi!"
    echo ""
    echo "⚠️  Eslatma: Agar ma'lumotlar yo'qolgan bo'lsa, ularni qayta tiklash mumkin emas."
    echo "   Kelajakda muntazam backup qilishni tavsiya qilamiz."
    exit 1
fi

echo ""
read -p "Qaysi backup'ni restore qilmoqchisiz? (0-9 yoki fayl nomi): " choice

if [[ "$choice" =~ ^[0-9]+$ ]]; then
    backup_file="${DB_PATH}.backup${choice}"
    if [ ! -f "$backup_file" ]; then
        echo "❌ Backup fayli topilmadi: $backup_file"
        exit 1
    fi
else
    backup_file="$choice"
    if [ ! -f "$backup_file" ]; then
        echo "❌ Backup fayli topilmadi: $backup_file"
        exit 1
    fi
fi

echo ""
echo "⚠️  EHTIYOT: Bu operatsiya joriy database'ni o'chirib, backup'dan restore qiladi!"
read -p "Davom etasizmi? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Operatsiya bekor qilindi."
    exit 0
fi

# Joriy database'ni backup qilish (xavfsizlik uchun)
current_backup="${DB_PATH}.before_restore_$(date +%Y%m%d_%H%M%S)"
if [ -f "$DB_PATH" ]; then
    echo ""
    echo "Joriy database'ni backup qilish: $current_backup"
    cp "$DB_PATH" "$current_backup"
fi

# Restore qilish
echo ""
echo "Restore qilinmoqda: $backup_file -> $DB_PATH"
cp "$backup_file" "$DB_PATH"

# Fayl huquqlarini o'rnatish
chmod 644 "$DB_PATH"

echo ""
echo "✅ Database restore qilindi!"
echo ""
echo "Backend'ni qayta ishga tushirish..."
systemctl restart fastapi
sleep 2
systemctl status fastapi --no-pager -l

echo ""
echo "=========================================="
echo "Restore yakunlandi!"
echo "=========================================="
