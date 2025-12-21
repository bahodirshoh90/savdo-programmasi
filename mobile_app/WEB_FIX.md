# Web Versiyasida Database Muammosi Yechimi

## Muammo
Web versiyasida `expo-sqlite` ishlamaydi, chunki u native modul.

## Yechim
Database service endi platform-agnostic:
- **Web**: localStorage ishlatadi
- **Native (iOS/Android)**: SQLite ishlatadi

## Qayta ishga tushirish

1. Metro bundler ni to'xtating (agar ishlab turgan bo'lsa)
2. Cache ni tozalang va qayta ishga tushiring:
   ```bash
   cd savdo-programmasi/mobile_app
   npm start -- --clear
   ```
3. Web versiyasida oching (terminalda `w` tugmasini bosing)

## Qo'shimcha optimizatsiyalar

- `metro.config.js` - expo-sqlite web worker ni web bundling dan exclude qiladi
- `database.js` - Platform.OS ni tekshirib, to'g'ri storage backend ishlatadi
- Barcha database operatsiyalari web va native uchun ishlaydi

## Test qilish

1. Web versiyasida login qiling
2. Orders yarating - localStorage ga saqlanadi
3. Products ko'ring - cache localStorage da
4. Native versiyasida ham bir xil kod ishlaydi, lekin SQLite ishlatadi

