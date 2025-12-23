# Build Ko'rsatmalari - .exe Fayl Yaratish

## 1. Talablar

- Node.js v16 yoki yuqori versiya
- npm yoki yarn
- Windows operatsion tizimi (build uchun)

## 2. O'rnatish

```bash
cd desktop_app
npm install
```

## 3. Development rejimida test qilish

```bash
npm start
```

Bu dasturni Electron'da ochadi va test qilish imkonini beradi.

## 4. .exe Fayl Yaratish

### Variant 1: To'liq o'rnatish fayli (Setup.exe)

```bash
npm run build:win
```

Bu quyidagilarni yaratadi:
- `dist/Savdo Programma Setup 1.0.0.exe` - o'rnatish fayli
- `dist/Savdo-Programma-Portable.exe` - portable versiya

### Variant 2: Faqat Portable versiya

```bash
npm run build:win:portable
```

Bu faqat portable versiyani yaratadi:
- `dist/Savdo-Programma-Portable.exe` - o'rnatishsiz ishlaydi

## 5. Icon O'rnatish

`assets/icon.ico` faylini o'z icon'ingiz bilan almashtiring:
- O'lchami: 256x256 yoki 512x512 piksel
- Format: .ico (Windows uchun)

## 6. Build'dan keyin

Build qilingan fayllar `dist/` papkasida bo'ladi:
- Setup faylini boshqa kompyuterga ko'chirib o'rnatishingiz mumkin
- Portable faylini boshqa kompyuterga ko'chirib to'g'ridan-to'g'ri ishlatishingiz mumkin

## 7. Muammolarni hal qilish

### Build xatosi: "electron not found"
```bash
npm install electron --save-dev
```

### Build xatosi: "electron-builder not found"
```bash
npm install electron-builder --save-dev
```

### Icon ko'rinmayapti
- `assets/icon.ico` faylini tekshiring
- Icon o'lchami 256x256 yoki 512x512 bo'lishi kerak

## 8. Qo'shimcha sozlamalar

`package.json` ichidagi `build` bo'limida quyidagilarni o'zgartirishingiz mumkin:

- `appId` - ilova ID
- `productName` - ilova nomi
- `win.icon` - icon fayl yo'li

