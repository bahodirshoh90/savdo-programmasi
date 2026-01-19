# Serverda Xavfsiz Deployment Qo'llanmasi

## GitHub'dan Xavfsiz Pull Qilish

### 1. Avval Backup Olish (MUHIM!)

```bash
# Serverga SSH orqali ulaning
ssh username@your-server.com

# Backup papka yaratish
mkdir -p ~/backups/$(date +%Y%m%d_%H%M%S)

# Hozirgi loyihaning backup'ini olish
cp -r /path/to/your/project ~/backups/$(date +%Y%m%d_%H%M%S)/

# Yoki database backup
# SQLite uchun:
cp /path/to/your/project/backend/inventory.db ~/backups/$(date +%Y%m%d_%H%M%S)/
```

### 2. Git Status Tekshirish

```bash
# Loyiha papkasiga kiring
cd /path/to/your/project

# Hozirgi branch'ni tekshiring
git branch

# O'zgarishlar bormi tekshiring
git status

# Agar uncommitted o'zgarishlar bo'lsa, ularni stash qiling
git stash save "Local changes before pull - $(date)"
```

### 3. Xavfsiz Pull Qilish

```bash
# Remote'dan yangi o'zgarishlarni fetch qiling (yuklamaydi)
git fetch origin

# Nima o'zgarijini ko'rish
git log HEAD..origin/main

# Agar hamma narsa yaxshi bo'lsa, pull qiling
git pull origin main

# Yoki aniq branch'ni pull qiling
git pull origin main --ff-only  # Faqat fast-forward merge
```

### 4. Agar Conflict Bo'lsa

```bash
# Conflict fayllarni ko'rish
git status

# Conflict'ni hal qilishdan oldin, stash'dan o'zgarishlarni qaytarish
git stash pop

# Conflict'ni hal qilishdan keyin
git add .
git commit -m "Resolve merge conflicts"
```

### 5. Dependencies Yangilash

```bash
# Backend dependencies
cd backend
pip install -r requirements.txt

# Mijozlar ilovasi dependencies
cd ../savdo_customer_app
npm install
# yoki
yarn install
```

### 6. Database Migration (Agar Kerak Bo'lsa)

```bash
# SQLite database yaxshilanishlarini tekshirish
cd backend
python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"
```

### 7. Server Restart

```bash
# PM2 orqali (agar ishlatilayotgan bo'lsa)
pm2 restart all
pm2 logs

# Yoki systemd service
sudo systemctl restart your-service-name
sudo systemctl status your-service-name

# Yoki manual restart
# Backend uchun:
pkill -f "uvicorn main:app"
cd backend
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &
```

## Xavfsiz Deployment Script

Quyidagi script'ni `deploy.sh` sifatida saqlang:

```bash
#!/bin/bash

# Serverda Xavfsiz Deployment Script
# Usage: ./deploy.sh

set -e  # Error bo'lsa, to'xtatish

PROJECT_DIR="/path/to/your/project"
BACKUP_DIR="$HOME/backups/$(date +%Y%m%d_%H%M%S)"

echo "📦 Backup yaratilmoqda..."
mkdir -p "$BACKUP_DIR"
cp -r "$PROJECT_DIR" "$BACKUP_DIR/" || true
cp "$PROJECT_DIR/backend/inventory.db" "$BACKUP_DIR/" 2>/dev/null || true
echo "✅ Backup yaratildi: $BACKUP_DIR"

echo "📂 Loyiha papkasiga o'tilmoqda..."
cd "$PROJECT_DIR"

echo "🔍 Git status tekshirilmoqda..."
git status

echo "📥 Stash qilinmoqda..."
git stash save "Auto-stash before pull - $(date)"

echo "⬇️ Pull qilinmoqda..."
git fetch origin
git pull origin main --ff-only || {
    echo "❌ Pull xatolik berdi. Stash'dan qaytarilmoqda..."
    git stash pop
    exit 1
}

echo "📦 Dependencies yangilanmoqda..."
cd backend && pip install -r requirements.txt && cd ..
cd savdo_customer_app && npm install && cd ..

echo "🔄 Server restart qilinmoqda..."
# Bu qismni o'zingizning serveringizga mos qiling
pm2 restart all || sudo systemctl restart your-service

echo "✅ Deployment muvaffaqiyatli yakunlandi!"
echo "📊 Server loglarini tekshiring: pm2 logs yoki journalctl -u your-service"
```

Script'ni executable qiling:
```bash
chmod +x deploy.sh
```

## Avtomatik Deployment (GitHub Actions - Ixtiyoriy)

`.github/workflows/deploy.yml` faylini yarating:

```yaml
name: Deploy to Server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /path/to/your/project
            git pull origin main
            cd backend && pip install -r requirements.txt
            cd ../savdo_customer_app && npm install
            pm2 restart all
```

## Muhim Eslatmalar

1. **Har doim backup oling** - Production serverda o'zgarish qilishdan oldin
2. **Testing qiling** - Avval test serverda sinab ko'ring
3. **Database backup** - Database o'zgarishlarini ehtiyotkorlik bilan bajaring
4. **Downtime plan** - Maintenance window planlang
5. **Rollback plan** - Muammo bo'lsa, qanday qilib qaytarishni bilishingiz kerak

## Rollback (Muammo Bo'lsa)

```bash
# Avvalgi commit'ga qaytish
git log  # Kerakli commit'ni toping
git reset --hard <commit-hash>

# Yoki backup'dan qaytarish
cp -r ~/backups/YYYYMMDD_HHMMSS/* /path/to/your/project/

# Server restart
pm2 restart all
```

## Monitoring

```bash
# Server loglarini kuzatish
pm2 logs

# Yoki systemd uchun
journalctl -u your-service -f

# Error'lar uchun
tail -f /path/to/your/project/backend/server.log
```
