#!/bin/bash

# Barcha mumkin bo'lgan joylardan backup qidirish

echo "=========================================="
echo "Backup Fayllarini Qidirish"
echo "=========================================="
echo ""

# Qidiriladigan joylar
search_paths=(
    "/opt/savdo-programmasi"
    "/root"
    "/home"
    "/tmp"
    "/var/backups"
    "/var/lib"
)

echo "Qidirilmoqda..."
echo ""

found_backups=()

for search_path in "${search_paths[@]}"; do
    if [ -d "$search_path" ]; then
        echo "Tekshirilmoqda: $search_path"
        
        # inventory.db va backup variantlarini qidirish
        while IFS= read -r -d '' file; do
            size=$(du -h "$file" | cut -f1)
            mtime=$(stat -c "%y" "$file" | cut -d' ' -f1,2 | cut -d'.' -f1)
            found_backups+=("$file")
            echo "  ✅ Topildi: $file"
            echo "     Hajm: $size, Sana: $mtime"
        done < <(find "$search_path" -type f \( -name "inventory.db*" -o -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" \) -print0 2>/dev/null)
    fi
done

echo ""
echo "=========================================="

if [ ${#found_backups[@]} -eq 0 ]; then
    echo "❌ Hech qanday backup fayli topilmadi!"
    echo ""
    echo "⚠️  Ma'lumotlar yo'qolgan bo'lishi mumkin."
    echo "   Agar sizda boshqa joyda backup bo'lsa, uni quyidagi joyga ko'chiring:"
    echo "   /opt/savdo-programmasi/backend/inventory.db"
    echo ""
    echo "Yoki ma'lumotlarni qayta kiritish kerak bo'ladi."
else
    echo "✅ ${#found_backups[@]} ta fayl topildi!"
    echo ""
    echo "Quyidagi fayllardan birini restore qilish uchun:"
    echo "  cp <fayl_nomi> /opt/savdo-programmasi/backend/inventory.db"
    echo ""
    echo "Yoki restore_database.sh scriptini ishlatishingiz mumkin."
fi

echo "=========================================="
