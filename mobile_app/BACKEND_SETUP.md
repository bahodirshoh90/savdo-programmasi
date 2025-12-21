# Backend Server Sozlash

## Muammo: ERR_CONNECTION_TIMED_OUT

Agar `ERR_CONNECTION_TIMED_OUT` xatosi chiqsa, backend serverni ishga tushirish kerak.

## Qadam 1: Backend Serverni Ishga Tushirish

1. Yangi terminal ochnig:
   ```bash
   cd savdo-programmasi/backend
   python main.py
   ```

2. Server quyidagi xabarni ko'rsatishi kerak:
   ```
   INFO:     Uvicorn running on http://0.0.0.0:8000
   ```

## Qadam 2: Server Ishlayotganini Tekshirish

Brauzerda oching:
- `http://localhost:8000/docs` - API dokumentatsiyasi

Agar ochilsa, server ishlayapti! ✅

## Qadam 3: Web Versiyasida Localhost Ishlatish

Web versiyasida `localhost` avtomatik ishlatiladi (`config/api.js` da o'zgartirildi).

Agar hali ham muammo bo'lsa:

1. Backend serverni tekshiring - ishlayotganligini tasdiqlang
2. Firewall ni tekshiring - port 8000 ochiqligini tekshiring
3. Boshqa dastur port 8000 ni ishlatmayotganligini tekshiring

## Qadam 4: Native Versiyasida IP Manzil

Native (telefon/emulator) versiyasida IP manzil kerak:

1. IP manzilni topish:
   ```bash
   # Windows
   ipconfig
   # IPv4 Address ni toping (masalan: 192.168.1.100)
   
   # Mac/Linux
   ifconfig | grep "inet "
   ```

2. `mobile_app/config/api.js` faylida IP manzilni yangilang:
   ```javascript
   BASE_URL: __DEV__ 
     ? (isWeb 
         ? 'http://localhost:8000/api'
         : 'http://YOUR_IP:8000/api') // O'z IP manzilingizni kiriting
   ```

## Test

1. Backend serverni ishga tushiring
2. `http://localhost:8000/docs` ni brauzerda ochib ko'ring
3. Mobile appni qayta yuklang (F5)
4. Login qilib ko'ring

## Qo'shimcha Yordam

Agar muammo davom etsa:
- Backend server loglarini ko'ring
- Network xabarlarini (Network tab) brauzer Developer Tools da tekshiring
- CORS muammosi bo'lishi mumkin - backend `main.py` da CORS sozlamalari bor

