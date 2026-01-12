#!/bin/bash

# Server yangilash skripti (muammolarni hal qilish bilan)
# VPS serverda bajarish uchun

echo "=== Server yangilash boshlandi ==="

# 1. Loyiha papkasiga o'tish
cd /opt/savdo-programmasi

# 2. Local o'zgarishlarni stash qilish (keyinroq qayta tiklash mumkin)
echo "Local o'zgarishlar saqlanmoqda..."
git stash

# 3. Untracked fayllarni o'chirish (test fayllari)
echo "Test fayllari o'chirilmoqda..."
rm -f backend/test_daily_report.py backend/test_weekly_report.py

# 4. Git pull
echo "Git pull bajarilmoqda..."
git pull origin main

# 5. Virtual environment'ni faollashtirish
echo "Virtual environment faollashtirilmoqda..."
source venv/bin/activate

# 6. Yangi dependencies o'rnatish (agar kerak bo'lsa)
echo "Dependencies tekshirilmoqda..."
pip install -r requirements.txt

# 7. FastAPI service'ni qayta ishga tushirish
echo "FastAPI service qayta ishga tushirilmoqda..."
systemctl restart fastapi

# 8. Telegram Bot service'ni qayta ishga tushirish
echo "Telegram Bot service qayta ishga tushirilmoqda..."
systemctl restart telegrambot

# 9. Nginx'ni qayta ishga tushirish
echo "Nginx qayta ishga tushirilmoqda..."
systemctl restart nginx

# 10. Service holatini ko'rsatish
echo ""
echo "=== Service holatlari ==="
systemctl status fastapi --no-pager -l | head -n 10
systemctl status telegrambot --no-pager -l | head -n 10
systemctl status nginx --no-pager -l | head -n 10

echo ""
echo "=== Server yangilandi! ==="
echo "Agar stash qilingan o'zgarishlar kerak bo'lsa: git stash pop"
