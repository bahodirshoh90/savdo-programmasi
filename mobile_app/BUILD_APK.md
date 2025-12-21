# Mobile App APK Build - Qo'llanma

## APK Build Qilish

### 1. EAS CLI O'rnatish

```bash
npm install -g eas-cli
```

### 2. EAS ga Login Qilish

```bash
eas login
```

Agar account bo'lmasa, `eas register` orqali yarating.

### 3. APK Build Qilish

```bash
cd mobile_app
eas build --platform android --profile production
```

### 4. Build Statusini Tekshirish

```bash
eas build:list
```

### 5. APK ni Yuklab Olish

Build tugagach, EAS dashboard dan yoki quyidagi buyruq orqali yuklab oling:

```bash
eas build:download
```

## Local Build (Agar EAS ishlamasa)

### 1. Android Studio O'rnatish

Android Studio ni o'rnating va Android SDK ni sozlang.

### 2. Expo Development Build

```bash
cd mobile_app
npx expo install expo-dev-client
npx expo prebuild
npx expo run:android
```

### 3. APK Build

```bash
cd android
./gradlew assembleRelease
```

APK fayl: `android/app/build/outputs/apk/release/app-release.apk`

## Production Build Sozlash

`app.json` faylida quyidagilarni tekshiring:

```json
{
  "expo": {
    "android": {
      "package": "com.savdo.app",
      "versionCode": 1
    }
  }
}
```

## API URL Sozlash

`mobile_app/config/api.js` faylida API URL ni o'zgartiring:

```javascript
export const BASE_URL = 'https://savdo.uztoysshop.uz/api';
```

## Eslatmalar

- Birinchi build 10-15 daqiqa davom etishi mumkin.
- EAS build uchun Expo account kerak.
- Production build uchun signing key kerak (EAS avtomatik yaratadi).

