# Savdo Programma Desktop Application

Bu loyiha Electron asosida yaratilgan desktop ilova bo'lib, admin va seller panellarini kompyuterga o'rnatib ishlatish imkonini beradi.

## Xususiyatlar

- ✅ Admin Panel - to'liq boshqaruv paneli
- ✅ Seller Panel - sotuvchi paneli
- ✅ Internet orqali backend serverga ulanadi
- ✅ Windows .exe fayl sifatida ishlaydi
- ✅ Portable versiya (o'rnatishsiz ishlaydi)

## Talablar

- Node.js (v16 yoki yuqori)
- npm yoki yarn

## O'rnatish

1. Dependencies'ni o'rnating:
```bash
cd desktop_app
npm install
```

2. Development rejimida ishga tushiring:
```bash
npm start
```

## Build qilish (.exe yaratish)

### Windows uchun .exe yaratish:

```bash
npm run build:win
```

Bu quyidagilarni yaratadi:
- `dist/Savdo Programma Setup.exe` - o'rnatish fayli
- `dist/Savdo-Programma-Portable.exe` - portable versiya (o'rnatishsiz)

### Portable versiya (o'rnatishsiz):

```bash
npm run build:win:portable
```

## Server Sozlamalari

Dastur birinchi marta ishga tushganda, server URL'ini sozlashingiz kerak:

1. Asosiy oynada "Server Sozlamalari" tugmasini bosing
2. Backend server URL'ini kiriting:
   - Masalan: `http://161.97.184.217/api`
   - Yoki: `https://savdo.uztoysshop.uz/api`

Sozlamalar `config.json` faylida saqlanadi va keyingi ishga tushirishlarda avtomatik yuklanadi.

## Fayl Strukturasi

```
desktop_app/
├── main.js              # Electron main process
├── preload.js           # Preload script (security)
├── package.json         # Dependencies va build config
├── admin_panel/         # Admin panel fayllari
├── seller_panel/        # Seller panel fayllari
├── assets/              # Icon va boshqa resurslar
└── dist/                # Build qilingan fayllar
```

## Muammolarni hal qilish

### API ulanmayapti

1. Server sozlamalarini tekshiring
2. Backend server ishlab turganini tekshiring
3. Firewall sozlamalarini tekshiring

### CSS/JS fayllar yuklanmayapti

- HTML fayllarda path'lar relative bo'lishi kerak
- Static fayllar to'g'ri joyda ekanligini tekshiring

## Build konfiguratsiyasi

`package.json` ichida `build` bo'limida quyidagilar sozlangan:

- **appId**: `com.savdo.programma`
- **productName**: `Savdo Programma`
- **icon**: `assets/icon.ico` (Windows uchun)

## Qo'shimcha ma'lumot

- Electron: https://www.electronjs.org/
- Electron Builder: https://www.electron.build/

