# 🚀 Tezkor Boshlash - Savdo Programma

## 📦 Desktop App (.exe) Build

### Windows:
```cmd
cd desktop_app
build.bat
```
**Natija:** `dist\SavdoProgramma.exe`

### Linux/Mac:
```bash
cd desktop_app
chmod +x build.sh
./build.sh
```
**Natija:** `dist/SavdoProgramma`

---

## 📱 Mobile App (APK) Build

### EAS Build:
```bash
cd mobile_app
npm install -g eas-cli
eas login
eas build --platform android --profile production
eas build:download
```

**Natija:** APK fayl yuklab olinadi

---

## 🌐 Server Deployment

1. **Fayllarni yuklang:**
   - `backend/`
   - `admin_panel/`
   - `seller_panel/`
   - `uploads/` (bo'sh)
   - `.htaccess`

2. **cPanel Python App:**
   - Startup File: `backend/passenger_wsgi.py`
   - Application Root: `/home/username/savdo.uztoysshop.uz`

3. **Dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Database:**
   ```bash
   python backend/create_admin.py
   ```

5. **Restart Python App**

---

## ✅ Batafsil Qo'llanmalar

- **Desktop App:** `desktop_app/README.md`
- **Mobile App:** `mobile_app/BUILD_APK.md`
- **Server:** `BUILD_INSTRUCTIONS.md`

