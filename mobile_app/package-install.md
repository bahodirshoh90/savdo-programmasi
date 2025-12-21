# Dependencies O'rnatish

Agar muammolar bo'lsa, quyidagi tartibda o'rnating:

## 1. package.json ni yangilang

```bash
npm install
```

## 2. Agar xatolik bo'lsa, manual o'rnating:

```bash
npm install babel-preset-expo --save-dev
npm install @expo/vector-icons
```

## 3. Cache ni tozalash

```bash
npm start -- --reset-cache
```

## 4. node_modules va package-lock.json ni o'chirib qayta o'rnatish

```bash
rm -rf node_modules package-lock.json
npm install
```

Windows da:
```bash
rmdir /s /q node_modules
del package-lock.json
npm install
```

## 5. Expo cache ni tozalash

```bash
npx expo start --clear
```

