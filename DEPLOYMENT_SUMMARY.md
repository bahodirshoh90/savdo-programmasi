# 📦 Deployment Summary - Savdo Programma

## ✅ Tayyorlangan Fayllar

### 1. Desktop App (.exe)
- ✅ `desktop_app/launcher.py` - Launcher script
- ✅ `desktop_app/build_exe.spec` - PyInstaller konfiguratsiyasi
- ✅ `desktop_app/build.bat` - Windows build script
- ✅ `desktop_app/build.sh` - Linux/Mac build script
- ✅ `desktop_app/README.md` - Qo'llanma

### 2. Mobile App (APK)
- ✅ `mobile_app/BUILD_APK.md` - APK build qo'llanmasi
- ✅ `mobile_app/config/api.js` - Production API URL sozlangan
- ✅ `mobile_app/eas.json` - EAS build konfiguratsiyasi

### 3. Server Deployment
- ✅ `BUILD_INSTRUCTIONS.md` - Batafsil qo'llanma
- ✅ `QUICK_START.md` - Tezkor boshlash
- ✅ `.htaccess` - Apache konfiguratsiyasi
- ✅ `backend/passenger_wsgi.py` - Passenger WSGI fayli

---

## 🚀 Build Qilish

### Desktop App (.exe)

**Windows:**
```cmd
cd desktop_app
build.bat
```
Natija: `dist\SavdoProgramma.exe`

**Linux/Mac:**
```bash
cd desktop_app
chmod +x build.sh
./build.sh
```
Natija: `dist/SavdoProgramma`

### Mobile App (APK)

```bash
cd mobile_app
npm install -g eas-cli
eas login
eas build --platform android --profile production
eas build:download
```

Natija: APK fayl yuklab olinadi

---

## 🌐 Serverga Yuklash

### Yuklash Kerak Bo'lgan Fayllar:

1. **Backend:**
   - `backend/` (barcha fayllar)
   - `backend/passenger_wsgi.py`
   - `backend/requirements.txt`

2. **Frontend:**
   - `admin_panel/` (barcha fayllar)
   - `seller_panel/` (barcha fayllar)

3. **Konfiguratsiya:**
   - `.htaccess` (root papkada)

4. **Papkalar:**
   - `uploads/` (bo'sh papka yaratish)
   - `backend/receipts/` (bo'sh papka yaratish)

### cPanel Sozlash:

1. **Python App:**
   - Startup File: `backend/passenger_wsgi.py`
   - Application Root: `/home/username/savdo.uztoysshop.uz`
   - App URL: `savdo.uztoysshop.uz`

2. **Dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Database:**
   ```bash
   python backend/create_admin.py
   ```

4. **Restart Python App**

---

## 📋 Tekshiruv Ro'yxati

### Desktop App:
- [ ] `.exe` fayl yaratildi
- [ ] Server ishga tushadi
- [ ] Brauzer ochiladi
- [ ] Admin panel ishlaydi

### Mobile App:
- [ ] APK fayl yaratildi
- [ ] APK o'rnatiladi
- [ ] Login ishlaydi
- [ ] API ulanishi ishlaydi (production URL)

### Server:
- [ ] Backend ishga tushdi
- [ ] Admin panel ochiladi
- [ ] Seller panel ochiladi
- [ ] API so'rovlari ishlaydi
- [ ] Login ishlaydi

---

## 📞 Yordam

- **Desktop App:** `desktop_app/README.md`
- **Mobile App:** `mobile_app/BUILD_APK.md`
- **Server:** `BUILD_INSTRUCTIONS.md`
- **Tezkor:** `QUICK_START.md`

---

## ⚠️ Eslatmalar

1. **Desktop App:**
   - Birinchi marta ishga tushirganda database yaratiladi
   - Barcha ma'lumotlar `backend/inventory.db` da saqlanadi
   - Server to'xtatish uchun console oynasida `Ctrl+C`

2. **Mobile App:**
   - Production build uchun EAS account kerak
   - API URL: `https://savdo.uztoysshop.uz/api`
   - Birinchi build 10-15 daqiqa davom etishi mumkin

3. **Server:**
   - Uvicorn ni qo'lda ishga tushirmang (Passenger avtomatik ishlaydi)
   - `.htaccess` fayli muhim
   - Python App ni restart qilish kerak

