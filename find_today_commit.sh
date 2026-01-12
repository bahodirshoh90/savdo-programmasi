#!/bin/bash

# Bugungi sana (12.01.2026) dagi commit'larni topish

echo "=========================================="
echo "Bugungi Sana (12.01.2026) Dag'i Commit'larni Topish"
echo "=========================================="
echo ""

cd /opt/savdo-programmasi || exit 1

# Bugungi sana
TODAY="2026-01-12"

echo "Bugungi sana: $TODAY"
echo ""
echo "Database fayli bor commit'lar (sana bo'yicha):"
echo ""

# Barcha commit'larni sana bo'yicha tekshirish
git log --all --format="%H|%ci|%s" --since="2026-01-12 00:00:00" --until="2026-01-13 00:00:00" | while IFS='|' read -r hash date message; do
    # Bu commit'da database fayli bor-yo'qligini tekshirish
    if git cat-file -e "$hash:backend/inventory.db" 2>/dev/null; then
        echo "  ✅ Topildi: $hash"
        echo "     Sana: $date"
        echo "     Xabar: $message"
        echo ""
    fi
done

echo ""
echo "Yoki barcha commit'larni sana bo'yicha ko'rsatish:"
echo ""

# Barcha commit'larni ko'rsatish
commits=(
    "3b0dbd440acfda164e93df480daf1447aa867ebb"
    "b60cae32af4f59be16bc2025e936489917841453"
    "5b5155533dceb57ab7dc414552a55c17705707b9"
    "dc35c15457c6e201c6eaceb13f05303ab4a620b8"
    "060c52ac5f767830ac7b23398eef6ded08fdc3bb"
)

for commit in "${commits[@]}"; do
    date=$(git log -1 --format="%ci" $commit 2>/dev/null | cut -d' ' -f1)
    full_date=$(git log -1 --format="%ci" $commit 2>/dev/null)
    message=$(git log -1 --format="%s" $commit 2>/dev/null | cut -c1-60)
    
    if [ "$date" == "$TODAY" ]; then
        echo "  ✅ Bugungi sana: $commit"
        echo "     To'liq sana: $full_date"
        echo "     Xabar: $message"
        echo ""
    else
        echo "  ❌ Boshqa sana ($date): $commit"
        echo "     Xabar: $message"
        echo ""
    fi
done

echo "=========================================="
