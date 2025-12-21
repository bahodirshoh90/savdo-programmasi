# 📱 Telefon App'da Console Log'larni Ko'rish

## Usul 1: Metro Bundler Terminal (ENG OSON) ⭐

1. Kompyuteringizda Metro bundler ishga tushirilgan terminalni oching
2. Telefondan app'ga kirib, harakatlarni bajaring
3. **Barcha `console.log()` chiqishlari terminal'da ko'rinadi**

```bash
# Terminal'da quyidagicha log'lar ko'rinadi:
LOG  📱 API Config: { platform: 'android', isWeb: false, ... }
LOG  Products loaded: { resultType: 'object', isArray: true, ... }
```

## Usul 2: Telefondan Debug Menu O'chish

### Android:
1. Telefonni **silkitish** (shake)
2. Yoki **3 barmoq** bilan ekranga bosing
3. **"Shake device"** yoki **"Open debugger"** ni tanlang
4. Chrome DevTools ochiladi

### iOS:
1. Telefonni **silkitish** (shake gesture)
2. Yoki **Device menu** ni ochish (⌘D yoki Ctrl+D kompyuterdan)
3. **"Debug Remote JS"** ni tanlang
4. Chrome DevTools ochiladi

## Usul 3: Expo Dev Menu

### Android:
- **3 barmoq bilan ekranga bosing** yoki
- **Back tugmasini 2 marta bosish**
- Yoki **kompyuterdan**: `d` tugmasini bosing Metro bundler terminalida

### iOS:
- **⌘D** (Mac) yoki **Ctrl+D** (Windows/Linux) Metro bundler terminalida
- Yoki **Device menu** orqali

**Dev Menu'da:**
- "Open JS Debugger" - Chrome DevTools ochadi
- "Reload" - App'ni qayta yuklash
- "Show Element Inspector" - Elementlarni ko'rish

## Usul 4: Chrome DevTools (Advanced)

1. Metro bundler terminalida **`d`** tugmasini bosing (Android uchun)
2. Yoki telefondan **shake gesture** qiling → **"Open debugger"**
3. Chrome brauzer ochiladi: `http://localhost:19000/debugger-ui`
4. **F12** yoki **Ctrl+Shift+I** (Windows) / **⌘+Option+I** (Mac) bosib **Console** tab'ini oching
5. **Barcha log'lar bu yerda ko'rinadi**

## ⚠️ MUHIM ESLATMA:

- **Metro bundler terminal** eng oson va tez usul
- **Chrome DevTools** murakkab debugging uchun kerak bo'lganda
- Barcha `console.log()`, `console.error()`, `console.warn()` chiqishlari ko'rinadi

## Debug Log'larni Ko'rish Misoli:

```javascript
// Code'da:
console.log('📱 API Config:', { platform: Platform.OS, BASE_URL });

// Terminal'da yoki Chrome Console'da ko'rinadi:
LOG  📱 API Config: { platform: 'android', BASE_URL: 'http://192.168.0.103:8000/api' }
```

## Qo'shimcha Maslahatlar:

- **Filter qilish**: Terminal'da `Ctrl+F` yoki DevTools'da filter input
- **Clear log'lar**: DevTools'da 🗑️ tugmasi
- **Network requests**: DevTools'da Network tab
- **Component tree**: React DevTools extension (alohida o'rnatish kerak)

