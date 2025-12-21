# Android Expo Go Muammolari Yechimi

Agar Expo Go da Android telefonida yozish muammosi bo'lsa, quyidagi yechimlarni sinab ko'ring:

## Yechim 1: Web versiyasida ishlatish (ENG OSON)

1. Terminalda:
   ```bash
   cd mobile_app
   npm start
   ```

2. `w` tugmasini bosing yoki brauzerda `http://localhost:8081` ni oching

3. Kompyuterdagi brauzerda dastur ishlaydi - bu yerda yozish muammosi bo'lmaydi

## Yechim 2: Expo Go ni yangilash

1. Google Play Store dan Expo Go ilovasini yangilang
2. Metro bundler ni qayta ishga tushiring: `npm start -- --reset-cache`
3. Expo Go da dasturni qayta yuklang

## Yechim 3: Development Build yaratish (TAVSIYA ETILADI)

Bu professional yechim - o'zingizning ilovangizni yaratish:

### O'rnatish:
```bash
npm install -g eas-cli
eas login
```

### Build yaratish:
```bash
cd mobile_app
eas build:configure
eas build --profile development --platform android
```

Bu 10-20 daqiqa vaqt oladi, lekin to'liq funksional ilova yaratadi.

## Yechim 4: Android Emulator ishlatish

1. Android Studio ni o'rnating
2. Android Virtual Device (AVD) yarating
3. Emulator ni ishga tushiring
4. Metro bundler da `a` tugmasini bosing

## Yechim 5: Ilova optimizatsiyasini tekshirish

Kodga quyidagi optimizatsiyalar qo'shildi:
- TextInput komponentlariga Android uchun maxsus propertylar
- Keyboard optimizatsiyasi
- AutoComplete support

Qayta yuklash:
```bash
npm start -- --reset-cache
```

## Eng yaxshi tavsiya

Hozircha **Web versiyasida ishlatish** eng oson va tez yechim. Keyinchalik production build yaratilganda, bu muammo yo'qoladi.

