# Web Storage Fix - SecureStore Muammosi Yechildi

## Muammo
Web versiyasida `SecureStore.getItemAsync is undefined` xatosi chiqardi, chunki SecureStore native modul.

## Yechim
✅ Platform-agnostic storage yaratildi:
- **Web**: localStorage ishlatadi
- **Native**: SecureStore ishlatadi (agar mavjud bo'lsa)

## O'zgarishlar

### 1. `services/api.js`
- `tokenStorage` helper qo'shildi
- Barcha `SecureStore` chaqiruvlari `tokenStorage` ga o'zgartirildi
- `expo-network` ham platform-agnostic qilindi

### 2. `services/auth.js`
- `tokenStorage` helper qo'shildi
- Login, logout, token get/set funksiyalari platform-agnostic

## Endi ishlaydi:
✅ Login - token localStorage da saqlanadi (web)
✅ Logout - token localStorage dan o'chiriladi
✅ Token refresh - localStorage da yangilanadi
✅ Network check - navigator.onLine ishlatadi (web)

## Keyingi qadam: Backend Server

`ERR_CONNECTION_TIMED_OUT` muammosi backend serverni tekshirish kerak:

1. **Backend serverni ishga tushiring:**
   ```bash
   cd savdo-programmasi/backend
   python main.py
   ```

2. **IP manzilni tekshiring:**
   - `config/api.js` da IP manzil to'g'riligini tekshiring
   - Backend server `0.0.0.0:8000` yoki `192.168.1.103:8000` da ishlayotganini tekshiring

3. **CORS sozlamalarini tekshiring:**
   - Backend `main.py` da CORS sozlamalari web versiyasidan kelgan so'rovlarni qabul qilishini tekshiring

