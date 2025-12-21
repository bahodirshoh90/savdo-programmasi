# Build Qo'llanmalari - Savdo Programma

## 📦 Desktop App (.exe) Build

### Windows uchun:

1. `desktop_app` papkasiga kiring:
   ```cmd
   cd desktop_app
   ```

2. `build.bat` faylini ishga tushiring:
   ```cmd
   build.bat
   ```

3. Build tugagach, `dist\SavdoProgramma.exe` faylini toping.

### Linux/Mac uchun:

1. `desktop_app` papkasiga kiring:
   ```bash
   cd desktop_app
   ```

2. `build.sh` faylini executable qiling:
   ```bash
   chmod +x build.sh
   ```

3. Build scriptni ishga tushiring:
   ```bash
   ./build.sh
   ```

**Natija:** `dist/SavdoProgramma.exe` (Windows) yoki `dist/SavdoProgramma` (Linux/Mac)

---

## 📱 Mobile App (APK) Build

### EAS Build (Tavsiya etiladi):

1. EAS CLI o'rnatish:
   ```bash
   npm install -g eas-cli
   ```

2. Login qilish:
   ```bash
   eas login
   ```

3. Build qilish:
   ```bash
   cd mobile_app
   eas build --platform android --profile production
   ```

4. Build tugagach, APK ni yuklab olish:
   ```bash
   eas build:download
   ```

**Natija:** APK fayl EAS dashboard dan yoki `eas build:download` orqali yuklab olinadi.

### Local Build (Alternative):

```bash
cd mobile_app
npx expo prebuild
cd android
./gradlew assembleRelease
```

**Natija:** `android/app/build/outputs/apk/release/app-release.apk`

---

## 🌐 Server Deployment

### 1. Fayllarni Yuklash

Quyidagi papkalarni serverni yuklang:

- `backend/` - Backend kodlari
- `admin_panel/` - Admin panel
- `seller_panel/` - Seller panel
- `uploads/` - Upload papkasi (bo'sh bo'lishi mumkin)
- `.htaccess` - Apache konfiguratsiyasi

### 2. Python App Sozlash (cPanel)

1. cPanel → **Python App** → **Create Application**
2. **Startup File**: `backend/passenger_wsgi.py`
3. **Application Root**: `/home/username/savdo.uztoysshop.uz`
4. **App URL**: `savdo.uztoysshop.uz`

### 3. Dependencies O'rnatish

SSH orqali:

```bash
cd /home/username/savdo.uztoysshop.uz
source virtualenv/savdo.uztoysshop.uz/3.10/bin/activate
pip install -r backend/requirements.txt
```

### 4. Database Yaratish

```bash
cd backend
python create_admin.py
```

### 5. Permissions Sozlash

```bash
chmod 755 backend
chmod 644 backend/*.py
chmod 755 uploads
chmod 755 receipts
```

### 6. Python App ni Restart Qilish

cPanel → Python App → **Restart**

---

## ✅ Tekshiruv Ro'yxati

### Desktop App:
- [ ] `.exe` fayl yaratildi
- [ ] Server ishga tushadi
- [ ] Brauzer ochiladi
- [ ] Admin panel ishlaydi

### Mobile App:
- [ ] APK fayl yaratildi
- [ ] APK o'rnatiladi
- [ ] Login ishlaydi
- [ ] API ulanishi ishlaydi

### Server:
- [ ] Backend ishga tushdi
- [ ] Admin panel ochiladi
- [ ] Seller panel ochiladi
- [ ] API so'rovlari ishlaydi
- [ ] Login ishlaydi

---

## 📞 Yordam

Agar muammo bo'lsa:

1. **Desktop App:** `desktop_app/README.md` ni ko'ring
2. **Mobile App:** `mobile_app/BUILD_APK.md` ni ko'ring
3. **Server:** `CPANEL_DEPLOYMENT.md` ni ko'ring

