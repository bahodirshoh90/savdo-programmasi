# Muammolarni Hal Qilish

## 1. babel-preset-expo o'rnatish

PowerShell da quyidagi buyruqlarni bajaring:

```powershell
cd "C:\Users\bahod\OneDrive\Ishchi stol\savdo programma\savdo-programmasi\mobile_app"
npm install babel-preset-expo --save-dev
```

## 2. Assets papkasini yaratish

```powershell
mkdir assets
```

## 3. Minimal assets fayllarini yaratish

Hozircha assets fayllarni o'tkazib yuborish uchun, `app.json` dan asset bundle patterns ni o'chirish mumkin yoki bo'sh PNG fayllar yaratish kerak.

Eng oson yo'li - Expo default assets dan foydalanish:

```powershell
npm install
npx expo prebuild
```

Yoki `app.json` da asset yo'llarini o'chirish:

1. `app.json` faylini oching
2. Quyidagi qatorlarni izohga oling yoki o'chiring:
   - `"icon": "./assets/icon.png",`
   - `"image": "./assets/splash.png",` (splash ichida)
   - `"foregroundImage": "./assets/adaptive-icon.png",` (android ichida)
   - `"favicon": "./assets/favicon.png",` (web ichida)
   - `"icon": "./assets/notification-icon.png",` (plugins ichida)

## 4. Cache ni tozalash

```powershell
npx expo start --clear
```

## 5. To'liq qayta o'rnatish (agar kerak bo'lsa)

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npx expo start --clear
```

## Eng Tez Yechim

Quyidagi buyruqlarni ketma-ket bajaring:

```powershell
cd "C:\Users\bahod\OneDrive\Ishchi stol\savdo programma\savdo-programmasi\mobile_app"

# 1. babel-preset-expo o'rnatish
npm install babel-preset-expo --save-dev

# 2. Assets papkasini yaratish
New-Item -ItemType Directory -Force -Path assets

# 3. Minimal placeholder fayllar (opsional - Expo default dan foydalanadi)
# Hozircha kerak emas

# 4. Cache ni tozalab ishga tushirish
npx expo start --clear
```

Agar assets xatosi davom etsa, `app.json` dan asset yo'llarini vaqtincha olib tashlang.

