# cPanel ga Joylash - Aniq Ko'rsatma

## 📦 cPanel ga Yuklash Kerak Bo'lgan Fayllar

### 1. Backend Kodlari
```
backend/
├── main.py
├── models.py
├── schemas.py
├── database.py
├── auth.py
├── utils.py
├── websocket_manager.py
├── services/
│   ├── __init__.py
│   ├── product_service.py
│   ├── customer_service.py
│   ├── sale_service.py
│   ├── seller_service.py
│   ├── order_service.py
│   ├── pdf_service.py
│   ├── excel_service.py
│   ├── barcode_service.py
│   ├── calculation_service.py
│   ├── role_service.py
│   ├── settings_service.py
│   ├── audit_service.py
│   └── debt_service.py
├── inventory.db (bo'sh yoki mavjud database)
├── requirements.txt
└── .htaccess (Python uchun)
```

### 2. Admin Panel
```
admin_panel/
├── index.html
└── static/
    ├── app.js
    ├── style.css
    └── barcode-scanner.js
```

### 3. Seller Panel
```
seller_panel/
├── index.html
└── static/
    ├── app.js
    ├── style.css
    ├── sale-functions.js
    └── barcode-scanner.js
```

### 4. Papkalar (Yaratilishi Kerak)
```
uploads/
├── products/
├── sellers/
└── settings/

receipts/
```

## 🚀 cPanel ga Joylash Qadamlari

### Qadam 1: File Manager orqali Yuklash

1. **cPanel ga kirish**
   - `https://uztoysshop.uz:2083` yoki `https://uztoysshop.uz/cpanel`
   - Username va Password bilan kirish

2. **File Manager ochish**
   - cPanel da "File Manager" ni toping va oching
   - `public_html` papkasiga o'ting

3. **Yangi papka yaratish**
   - `savdo` nomli yangi papka yarating
   - Yoki mavjud papkadan foydalaning

### Qadam 2: Fayllarni Yuklash

#### A. Backend Kodlarini Yuklash

1. **Backend papkasini yuklash:**
   ```
   public_html/savdo/
   ├── backend/
   │   ├── main.py
   │   ├── models.py
   │   ├── schemas.py
   │   ├── database.py
   │   ├── auth.py
   │   ├── utils.py
   │   ├── websocket_manager.py
   │   ├── services/ (barcha fayllar)
   │   ├── inventory.db
   │   └── requirements.txt
   ```

2. **Papkalarni yaratish:**
   - `backend/uploads/products/`
   - `backend/uploads/sellers/`
   - `backend/uploads/settings/`
   - `backend/receipts/`

#### B. Admin Panel Yuklash

```
public_html/savdo/
└── admin_panel/
    ├── index.html
    └── static/
        ├── app.js
        ├── style.css
        └── barcode-scanner.js
```

#### C. Seller Panel Yuklash

```
public_html/savdo/
└── seller_panel/
    ├── index.html
    └── static/
        ├── app.js
        ├── style.css
        ├── sale-functions.js
        └── barcode-scanner.js
```

### Qadam 3: Python App Yaratish (cPanel Python App)

1. **cPanel da "Python App" ni toping**
   - cPanel da "Software" bo'limida "Python App" ni toping
   - "Create Application" tugmasini bosing

2. **Python App sozlamalari:**
   - **Python Version**: 3.9 yoki 3.10 (mavjud bo'lsa)
   - **App Directory**: `savdo`
   - **App URL**: `savdo.uztoysshop.uz` (subdomen)
   - **Startup File**: `backend/main.py`
   - **Application Root**: `savdo`

3. **Environment Variables:**
   ```
   PYTHONPATH=/home/username/savdo/backend
   ```

4. **Requirements.txt ni ko'rsating:**
   - `backend/requirements.txt` faylini ko'rsating

### Qadam 4: .htaccess Fayl Yaratish

`public_html/savdo/backend/.htaccess` faylini yarating:

```apache
RewriteEngine On
RewriteBase /savdo/backend/

# API endpoints
RewriteRule ^api/(.*)$ main.py/$1 [L,QSA]

# Static files
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ main.py/$1 [L,QSA]
```

### Qadam 5: Subdomen Sozlash

1. **cPanel da "Subdomains" ni toping**
2. **Yangi subdomen yarating:**
   - **Subdomain**: `savdo`
   - **Document Root**: `public_html/savdo`
   - **Create** tugmasini bosing

### Qadam 6: SSL Sertifikati

1. **cPanel da "SSL/TLS Status" ni toping**
2. **savdo.uztoysshop.uz uchun SSL sertifikatini faollashtiring**
   - Let's Encrypt yoki AutoSSL

### Qadam 7: Database Sozlash

1. **cPanel da "MySQL Databases" ni toping**
2. **Yangi database yarating** (agar SQLite o'rniga MySQL ishlatmoqchi bo'lsangiz)
3. **Yoki SQLite faylini yuklang:**
   - `backend/inventory.db` faylini yuklang
   - Ruxsatlar: 644

### Qadam 8: Ruxsatlar (Permissions)

File Manager da quyidagi ruxsatlarni o'rnating:

```bash
backend/uploads/          → 755
backend/receipts/         → 755
backend/inventory.db      → 644
backend/                  → 755
admin_panel/              → 755
seller_panel/             → 755
```

### Qadam 9: Python Dependencies O'rnatish

cPanel Python App da:
1. "Setup Python App" ni oching
2. "Run Pip Install" ni bosing
3. `requirements.txt` faylini ko'rsating
4. Dependencies o'rnatiladi

### Qadam 10: App Ishga Tushirish

1. Python App da "Restart App" tugmasini bosing
2. Logs ni tekshiring

## 🔧 cPanel Python App Konfiguratsiyasi

### Startup File:
```
backend/main.py
```

### Entry Point:
```python
# main.py oxirida:
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

### Environment Variables:
```
PYTHONPATH=/home/username/savdo/backend
PORT=8000
```

## 📝 Test Qilish

1. **API Test:**
   ```
   https://savdo.uztoysshop.uz/api/health
   ```

2. **Admin Panel:**
   ```
   https://savdo.uztoysshop.uz/admin_panel/
   ```

3. **Seller Panel:**
   ```
   https://savdo.uztoysshop.uz/seller_panel/
   ```

## ⚠️ Muhim Eslatmalar

1. **Python Version**: cPanel da Python 3.9+ mavjudligini tekshiring
2. **WSGI**: Agar cPanel WSGI qo'llab-quvvatlasa, `passenger_wsgi.py` fayli kerak bo'lishi mumkin
3. **Static Files**: Nginx yoki Apache konfiguratsiyasida static fayllar uchun sozlash kerak
4. **Database Path**: SQLite fayl yo'li to'g'ri bo'lishi kerak
5. **Uploads**: Uploads papkasi yozish ruxsatiga ega bo'lishi kerak

## 🆘 Muammolar va Yechimlar

### Python App ishlamasa:
- Logs ni tekshiring: cPanel Python App → Logs
- Python version ni tekshiring
- Dependencies to'liq o'rnatilganini tekshiring

### Static files ko'rinmasa:
- File permissions ni tekshiring (755)
- .htaccess faylini tekshiring

### Database xatosi:
- `inventory.db` fayli mavjudligini tekshiring
- Ruxsatlar to'g'ri ekanligini tekshiring (644)

