# Build Muammosi va Yechimi

## Muammo
Windows'da build qilishda quyidagi xatolik chiqmoqda:
```
ERROR: Cannot create symbolic link : A required privilege is not held by the client.
```

Bu muammo Windows'da symbolic link yaratish huquqlari bilan bog'liq.

## Yechimlar

### Variant 1: Administrator huquqlari bilan ishga tushirish (Tavsiya etiladi)

1. PowerShell'ni **Administrator huquqlari bilan** oching
2. Quyidagi buyruqlarni bajaring:

```powershell
cd C:\projects\savdo_programma\desktop_app
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run build:win:portable
```

### Variant 2: Developer Mode'ni yoqish

1. Windows Settings > Update & Security > For developers
2. "Developer Mode" ni yoqing
3. Kompyuterni qayta ishga tushiring
4. Keyin build qiling:

```powershell
cd C:\projects\savdo_programma\desktop_app
npm run build:win:portable
```

### Variant 3: Electron-builder cache'ni tozalash va qayta urinish

```powershell
# Cache'ni tozalash
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -ErrorAction SilentlyContinue

# Build qilish
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run build:win:portable
```

### Variant 4: Portable build o'rniga dir build

Agar hali ham muammo bo'lsa, `package.json`'da target'ni o'zgartiring:

```json
"win": {
  "target": [
    {
      "target": "dir",
      "arch": ["x64"]
    }
  ]
}
```

Keyin `dist/win-unpacked/` papkasida `.exe` fayl bo'ladi.

## Qo'shimcha ma'lumot

- Bu muammo faqat Windows'da yuzaga keladi
- macOS va Linux'da bunday muammo bo'lmaydi
- Portable build code signing'ni talab qilmaydi, lekin electron-builder hali ham winCodeSign'ni yuklamoqchi bo'lishi mumkin

