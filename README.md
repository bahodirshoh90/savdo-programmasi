# Savdo Programma

Sotuv va inventar boshqaruvi tizimi

## 📦 Komponentlar

- **Backend** - FastAPI backend server
- **Admin Panel** - Web-based admin panel
- **Seller Panel** - Web-based seller panel
- **Mobile App** - React Native mobile app
- **Desktop App** - Windows/Linux/Mac desktop app

## 🚀 Tezkor Boshlash

### Desktop App (.exe) Build

**Windows:**
```cmd
cd desktop_app
build.bat
```

**Linux/Mac:**
```bash
cd desktop_app
chmod +x build.sh
./build.sh
```

### Mobile App (APK) Build

```bash
cd mobile_app
npm install -g eas-cli
eas login
eas build --platform android --profile production
eas build:download
```

### Server Deployment

Batafsil qo'llanmalar:
- `QUICK_START.md` - Tezkor boshlash
- `BUILD_INSTRUCTIONS.md` - Batafsil qo'llanma
- `DEPLOYMENT_SUMMARY.md` - Deployment xulosa
- `CPANEL_DEPLOYMENT.md` - cPanel deployment

## 📚 Qo'llanmalar

- `QUICK_START.md` - Tezkor boshlash qo'llanmasi
- `BUILD_INSTRUCTIONS.md` - Build qo'llanmalari
- `DEPLOYMENT_SUMMARY.md` - Deployment xulosa
- `CPANEL_DEPLOYMENT.md` - cPanel server deployment
- `desktop_app/README.md` - Desktop app qo'llanmasi
- `mobile_app/README.md` - Mobile app qo'llanmasi
- `mobile_app/BUILD_APK.md` - APK build qo'llanmasi

## 📁 Loyiha Strukturasi

```
savdo_programma/
├── backend/              # Backend kodlari
├── admin_panel/          # Admin panel
├── seller_panel/         # Seller panel
├── mobile_app/           # Mobile app
├── desktop_app/          # Desktop app
├── uploads/              # Upload fayllar
├── requirements.txt      # Python dependencies
└── .htaccess            # Apache konfiguratsiyasi
```

## 🔧 Requirements

- Python 3.10+
- Node.js 18+
- npm/yarn

## 📝 License

Private project

