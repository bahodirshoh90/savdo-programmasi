# TELEGRAM BOT - ISHGA TUSHIRISH YO'RIQNOMASI

## 1. TAYYORGARLIK

### Bot yaratish (Telegram'da):
1. Telegram'da **@BotFather** ni toping
2. `/newbot` buyrug'ini yuboring
3. Bot nomi kiriting: `Savdo Bot` (istalgan nom)
4. Bot username kiriting: `savdo_business_bot` (tugashi `_bot` bo'lishi kerak)
5. BotFather sizga **TOKEN** beradi, uni saqlang

### Admin ID ni olish:
1. Telegram'da **@userinfobot** ni toping
2. `/start` bosing
3. Sizning **Chat ID** raqamingiz ko'rsatiladi
4. Uni saqlang (masalan: `123456789`)

## 2. SOZLASH

### .env faylni to'ldirish:
`backend/.env` faylini oching va quyidagilarni qo'shing:

```env
# Telegram bot sozlamalari
TELEGRAM_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
ADMIN_CHAT_IDS=123456789,987654321
```

**E'tibor bering:**
- `TELEGRAM_TOKEN` - BotFather'dan olgan token
- `ADMIN_CHAT_IDS` - Admin ID lari (vergul bilan ajratib bir nechta qo'shish mumkin)

## 3. KUTUBXONALARNI O'RNATISH

Agar hali o'rnatmagan bo'lsangiz:

```bash
pip install python-telegram-bot[job-queue]
```

Yoki barcha kutubxonalarni:

```bash
pip install -r requirements.txt
```

## 4. ISHGA TUSHIRISH

### Birinchi marta:
```bash
cd c:\projects\savdo_programma\backend\services
python telegram_service.py
```

### Natija:
```
Telegram bot ishga tayyor!
Bot ishlayapti... To'xtatish uchun Ctrl+C bosing.
```

## 5. TELEGRAM'DA ISHLATISH

1. Telegram'da botingizni toping (username orqali)
2. `/start` bosing
3. Asosiy menyu ko'rinadi
4. Kerakli bo'limni tanlang

## 6. ASOSIY FUNKSIYALAR

### 📊 Statistika:
- Bugungi kun, haftalik, oylik hisobotlar
- Oxirgi sotuvlarni ko'rish

### 👥 Mijozlar:
- Top mijozlar
- Qarzdorlar ro'yxati
- Qarz limiti oshganlar

### 📦 Mahsulotlar:
- Top mahsulotlar
- Kam sotiladigan
- Kam qolgan mahsulotlar
- Ombor holati

### 💳 To'lovlar:
- To'lov turlari statistikasi
- Sotuvchilar reytingi

### ✅ Tasdiqlar (ADMIN UCHUN):
- Tasdiq kutayotgan sotuvlar
- Tasdiqlash/Rad etish
- Tarixni ko'rish

**MUHIM:** Yangi sotuv tasdiqlashni talab qilsa, adminga avtomatik bildirishnoma keladi!

### 📊 Tahlil:
- Sotuvlar tendensiyasi
- ABC tahlil
- Tizim tavsifalari
- O'sish sur'ati

### 📊 Taqqoslash:
- Oylar taqqoslash
- Sotuvchilar taqqoslash

### ⚙️ Sozlamalar:
- Bildirishnomalar
- Rejalashtirilgan hisobotlar
- Tizim holati

### 📥 Hisobotlar:
- Excel formatda yuklab olish
- PDF formatda yuklab olish

## 7. KOMANDALAR

```
/start - Botni ishga tushirish
/menu - Asosiy menyu
/stats - Statistika
/today - Bugungi kun
/view_sale 123 - Sotuvni batafsil ko'rish va tasdiqlash
/help - Yordam
```

## 8. TASDIQLASH JARAYONI

### Qanday ishlaydi:

1. **Sotuv yaratiladi** (admin_panel yoki seller_panel dan)
   - `requires_admin_approval = True` bo'lsa

2. **Bildirishnoma keladi**
   - Admin Telegram'da darhol xabar oladi
   - Xabarda sotuv ID, mijoz, summa ko'rsatiladi

3. **Admin tekshiradi**
   - `/view_sale ID` orqali batafsil ko'radi
   - Mahsulotlar, narxlar, mijoz ma'lumotlari

4. **Qaror qabul qiladi**
   - "✅ Tasdiqlash" tugmasi - sotuv tasdiqlandi
   - "❌ Rad etish" tugmasi - sotuv bekor qilindi

5. **Natija**
   - Tasdiqlangan: mahsulot omborda kamayadi, hisob-kitob amalga oshadi
   - Rad etilgan: hech narsa o'zgarmaydi

## 9. XATOLARNI BARTARAF ETISH

### Bot ishlamayapti:
```bash
# TOKEN ni tekshiring
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('TELEGRAM_TOKEN'))"

# Admin ID ni tekshiring
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('ADMIN_CHAT_IDS'))"
```

### Bildirishnoma kelmayapti:
1. Bot bilan `/start` bosganingizni tekshiring
2. ADMIN_CHAT_IDS da sizning ID ingiz borligini tekshiring
3. TOKEN to'g'riligini tekshiring

### Ma'lumotlar yo'q:
1. Backend papkasidan ishga tushirganingizni tekshiring
2. `inventory.db` fayli borligini tekshiring

## 10. KENGAYTIRISH

Agar qo'shimcha funksiyalar kerak bo'lsa:
- Qidiruv funksiyasi
- Grafik hisobotlar
- Rejalashtirilgan bildirishnomalar
- Sotuvchilarga xabar yuborish
- Va boshqalar...

Barcha funksiyalar `telegram_service.py` faylida joylashgan va kengaytirish uchun qulay.

## 11. XAVFSIZLIK

1. **TOKEN ni hech kimga bermang!**
2. `.env` faylni git'ga qo'shmang
3. Faqat ishonchli odamlarning ID sini `ADMIN_CHAT_IDS` ga qo'shing
4. Serverde ishlatganda HTTPS ishlating

## 12. YORDAM

Muammo yoki savol bo'lsa, quyidagi fayllarni tekshiring:
- `TELEGRAM_BOT_README.md` - batafsil ma'lumot
- `telegram_service.py` - kod
- `.env` - sozlamalar

Bot tayyor! Yaxshi sotuvlar! 🚀
