# 🖥️ Contabo VPS ga Deployment Qo'llanmasi

## 📋 Talab qilinadigan narsalar

- Contabo VPS (Ubuntu 22.04 yoki 24.04)
- Domain nomi (ixtiyoriy, lekin tavsiya etiladi)
- SSH client (Windows: PowerShell yoki PuTTY)

---

## 🔐 1-QADAM: VPS ga SSH orqali ulanish

### Windows PowerShell dan:
```bash
ssh root@YOUR_VPS_IP
# Parolingizni kiriting
```

### Birinchi marta ulangandan keyin:
```bash
# Tizimni yangilash
apt update && apt upgrade -y

# Kerakli paketlarni o'rnatish
apt install -y python3 python3-pip python3-venv nodejs npm nginx git supervisor curl wget unzip
```

---

## 📦 2-QADAM: Loyihani yuklab olish

```bash
# Loyiha papkasini yaratish
mkdir -p /var/www
cd /var/www

# GitHub dan klonlash
git clone https://github.com/bahodirshoh90/savdo-programmasi.git savdo
cd savdo
```

---

## 🐍 3-QADAM: Python Backend sozlash

```bash
cd /var/www/savdo/backend

# Virtual environment yaratish
python3 -m venv venv
source venv/bin/activate

# Kerakli kutubxonalarni o'rnatish
pip install --upgrade pip
pip install -r ../requirements.txt

# Ma'lumotlar bazasini yaratish (birinchi marta)
python -c "from database import engine, Base; from models import *; Base.metadata.create_all(bind=engine)"

# Admin foydalanuvchi yaratish
python create_admin.py
```

---

## ⚙️ 4-QADAM: Environment sozlamalari

```bash
# .env fayl yaratish
cat > /var/www/savdo/backend/.env << 'EOF'
# Database
DATABASE_URL=sqlite:///./inventory.db

# JWT Secret (o'zingiz yarating)
SECRET_KEY=your_super_secret_key_here_change_this_123456

# Telegram Bot (o'z tokeningizni qo'ying)
TELEGRAM_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
ADMIN_CHAT_IDS=123456789,987654321

# Server
HOST=0.0.0.0
PORT=8000
EOF
```

---

## 🔧 5-QADAM: Systemd Service yaratish (Backend)

```bash
cat > /etc/systemd/system/savdo-backend.service << 'EOF'
[Unit]
Description=Savdo Backend FastAPI
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/savdo/backend
Environment=PATH=/var/www/savdo/backend/venv/bin
ExecStart=/var/www/savdo/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Serviceni yoqish
systemctl daemon-reload
systemctl enable savdo-backend
systemctl start savdo-backend
systemctl status savdo-backend
```

---

## 🤖 6-QADAM: Telegram Bot Service yaratish

```bash
cat > /etc/systemd/system/savdo-telegram.service << 'EOF'
[Unit]
Description=Savdo Telegram Bot
After=network.target savdo-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/savdo/backend
Environment=PATH=/var/www/savdo/backend/venv/bin
ExecStart=/var/www/savdo/backend/venv/bin/python -m services.telegram_service
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Serviceni yoqish
systemctl daemon-reload
systemctl enable savdo-telegram
systemctl start savdo-telegram
systemctl status savdo-telegram
```

---

## 🌐 7-QADAM: Nginx konfiguratsiyasi

```bash
cat > /etc/nginx/sites-available/savdo << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;
    
    # Upload hajmini oshirish
    client_max_body_size 50M;
    
    # API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    # Admin Panel
    location /admin {
        alias /var/www/savdo/admin_panel;
        index index.html;
        try_files $uri $uri/ /admin/index.html;
    }
    
    # Seller Panel
    location /seller {
        alias /var/www/savdo/seller_panel;
        index index.html;
        try_files $uri $uri/ /seller/index.html;
    }
    
    # Uploads (rasmlar)
    location /uploads {
        alias /var/www/savdo/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Static files
    location /static {
        alias /var/www/savdo/admin_panel/static;
        expires 30d;
    }
    
    # Root - Admin panelga yo'naltirish
    location / {
        return 301 /admin;
    }
}
EOF

# Konfiguratsiyani yoqish
ln -sf /etc/nginx/sites-available/savdo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Nginx ni tekshirish va qayta ishga tushirish
nginx -t
systemctl restart nginx
```

