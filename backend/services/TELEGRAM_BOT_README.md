# Telegram Bot - To'liq qo'llanma

## Funksiyalar ro'yxati

### 📊 Statistika
- **Bugungi kun** - bugungi sotuvlar statistikasi
- **Haftalik** - oxirgi 7 kunning natijalari
- **Oylik** - 30 kunlik hisobot
- **Oxirgi sotuvlar** - eng yangi 10 ta sotuv

### 👥 Mijozlar
- **Top mijozlar** - eng ko'p xarid qilganlar
- **Qarzdorlar** - qarzda bo'lganlar ro'yxati
- **Qarz limiti oshganlar** - ogohlantirishlar

### 📦 Mahsulotlar
- **Top mahsulotlar** - eng ko'p sotiladigan
- **Kam sotiladigan** - 30 kun ichida sotilmaganlar
- **Kam qolgan** - omborda tugab qolayotgan mahsulotlar
- **Ombor holati** - barcha mahsulotlar qoldig'i

### 💳 To'lovlar
- **To'lov turlari** - naqd, karta, nasiya statistikasi
- **Sotuvchilar reytingi** - eng yaxshi sotuvchilar

### ✅ Tasdiqlar (Admin)
- **Tasdiq kutayotganlar** - yangi sotuvlarni ko'rish
- **Tasdiqlash/Rad etish** - sotuvni tasdiqlash yoki bekor qilish
- **Tasdiqlangan sotuvlar** - tarixni ko'rish
- **Rad etilganlar** - bekor qilingan sotuvlar
- **Bildirishnoma** - yangi sotuv kelganda avtomatik xabar

### 📊 Tahlil (Analytics)
- **Sotuvlar tendensiyasi** - oxirgi 7 kunning grafigi
- **ABC tahlil** - mahsulotlarni A, B, C toifalarga ajratish
- **Tavsiyalar** - tizim tavsifalari (kam qolgan, qarzlar, kam sotiladigan)
- **O'sish sur'ati** - bu oy va o'tgan oyni taqqoslash

### 📊 Taqqoslash
- **Oylar taqqoslash** - oxirgi 3 oyni solishtirish
- **Sotuvchilar taqqoslash** - sotuvchilarning reytingi

### ⚙️ Sozlamalar
- **Bildirishnomalar** - qanday bildirishnomalar borligini ko'rish
- **Rejalashtirilgan hisobotlar** - avtomatik hisobotlar haqida ma'lumot
- **Tizim holati** - umumiy statistika (mahsulotlar, mijozlar, sotuvlar soni)

### 📥 Hisobotlar
- **Excel export** - sotuvlar hisobotini yuklab olish
- **PDF export** - PDF formatda hisobot

## Komandalar

```
/start - Botni ishga tushirish
/menu - Asosiy menyu
/stats - Statistika
/today - Bugungi kun
/view_sale 123 - Sotuvni ko'rish va tasdiqlash
/help - Yordam
```

## Sozlash

### 1. .env faylni to'ldiring:
```env
TELEGRAM_TOKEN=your_bot_token_here
ADMIN_CHAT_IDS=123456789,987654321
```

### 2. Botni yaratish:
1. Telegram'da @BotFather ni toping
2. `/newbot` buyrug'ini yuboring
3. Bot nomi va username kiriting
4. Tokenni oling va `.env` faylga qo'ying

### 3. Admin ID ni olish:
1. @userinfobot ni toping Telegram'da
2. `/start` ni bosing
3. Sizning ID raqamingiz ko'rsatiladi
4. Uni `.env` faylga qo'ying (vergul bilan bir nechta qo'shish mumkin)

### 4. Ishga tushirish:
```bash
cd backend/services
python telegram_service.py
```

## Bildirishnomalar tizimi

### Avtomatik bildirishnomalar:
1. **Yangi sotuv** - sotuv tasdiqlashni talab qilsa, darhol adminga xabar yuboriladi
2. **Kam qolgan mahsulotlar** - ombor limiti ostida
3. **Qarz limiti oshganlar** - mijoz qarzda

### Tasdiqlash jarayoni:
1. Yangi sotuv yaratiladi (admin tasdiqini talab qilsa)
2. Adminga Telegram orqali bildirishnoma keladi
3. Admin `/view_sale ID` orqali ko'radi
4. "✅ Tasdiqlash" yoki "❌ Rad etish" tugmasini bosadi
5. Natija bazaga saqlanadi
6. Sotuvchiga xabar yuboriladi (keyingi versiyada)

## Xususiyatlar

### Inline tugmalar:
Barcha navigatsiya inline tugmalar orqali - qulay va tez

### Hierarchical menyu:
11 ta alohida menyu bo'limi bilan to'liq tuzilgan interfeys

### Real-time ma'lumotlar:
Barcha ma'lumotlar to'g'ridan-to'g'ri bazadan olinadi

### Admin tizimi:
Faqat admin ID lari tasdiqlash huquqiga ega

### Multi-format export:
Excel va PDF formatda hisobotlar

## Kengaytirish rejalari

1. **Sotuvchilarga bildirishnoma** - tasdiqlangan/rad etilgan sotuv haqida
2. **Rejalashtirilgan hisobotlar** - kunlik/haftalik avtomatik yuborish
3. **Grafik hisobotlar** - matplotlib bilan vizualizatsiya
4. **Qidiruv funksiyasi** - mahsulot/mijoz qidirish
5. **Inline keyboard edit** - tezkor tahrirlash
6. **Web dashboard integratsiyasi** - web va bot sinxronlashuvi

## Texnik detallar

- **Framework**: python-telegram-bot (async)
- **Database**: SQLite orqali SQLAlchemy
- **Services**: Modulli arxitektura - har bir bo'lim alohida service
- **Event loop**: asyncio bilan to'liq async ishlash
- **Error handling**: Har bir funksiyada try-except
- **Logging**: Xatolar uchun logging konfiguratsiyasi

## Xatolarni bartaraf etish

### Bot ishlamayapti:
1. TOKEN to'g'riligini tekshiring
2. Internet aloqasini tekshiring
3. Backend papkasidan ishga tushirishni tekshiring

### Ma'lumotlar ko'rinmayapti:
1. Database yo'li to'g'riligini tekshiring
2. Backend papkasida `inventory.db` borligini tekshiring
3. Services import xatosini tekshiring

### Bildirishnoma kelmayapti:
1. ADMIN_CHAT_IDS to'g'riligini tekshiring
2. Bot bilan /start bosganingizni tekshiring
3. Loglarni tekshiring

## Muallif

Barcha funksiyalar o'zbek tilida, professional va to'liq.
