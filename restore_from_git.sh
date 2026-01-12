#!/bin/bash

# Git commit'laridan database restore qilish

echo "=========================================="
echo "Git Commit'laridan Database Restore"
echo "=========================================="
echo ""

cd /opt/savdo-programmasi || exit 1

# Eng so'nggi commit'larni ko'rsatish
echo "Mavjud commit'lar (eng so'nggisi birinchi):"
echo ""

commits=(
    "3b0dbd440acfda164e93df480daf1447aa867ebb"
    "b60cae32af4f59be16bc2025e936489917841453"
    "5b5155533dceb57ab7dc414552a55c17705707b9"
    "dc35c15457c6e201c6eaceb13f05303ab4a620b8"
    "060c52ac5f767830ac7b23398eef6ded08fdc3bb"
)

TODAY="2026-01-12"
today_commit=""
today_index=-1

for i in "${!commits[@]}"; do
    commit="${commits[$i]}"
    date=$(git log -1 --format="%ci" $commit 2>/dev/null)
    date_only=$(echo "$date" | cut -d' ' -f1)
    message=$(git log -1 --format="%s" $commit 2>/dev/null | cut -c1-60)
    
    if [ "$date_only" == "$TODAY" ]; then
        echo "  [$i] $commit ⭐ BUGUNGI SANA"
        today_commit="$commit"
        today_index=$i
    else
        echo "  [$i] $commit"
    fi
    echo "      Sana: $date"
    echo "      Xabar: $message"
    echo ""
done

if [ -n "$today_commit" ]; then
    echo "⭐ Bugungi sana (12.01.2026) dagi commit topildi: $today_commit"
    echo ""
    echo "Qaysi commit'dan restore qilmoqchisiz?"
    echo "  (tavsiya: $today_index - bugungi sana, yoki 0-4, default: $today_index):"
    read -p "Tanlov: " choice
    
    if [ -z "$choice" ]; then
        choice=$today_index
    fi
else
    echo "⚠️  Bugungi sana dagi commit topilmadi!"
    echo "Qaysi commit'dan restore qilmoqchisiz? (0-4, default: 0 - eng so'nggisi):"
    read -p "Tanlov: " choice
    
    if [ -z "$choice" ]; then
        choice=0
    fi
fi

selected_commit="${commits[$choice]}"

if [ -z "$selected_commit" ]; then
    echo "❌ Noto'g'ri tanlov!"
    exit 1
fi

echo ""
echo "⚠️  EHTIYOT: Bu operatsiya joriy database'ni o'chirib, git commit'dan restore qiladi!"
read -p "Davom etasizmi? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Operatsiya bekor qilindi."
    exit 0
fi

# Joriy database'ni backup qilish (xavfsizlik uchun)
current_backup="backend/inventory.db.before_git_restore_$(date +%Y%m%d_%H%M%S)"
if [ -f "backend/inventory.db" ]; then
    echo ""
    echo "Joriy database'ni backup qilish: $current_backup"
    cp backend/inventory.db "$current_backup"
fi

# Git commit'dan restore qilish
echo ""
echo "Restore qilinmoqda: $selected_commit -> backend/inventory.db"
git show $selected_commit:backend/inventory.db > backend/inventory.db.tmp

if [ $? -eq 0 ] && [ -f "backend/inventory.db.tmp" ]; then
    # Fayl hajmini tekshirish
    size=$(du -h backend/inventory.db.tmp | cut -f1)
    echo "  ✅ Database yuklandi! Hajm: $size"
    
    # Joriy database'ni almashtirish
    mv backend/inventory.db.tmp backend/inventory.db
    
    # Fayl huquqlarini o'rnatish
    chmod 644 backend/inventory.db
    
    echo ""
    echo "✅ Database restore qilindi!"
    
    # Database ichidagi ma'lumotlarni tekshirish
    echo ""
    echo "Database ichidagi ma'lumotlarni tekshirish..."
    source venv/bin/activate
    python3 << 'PYTHON_SCRIPT'
from database import SessionLocal
from models import Seller, Product, Sale, Customer
try:
    db = SessionLocal()
    sellers = db.query(Seller).count()
    products = db.query(Product).count()
    sales = db.query(Sale).count()
    customers = db.query(Customer).count()
    print(f"  Sellers: {sellers} ta")
    print(f"  Products: {products} ta")
    print(f"  Sales: {sales} ta")
    print(f"  Customers: {customers} ta")
    db.close()
except Exception as e:
    print(f"  ⚠️  Xatolik: {e}")
PYTHON_SCRIPT
    
    echo ""
    echo "Backend'ni qayta ishga tushirish..."
    systemctl restart fastapi
    sleep 2
    systemctl status fastapi --no-pager -l
    
    echo ""
    echo "=========================================="
    echo "✅ Restore muvaffaqiyatli yakunlandi!"
    echo "=========================================="
    echo ""
    echo "Joriy database backup: $current_backup"
    echo ""
else
    echo "❌ Restore qilishda xatolik!"
    if [ -f "backend/inventory.db.tmp" ]; then
        rm -f backend/inventory.db.tmp
    fi
    exit 1
fi
