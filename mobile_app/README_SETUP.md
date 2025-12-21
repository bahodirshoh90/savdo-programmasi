# Mobil Dastur O'rnatish Qo'llanmasi

## Talablar

- Node.js 16+ 
- npm yoki yarn
- Expo CLI
- Android Studio (Android uchun) yoki Xcode (iOS uchun)

## O'rnatish

### 1. Dependencies o'rnatish

```bash
cd mobile_app
npm install
```

### 2. API konfiguratsiyasini sozlash

`config/api.js` faylida backend API URL ni sozlang:

```javascript
BASE_URL: 'http://YOUR_IP_ADDRESS:8000/api'
```

**Windows uchun IP manzilini olish:**
```bash
ipconfig
```
IPv4 Address ni toping (masalan: 192.168.1.100)

### 3. Dasturni ishga tushirish

```bash
npm start
```

Keyin:
- `a` - Android emulator/device da ochish
- `i` - iOS simulator da ochish
- QR kodni telefon kamerasi bilan skanerlang (Expo Go app kerak)

## Build qilish

### Android APK yaratish

```bash
npx expo build:android
```

### iOS IPA yaratish

```bash
npx expo build:ios
```

## Xususiyatlar

✅ **Online/Offline ishlaydi** - Internet yo'q bo'lganda ham ishlaydi
✅ **GPS Tracking** - Ish vaqtida avtomatik joylashuv yuboradi
✅ **Buyurtmalar** - Yangi buyurtmalar yaratish va boshqarish
✅ **Mahsulotlar** - Mahsulotlar ro'yxati va qidiruv
✅ **Mijozlar** - Mijozlar ro'yxati va qidiruv
✅ **Sinxronlash** - Offline data avtomatik sinxronlashadi

## Muammolar va yechimlar

### GPS permission xatosi
- Android: `app.json` da permissions to'g'ri sozlanganligini tekshiring
- iOS: Info.plist da location permission qo'shing

### API ulashmasa
- Backend server ishlayotganini tekshiring
- Firewall sozlamalarini tekshiring
- IP manzilini to'g'ri kiriting

### Offline database xatosi
- Database fayl yozish ruxsatini tekshiring
- Dasturni qayta ishga tushiring

