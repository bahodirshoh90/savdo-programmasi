# Mobile App API URL Sozlash

## Muammo
Agar "Network error" xatosi chiqsa, bu sizning kompyuteringizdagi IP manzil mobile appdagi IP manzilga mos kelmasligi mumkin.

## Yechim

### 1-qadam: Kompyuteringizdagi IP manzilni topish

**Windows:**
1. `Windows + R` bosing
2. `cmd` yozib Enter bosing
3. `ipconfig` yozib Enter bosing
4. `IPv4 Address` ni toping (masalan: `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```

### 2-qadam: Mobile app config faylini yangilash

`mobile_app/config/api.js` faylini oching va 7-qatordagi IP manzilni o'zgartiring:

```javascript
BASE_URL: __DEV__ 
    ? 'http://YOUR_IP_ADDRESS:8000/api' // Masalan: 'http://192.168.1.100:8000/api'
    : 'https://127.0.0.1:8000/api',
```

### 3-qadam: Backend serverni ishga tushirish

Backend server ishlab turishi kerak:
```bash
cd savdo-programmasi/backend
python main.py
```

### 4-qadam: Mobile appni qayta yuklash

1. Metro bundler ni to'xtating (Ctrl+C)
2. Qayta ishga tushiring: `npm start -- --reset-cache`

## Login ma'lumotlari

1. Admin paneldan yangi seller yaratganingizda, login ma'lumotlari avtomatik ko'rsatiladi
2. Yoki Admin panel > Sotuvchilar bo'limidan seller username ni ko'rish mumkin
3. Parolni faqat seller yaratish paytida ko'rish mumkin, keyin ko'rsatilmaydi

## Tekshirish

1. Backend server ishlab turganini tekshiring: `http://YOUR_IP:8000/docs`
2. Mobile appdan login qilib ko'ring