---

## 🔒 8-QADAM: SSL Sertifikat (HTTPS) - Ixtiyoriy

Agar domain bor bo'lsa:

```bash
# Certbot o'rnatish
apt install -y certbot python3-certbot-nginx

# SSL olish
certbot --nginx -d your-domain.com

# Avtomatik yangilash
certbot renew --dry-run
```

---

## 🔥 9-QADAM: Firewall sozlash

```bash
# UFW ni yoqish
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 8000  # API port (test uchun)
ufw enable
ufw status
```

---

## 📱 10-QADAM: Mobile App API URL yangilash

Loyihangizda `mobile_app/config/api.js` ni yangilang:

```javascript
const API_BASE_URL = 'http://YOUR_VPS_IP/api';
// yoki SSL bilan:
const API_BASE_URL = 'https://your-domain.com/api';
```

---

## 🖥️ 11-QADAM: Desktop App API URL yangilash

`desktop_app/config.json`:
```json
{
  "apiUrl": "http://YOUR_VPS_IP/api"
}
```

---

## ✅ 12-QADAM: Tekshirish

### Backend tekshirish:
```bash
curl http://localhost:8000/api/health
# yoki
curl http://YOUR_VPS_IP/api/health
```

### Loglarni ko'rish:
```bash
# Backend logs
journalctl -u savdo-backend -f

# Telegram bot logs
journalctl -u savdo-telegram -f

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Servicelarni qayta ishga tushirish:
```bash
systemctl restart savdo-backend
systemctl restart savdo-telegram
systemctl restart nginx
```

---

## 🔄 13-QADAM: Yangilanishlar uchun

Loyihani yangilash:
```bash
cd /var/www/savdo
git pull origin main

# Backend yangilash
cd backend
source venv/bin/activate
pip install -r ../requirements.txt

# Servicelarni qayta ishga tushirish
systemctl restart savdo-backend
systemctl restart savdo-telegram
```

---

## 📊 Foydali buyruqlar

```bash
# Barcha servicelar holati
systemctl status savdo-backend savdo-telegram nginx

# Disk joy
df -h

# RAM va CPU
htop

# Port tekshirish
ss -tulpn | grep -E '(8000|80|443)'

# Process ko'rish
ps aux | grep python
ps aux | grep uvicorn
```

---

## ⚠️ Muammolar va yechimlar

### 1. Backend ishlamayapti
```bash
# Logni ko'ring
journalctl -u savdo-backend -n 50

# Qo'lda ishga tushiring
cd /var/www/savdo/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Telegram bot ishlamayapti
```bash
# Token tekshiring
cat /var/www/savdo/backend/.env | grep TELEGRAM

# Qo'lda ishga tushiring
cd /var/www/savdo/backend
source venv/bin/activate
python -m services.telegram_service
```

### 3. 502 Bad Gateway
```bash
# Backend ishlayaptimi?
curl http://localhost:8000/api/health

# Nginx config to'g'rimi?
nginx -t
```

### 4. Permission xatolik
```bash
chown -R www-data:www-data /var/www/savdo
chmod -R 755 /var/www/savdo
```

---

## 🎯 Yakuniy URL lar

| Xizmat | URL |
|--------|-----|
| Admin Panel | http://YOUR_VPS_IP/admin |
| Seller Panel | http://YOUR_VPS_IP/seller |
| API | http://YOUR_VPS_IP/api |
| API Docs | http://YOUR_VPS_IP/api/docs |

---

## 📞 Yordam

Muammo bo'lsa:
1. Loglarni tekshiring
2. Servicelar holatini tekshiring
3. Firewall sozlamalarini tekshiring
