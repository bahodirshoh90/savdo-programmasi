# Mobile App'ni Web'da Ishga Tushirish

## Qadamlar:

### 1. Terminal'da mobile_app papkasiga o'ting:
```bash
cd savdo-programmasi/mobile_app
```

### 2. Web'da ishga tushiring:
```bash
npm run web
```

yoki

```bash
expo start --web
```

### 3. Browser'da ochiladi:
- Odatda `http://localhost:8081` yoki `http://localhost:19006` da ochiladi
- Agar avtomatik ochilmasa, terminal'dagi URL'ni browser'ga kiriting

## Eslatmalar:

1. **Backend server ishlamoqchi bo'lishi kerak** - API so'rovlar uchun
2. **CORS sozlamalari** - Backend'da CORS yoqilgan bo'lishi kerak
3. **API URL** - `config/api.js` faylida to'g'ri API URL bo'lishi kerak

## Muammolar bo'lsa:

- Agar xatolik bo'lsa, terminal'dagi xato xabarlarini ko'ring
- Browser console'da (F12) xatolarni tekshiring
- Backend server ishlayotganini tekshiring

## Web'da cheklovlar:

- GPS/Location tracking web'da to'liq ishlamaydi (browser permission kerak)
- Ba'zi native funksiyalar web'da mavjud emas
- Offline storage localStorage orqali ishlaydi

