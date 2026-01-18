# Skript Permission Muammosini Hal Qilish

## Muammo
`./safe_update_server.sh` skriptini ishga tushirishda "permission denied" xatosi chiqyapti.

## Yechim

### 1-usul: Execute permission berish

```bash
ssh root@161.97.184.217
cd /opt/savdo-programmasi
chmod +x safe_update_server.sh
./safe_update_server.sh
```

### 2-usul: Bash orqali to'g'ridan-to'g'ri ishga tushirish

Agar `chmod` ishlamasa, bash orqali to'g'ridan-to'g'ri ishga tushirishingiz mumkin:

```bash
ssh root@161.97.184.217
cd /opt/savdo-programmasi
bash safe_update_server.sh
```

### 3-usul: Qo'lda yangilash (skript ishlamasa)

```bash
ssh root@161.97.184.217
cd /opt/savdo-programmasi

# Database backup
mkdir -p backups
cp backend/inventory.db backups/inventory_$(date +%Y%m%d_%H%M%S).db

# Git yangilash
git fetch origin
git reset --hard origin/main

# Virtual environment
source venv/bin/activate

# Paketlar
pip install -r requirements.txt

# Servislarni qayta ishga tushirish
systemctl restart fastapi
systemctl restart telegrambot
systemctl restart nginx

# Holatni tekshirish
systemctl status fastapi
```

## Tekshirish

Skriptga execute permission berilganini tekshirish:

```bash
ls -l safe_update_server.sh
```

Natijada `-rwxr-xr-x` ko'rinishi kerak (x - execute permission).

## Muammo bo'lsa

Agar hali ham muammo bo'lsa:

```bash
# Skript faylini to'liq ko'rish
cat safe_update_server.sh

# Permission'larni to'liq ko'rish
ls -la safe_update_server.sh

# Owner'ni tekshirish
stat safe_update_server.sh
```
