#!/bin/bash

# Server yangilash skripti
# VPS serverda bajarish uchun

echo "=== Server yangilash boshlandi ==="

# 1. Loyiha papkasiga o'tish
cd /opt/savdo-programmasi

# 2. Git pull
echo "Git pull bajarilmoqda..."
git pull origin main

# 3. Virtual environment'ni faollashtirish
echo "Virtual environment faollashtirilmoqda..."
source venv/bin/activate

# 4. Yangi dependencies o'rnatish (agar kerak bo'lsa)
echo "Dependencies tekshirilmoqda..."
pip install -r requirements.txt

# 5. FastAPI service'ni qayta ishga tushirish
echo "FastAPI service qayta ishga tushirilmoqda..."
systemctl restart fastapi

# 6. Telegram Bot service'ni qayta ishga tushirish
echo "Telegram Bot service qayta ishga tushirilmoqda..."
systemctl restart telegrambot

# 7. Nginx'ni qayta ishga tushirish
echo "Nginx qayta ishga tushirilmoqda..."
systemctl restart nginx

# 8. Service holatini ko'rsatish
echo ""
echo "=== Service holatlari ==="
echo "FastAPI status:"
systemctl status fastapi --no-pager -l

echo ""
echo "Telegram Bot status:"
systemctl status telegrambot --no-pager -l

echo ""
echo "Nginx status:"
systemctl status nginx --no-pager -l

echo ""
echo "=== Server yangilandi! ==="
