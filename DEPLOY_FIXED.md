# Server yangilash - Muammolarni hal qilish

Serverda git pull qilishda muammo bo'lsa, quyidagi buyruqlarni bajaring:

## Muammo hal qilish buyruqlari

### Variant 1: Local o'zgarishlarni saqlab qolish (stash)

```bash
cd /opt/savdo-programmasi

# Local o'zgarishlarni stash qilish
git stash

# Test fayllarini o'chirish
rm -f backend/test_daily_report.py backend/test_weekly_report.py

# Git pull
git pull origin main

# Service'larni restart qilish
source venv/bin/activate
pip install -r requirements.txt
systemctl restart fastapi
systemctl restart telegrambot
systemctl restart nginx
```

### Variant 2: Local o'zgarishlarni bekor qilish (agar kerak bo'lmasa)

```bash
cd /opt/savdo-programmasi

# Local o'zgarishlarni bekor qilish
git checkout -- backend/main.py
git checkout -- backend/services/telegram_bot_runner.py
git checkout -- backend/services/telegram_service.py

# Test fayllarini o'chirish
rm -f backend/test_daily_report.py backend/test_weekly_report.py

# Git pull
git pull origin main

# Service'larni restart qilish
source venv/bin/activate
pip install -r requirements.txt
systemctl restart fastapi
systemctl restart telegrambot
systemctl restart nginx
```

### Variant 3: Hard reset (barcha local o'zgarishlarni bekor qilish)

**⚠️ EHTIYOT:** Bu barcha local o'zgarishlarni yo'qotadi!

```bash
cd /opt/savdo-programmasi

# Barcha local o'zgarishlarni bekor qilish
git reset --hard HEAD

# Test fayllarini o'chirish
rm -f backend/test_daily_report.py backend/test_weekly_report.py

# Git pull
git pull origin main

# Service'larni restart qilish
source venv/bin/activate
pip install -r requirements.txt
systemctl restart fastapi
systemctl restart telegrambot
systemctl restart nginx
```

## Tezkor yangilash (barcha qadamlarni birga)

```bash
cd /opt/savdo-programmasi && \
git stash && \
rm -f backend/test_daily_report.py backend/test_weekly_report.py && \
git pull origin main && \
source venv/bin/activate && \
pip install -r requirements.txt && \
systemctl restart fastapi && \
systemctl restart telegrambot && \
systemctl restart nginx && \
echo "Server yangilandi!"
```

## Service holatini tekshirish

```bash
# FastAPI
systemctl status fastapi

# Telegram Bot
systemctl status telegrambot

# Nginx
systemctl status nginx
```

## Loglarni ko'rish

```bash
# FastAPI loglari
journalctl -u fastapi -n 50

# Telegram Bot loglari
journalctl -u telegrambot -n 50

# Nginx error loglari
tail -n 50 /var/log/nginx/error.log
```
