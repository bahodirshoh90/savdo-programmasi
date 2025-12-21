/**
 * Script to create placeholder assets
 * Run: node scripts/create-assets.js
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// Create assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create a simple placeholder note
const readmeContent = `# Assets

Bu papkada quyidagi fayllar kerak:

1. icon.png (1024x1024px) - App ikonasi
2. splash.png (1242x2436px) - Splash screen
3. adaptive-icon.png (1024x1024px) - Android adaptive icon
4. favicon.png (48x48px) - Web favicon
5. notification-icon.png (96x96px) - Notification icon

Hozircha Expo default assets dan foydalanish uchun app.json da assetBundlePatterns ni o'chirib tashlang yoki
Expo CLI orqali assetlar yarating:

npx expo install expo-asset
npx expo prebuild

Yoki online tool lardan foydalaning:
- https://www.appicon.co/
- https://www.favicon-generator.org/
`;

fs.writeFileSync(path.join(assetsDir, 'README.md'), readmeContent);

console.log('Assets directory created!');
console.log('Please add the required image files or run: npx expo prebuild');

