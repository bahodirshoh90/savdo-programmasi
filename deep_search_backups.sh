#!/bin/bash

# Chuqur backup qidirish - barcha variantlarni tekshirish

echo "=========================================="
echo "Chuqur Backup Qidirish"
echo "=========================================="
echo ""

cd /opt/savdo-programmasi || exit 1

# Qidiriladigan pattern'lar
patterns=(
    "inventory.db*"
    "*.db"
    "*backup*"
    "*savdo*"
    "*database*"
    "*.sqlite"
    "*.sqlite3"
    "*.sql"
    "*.tar"
    "*.tar.gz"
    "*.gz"
    "*.zip"
)

# Qidiriladigan joylar (kengroq)
search_paths=(
    "/opt"
    "/root"
    "/home"
    "/tmp"
    "/var"
    "/usr/local"
    "/srv"
)

echo "1. Barcha joylardan database va backup fayllarini qidirish..."
echo ""

found_files=()

for search_path in "${search_paths[@]}"; do
    if [ -d "$search_path" ]; then
        for pattern in "${patterns[@]}"; do
            while IFS= read -r -d '' file; do
                # Faqat inventory.db yoki backup bilan bog'liq fayllarni olish
                if [[ "$file" == *"inventory"* ]] || [[ "$file" == *"backup"* ]] || [[ "$file" == *"savdo"* ]] || [[ "$file" == *"database"* ]]; then
                    # Tizim fayllarini o'tkazib yuborish
                    if [[ "$file" != *"command-not-found"* ]] && [[ "$file" != *"fwupd"* ]] && [[ "$file" != *"PackageKit"* ]] && [[ "$file" != *"systemd"* ]]; then
                        size=$(du -h "$file" 2>/dev/null | cut -f1)
                        mtime=$(stat -c "%y" "$file" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
                        found_files+=("$file")
                        echo "  ✅ Topildi: $file"
                        echo "     Hajm: $size, Sana: $mtime"
                    fi
                fi
            done < <(find "$search_path" -type f -iname "$pattern" -print0 2>/dev/null | head -z -n 100)
        done
    fi
done

echo ""
echo "2. Git tarixini tekshirish (ehtimol git stash yoki commit'larda backup bor)..."
echo ""

# Git stash'larni tekshirish
if [ -d ".git" ]; then
    stash_count=$(git stash list 2>/dev/null | wc -l)
    if [ $stash_count -gt 0 ]; then
        echo "  ✅ Git stash topildi: $stash_count ta"
        git stash list
    else
        echo "  ❌ Git stash topilmadi"
    fi
    
    # Oxirgi commit'larda database fayllarini qidirish
    echo ""
    echo "  Oxirgi 10 ta commit'da database fayllarini qidirish..."
    for commit in $(git log --oneline -10 --format="%H" 2>/dev/null); do
        db_files=$(git show $commit:backend/inventory.db 2>/dev/null)
        if [ $? -eq 0 ]; then
            echo "    ✅ Commit $commit da database fayli bor!"
            echo "       Restore qilish: git show $commit:backend/inventory.db > inventory.db.restore"
        fi
    done
fi

echo ""
echo "3. Boshqa mumkin bo'lgan joylar..."
echo ""

# Boshqa joylar
other_locations=(
    "/root/.local/share"
    "/root/backups"
    "/root/documents"
    "/opt/backups"
    "/var/backups/savdo"
    "/home/*/backups"
    "/home/*/Documents"
)

for location in "${other_locations[@]}"; do
    if [ -d "$location" ] || [ -f "$location" ]; then
        echo "  Tekshirilmoqda: $location"
        find "$location" -type f \( -name "*inventory*" -o -name "*savdo*" -o -name "*backup*" \) 2>/dev/null | while read file; do
            if [ -f "$file" ]; then
                size=$(du -h "$file" 2>/dev/null | cut -f1)
                mtime=$(stat -c "%y" "$file" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
                echo "    ✅ Topildi: $file ($size, $mtime)"
                found_files+=("$file")
            fi
        done
    fi
done

echo ""
echo "4. Database faylining yaratilgan vaqtini tekshirish..."
echo ""

if [ -f "backend/inventory.db" ]; then
    created=$(stat -c "%w" backend/inventory.db 2>/dev/null || stat -c "%y" backend/inventory.db 2>/dev/null)
    modified=$(stat -c "%y" backend/inventory.db 2>/dev/null)
    size=$(du -h backend/inventory.db | cut -f1)
    echo "  Joriy database:"
    echo "    Fayl: backend/inventory.db"
    echo "    Hajm: $size"
    echo "    Yaratilgan: $created"
    echo "    O'zgartirilgan: $modified"
fi

echo ""
echo "=========================================="

if [ ${#found_files[@]} -eq 0 ]; then
    echo "❌ Hech qanday backup fayli topilmadi!"
    echo ""
    echo "⚠️  Keling, boshqa usul bilan qidiramiz:"
    echo ""
    echo "5. Barcha .db fayllarini ro'yxatga olish (kattaligi bo'yicha):"
    echo ""
    find /opt /root /home /tmp -type f -name "*.db" -size +10k 2>/dev/null | while read file; do
        if [[ "$file" != *"command-not-found"* ]] && [[ "$file" != *"fwupd"* ]] && [[ "$file" != *"PackageKit"* ]]; then
            size=$(du -h "$file" 2>/dev/null | cut -f1)
            mtime=$(stat -c "%y" "$file" 2>/dev/null | cut -d' ' -f1)
            echo "  - $file ($size, $mtime)"
        fi
    done
else
    echo "✅ ${#found_files[@]} ta fayl topildi!"
    echo ""
    echo "Restore qilish uchun:"
    echo "  cp <fayl_nomi> /opt/savdo-programmasi/backend/inventory.db"
fi

echo ""
echo "=========================================="
