#!/bin/bash
# Xavfsiz server update script
# Contabo VPS uchun

echo "=== Xavfsiz Server Update ==="
echo ""

# 1. Project papkasiga o'tish
cd /opt/savdo-programmasi || exit 1

# 2. Git status tekshirish
echo "1. Git status tekshirilmoqda..."
git status

# 3. Local o'zgarishlarni stash qilish (agar bor bo'lsa)
echo ""
echo "2. Local o'zgarishlar stash qilinmoqda..."
git stash push -m "Local changes before pull $(date +%Y-%m-%d_%H:%M:%S)"

# 4. Untracked fayllarni o'chirish (agar kerak bo'lsa)
echo ""
echo "3. Untracked fayllar tekshirilmoqda..."
UNTRACKED=$(git ls-files --others --exclude-standard)
if [ -n "$UNTRACKED" ]; then
    echo "Untracked fayllar topildi:"
    echo "$UNTRACKED"
    read -p "O'chirishni xohlaysizmi? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git clean -fd
    fi
fi

# 5. Git pull qilish
echo ""
echo "4. GitHub'dan yangilanishlar olinmoqda..."
git pull origin main

# 6. Agar conflict bo'lsa
if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Git pull xatosi! Conflict bo'lishi mumkin."
    echo "Stash'dan qayta tiklash:"
    git stash pop
    exit 1
fi

# 7. Virtual environment faollashtirish
echo ""
echo "5. Virtual environment faollashtirilmoqda..."
source venv/bin/activate || exit 1

# 8. Dependencies yangilash
echo ""
echo "6. Python dependencies yangilanmoqda..."
pip install -r requirements.txt --quiet

# 9. Services restart qilish
echo ""
echo "7. Services restart qilinmoqda..."
systemctl restart fastapi
systemctl restart telegrambot
systemctl restart nginx

# 10. Services status tekshirish
echo ""
echo "8. Services status tekshirilmoqda..."
systemctl status fastapi --no-pager -l
echo ""
systemctl status telegrambot --no-pager -l
echo ""
systemctl status nginx --no-pager -l

echo ""
echo "✅ Server muvaffaqiyatli yangilandi!"
echo ""
echo "Stash'dan qayta tiklash kerak bo'lsa:"
echo "  cd /opt/savdo-programmasi"
echo "  git stash list"
echo "  git stash pop"
