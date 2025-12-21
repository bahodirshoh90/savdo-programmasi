# Mobil Dastur - Tezkor Boshlash

## Android Expo Go Muammosi?

Agar Android telefonida Expo Go da yozish muammosi bo'lsa, **Web versiyasida ishlatishni** tavsiya qilamiz!

## Web versiyasida ishlatish (ENG OSON YECHIM)

### 1. Backend serverni ishga tushiring
```bash
cd savdo-programmasi/backend
python main.py
```

### 2. Mobile appni web rejimda ishga tushiring
```bash
cd savdo-programmasi/mobile_app
npm start
```

### 3. Brauzerda ochish
- Terminalda `w` tugmasini bosing
- Yoki brauzerda oching: `http://localhost:8081`
- Yoki Expo Developer Tools dan "Open in web browser" ni bosing

### 4. Login qilish
- Admin panelda seller yaratilganda ko'rsatilgan username va password dan foydalaning
- Yoki Admin panel > Sotuvchilar > 👤 ikonasidan login ma'lumotlarini ko'ring

## API URL Sozlash

Web versiyasida ham API URL ni sozlash kerak:

1. `mobile_app/config/api.js` faylini oching
2. IP manzilni to'g'rilang:
   ```javascript
   BASE_URL: 'http://YOUR_COMPUTER_IP:8000/api'
   ```

**IP manzilni topish:**
- Windows: `cmd` > `ipconfig` > IPv4 Address
- Mac/Linux: `ifconfig | grep "inet "`

## Qo'shimcha yechimlar

Batafsil ma'lumot: `ANDROID_FIX.md` faylini o'qing

