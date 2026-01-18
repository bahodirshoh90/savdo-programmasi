# WebSocket 404 Muammosini Hal Qilish

## Muammo
WebSocket endpoint `/ws` uchun 404 xatosi chiqyapti. Bu nginx konfiguratsiyasida WebSocket proxy sozlamalari yo'qligini anglatadi.

## Yechim

### 1. Nginx konfiguratsiyasini topish

```bash
ssh root@161.97.184.217
# Nginx konfiguratsiya faylini topish
nginx -t
# Yoki
ls -la /etc/nginx/sites-enabled/
ls -la /etc/nginx/conf.d/
```

### 2. Nginx konfiguratsiyasini yangilash

Nginx konfiguratsiya faylini topib, WebSocket proxy sozlamalarini qo'shing:

```nginx
server {
    listen 80;
    server_name uztoysavdo.uz;

    # WebSocket proxy sozlamalari
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # API va boshqa endpoint'lar
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Nginx konfiguratsiyasini tekshirish va qayta ishga tushirish

```bash
# Konfiguratsiyani tekshirish
nginx -t

# Agar xatolik bo'lmasa, nginx'ni qayta ishga tushirish
systemctl reload nginx
# Yoki
systemctl restart nginx

# Holatni tekshirish
systemctl status nginx
```

### 4. WebSocket endpoint'ni to'g'ridan-to'g'ri tekshirish

```bash
# FastAPI to'g'ridan-to'g'ri ishlayotganini tekshirish
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" http://127.0.0.1:8000/ws
```

### 5. Loglarni tekshirish

```bash
# Nginx error loglarini ko'rish
tail -f /var/log/nginx/error.log

# FastAPI loglarini ko'rish
journalctl -u fastapi -f
```

## Muammo bo'lsa

### Agar nginx konfiguratsiya faylini topa olmasangiz:

```bash
# Barcha nginx konfiguratsiya fayllarini topish
find /etc/nginx -name "*.conf" -type f

# Yoki default konfiguratsiyani ko'rish
cat /etc/nginx/sites-enabled/default
cat /etc/nginx/nginx.conf
```

### Agar WebSocket hali ham ishlamasa:

1. FastAPI to'g'ridan-to'g'ri ishlayotganini tekshiring:
   ```bash
   curl http://127.0.0.1:8000/api/products
   ```

2. Nginx'ni to'liq qayta ishga tushiring:
   ```bash
   systemctl stop nginx
   systemctl start nginx
   systemctl status nginx
   ```

3. Firewall'ni tekshiring:
   ```bash
   ufw status
   # Yoki
   iptables -L
   ```

## To'liq nginx konfiguratsiya misoli

```nginx
upstream fastapi_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name uztoysavdo.uz;

    # WebSocket endpoint
    location /ws {
        proxy_pass http://fastapi_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # API endpoint'lar
    location /api {
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin panel
    location / {
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
