# Test Buyurtmalar API

## Backend Endpoint
- **URL**: `POST /api/orders`
- **Location**: `backend/main.py:1728`
- **Authentication**: Yo'q (faqat `Depends(get_db)`)
- **Status**: ✅ Mavjud

## Frontend Configuration
- **BASE_URL**: `https://uztoysavdo.uz/api`
- **CREATE Endpoint**: `/orders`
- **Full URL**: `https://uztoysavdo.uz/api/orders`
- **Status**: ✅ To'g'ri

## Test
Browser console'da quyidagilarni tekshiring:

1. `[ORDERS] Creating order with payload:` - payload ko'rsatiladi
2. `[ORDERS] API endpoint:` - `/orders` ko'rsatiladi
3. `[ORDERS] Full URL:` - `https://uztoysavdo.uz/api/orders` ko'rsatiladi
4. `[ORDERS] Error` - agar xatolik bo'lsa, batafsil xabar ko'rsatiladi

## Muammo
Agar "API yo'q" deb ko'rsatilsa:
1. Browser console'ni tekshiring (F12)
2. Network tab'ni oching va `/api/orders` request'ini qidiring
3. Request status'ni tekshiring (200, 404, 500, etc.)
4. Error message'ni o'qib chiqing
