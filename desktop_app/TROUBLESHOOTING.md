# Desktop App Troubleshooting

## Cache Errors

Agar quyidagi xatoliklar ko'rsatilsa:
```
ERROR:cache_util_win.cc(20)] Unable to move the cache: Access is denied.
ERROR:disk_cache.cc(208)] Unable to create cache
```

Bu xatoliklar Electron'ning cache papkasiga yozish huquqi bilan bog'liq. App ishlashiga katta ta'sir qilmaydi, lekin console'da ko'rinadi.

### Yechim:

1. **Cache papkasini tozalash:**
   - `%APPDATA%\savdo-programma-desktop` papkasini o'chiring
   - Yoki `%LOCALAPPDATA%\savdo-programma-desktop` papkasini o'chiring

2. **Administrator huquqlari bilan ishga tushirish:**
   - PowerShell'ni Administrator huquqlari bilan oching
   - `npm start` buyrug'ini bajaring

## Login Muammolari

### 1. Login ishlamayapti

**Tekshirish:**
1. Developer Tools'ni oching (Ctrl+Shift+I yoki F12)
2. Console tab'ni tekshiring
3. Quyidagi log'larni ko'ring:
   - `API_BASE initialized: ...`
   - `window.electronAPI available: true/false`
   - `Login attempt: { username, loginUrl, apiBase }`

**Muammo bo'lsa:**
- `window.electronAPI available: false` - preload.js ishlamayapti
- `Login URL: undefined` - API_BASE to'g'ri o'rnatilmagan

### 2. Serverga ulanib bo'lmayapti

**Tekshirish:**
1. Network tab'ni tekshiring
2. `/api/auth/login` so'rovini ko'ring
3. Response status'ni tekshiring

**Yechim:**
- Settings window'ni oching
- API URL ni to'g'ri kiriting: `http://161.97.184.217/api`
- "Saqlash" tugmasini bosing
- Dastur qayta ishga tushadi

### 3. Login parol noto'g'ri deyapti

**Tekshirish:**
1. Console'da `Login response data:` log'ini ko'ring
2. Response'ni tekshiring

**Yechim:**
- Backend server ishlab turganini tekshiring
- Login va parol to'g'riligini tekshiring
- Backend log'larini tekshiring

## Debug Mode

Development rejimida ishga tushirish:
```powershell
cd desktop_app
npm start
```

Build qilish:
```powershell
cd desktop_app
npm run build:packager
```

## Console Log'lari

Quyidagi log'lar ko'rsatilishi kerak:
- `API Base URL set to: http://161.97.184.217/api`
- `API_BASE initialized: http://161.97.184.217/api`
- `window.electronAPI available: true`
- `Login attempt: { username, loginUrl, apiBase }`
- `Login response status: 200`
- `Login response data: { success: true, token: ... }`

Agar bu log'lar ko'rsatilmasa, muammo bor.

