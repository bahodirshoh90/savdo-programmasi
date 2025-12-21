# EAS Build Tar Error Fix

## Muammo
`tar -C /home/expo/workingdir/build --strip-components 1 -zxf /home/expo/workingdir/project.tar.gz exited with non-zero code: 2`

## Asosiy sabablar:
1. **OneDrive yo'li juda uzun** - `C:\Users\bahod\OneDrive\Ishchi stol\savdo programma\...`
2. Fayl nomlarida maxsus belgilar
3. Katta fayllar yoki juda ko'p fayllar

## Yechimlar:

### 1. Proyektni qisqa yo'lga ko'chirish (ENG YAXSHISI)
```powershell
# Proyektni OneDrive tashqarisiga ko'chiring:
# Masalan: C:\Projects\savdo-programmasi\
# Yoki: C:\savdo-programmasi\
```

### 2. Git orqali build qilish
```powershell
cd C:\Projects
git clone <your-repo-url> savdo-app
cd savdo-app\mobile_app
eas build --platform android --clear-cache
```

### 3. Build'ni qayta urinib ko'rish
```powershell
cd "C:\Users\bahod\OneDrive\Ishchi stol\savdo programma\savdo-programmasi\mobile_app"
eas build --platform android --clear-cache
```

### 4. Disk maydonini tozalash
- Kamida 5-10 GB bo'sh joy kerak
- Hozir: 1.74 GB (yetarli emas!)

## Qo'shimcha tekshiruvlar:
- `.easignore` faylida barcha keraksiz fayllar ignore qilingan
- `app.json.minimal` ignore qilingan
- Barcha `.md` fayllar ignore qilingan
- `scripts/` papkasi ignore qilingan

