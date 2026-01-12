# Server yangilash buyruqlari

Quyidagi buyruqlarni VPS serverda bajarishingiz kerak:

## 1. SSH orqali serverga ulanish

```bash
ssh root@YOUR_VPS_IP
```

## 2. Loyihani yangilash

```bash
cd /opt/savdo-programmasi
git pull origin main
```

Agar `main` branch bo'lmasa:

```bash
git pull origin master
```

## 3. Virtual environment'ni faollashtirish va yangi dependencies o'rnatish (agar kerak bo'lsa)

```bash
source venv/bin/activate
pip install -r requirements.txt
```

## 4. FastAPI service'ni qayta ishga tushirish

```bash
systemctl restart fastapi
systemctl status fastapi
```

## 5. Telegram Bot service'ni qayta ishga tushirish (agar kerak bo'lsa)

```bash
systemctl restart telegrambot
systemctl status telegrambot
```

## 6. Nginx'ni qayta ishga tushirish (agar config o'zgarsa)

```bash
nginx -t
systemctl restart nginx
```

## 7. Loglarni tekshirish

```bash
# FastAPI loglari
journalctl -u fastapi -f

# Telegram Bot loglari
journalctl -u telegrambot -f

# Nginx loglari
tail -f /var/log/nginx/error.log
```

## Tezkor yangilash (barcha qadamlarni birgalikda)

```bash
cd /opt/savdo-programmasi && \
git pull origin main && \
source venv/bin/activate && \
pip install -r requirements.txt && \
systemctl restart fastapi && \
systemctl restart telegrambot && \
systemctl restart nginx && \
echo "Server yangilandi!"
```

## Xatoliklar bo'lsa

Agar xatoliklar bo'lsa, loglarni tekshiring:

```bash
# FastAPI xatoliklari
journalctl -u fastapi -n 50

# Nginx xatoliklari
nginx -t
tail -n 50 /var/log/nginx/error.log
```
