# Screen Update Checklist

## ✅ Bajarilgan

1. **Components yaratildi:**
   - ✅ `AnimatedView.js` - Smooth animations
   - ✅ `AnimatedButton.js` - Press animations
   - ✅ `OptimizedImage.js` - Image optimization
   - ✅ `offlineService.js` - Offline mode service
   - ✅ `useOffline.js` - Offline hook
   - ✅ `animations.js` - Animation utilities
   - ✅ `ProductCard.js` - Yangilangan (animations + optimized image)

## 🔄 Yangilash Kerak

### 1. ProductsScreen.js
```javascript
// Qo'shish:
import AnimatedView from '../components/AnimatedView';
import useOffline from '../hooks/useOffline';
import offlineService from '../services/offlineService';

// loadProducts funksiyasida:
const { isOnline, loadWithCache } = useOffline();

const loadProducts = async (resetPage = false) => {
  const { data, fromCache } = await loadWithCache(
    'products',
    async () => {
      // API call
    },
    7 * 24 * 60 * 60 * 1000
  );
  // ...
};

// FlatList renderItem da:
renderItem={({ item, index }) => (
  <ProductCard
    product={item}
    index={index}
    // ...
  />
)}
```

### 2. ProductDetailScreen.js
```javascript
// Qo'shish:
import AnimatedView from '../components/AnimatedView';
import AnimatedButton from '../components/AnimatedButton';
import OptimizedImage from '../components/OptimizedImage';

// Image gallery da:
<OptimizedImage
  source={currentImageUrl}
  style={styles.productImage}
/>

// Sections da:
<AnimatedView animationType="fadeIn" delay={100}>
  <View>...</View>
</AnimatedView>

// Buttons da:
<AnimatedButton onPress={handleAddToCart}>
  <Text>Savatchaga qo'shish</Text>
</AnimatedButton>
```

### 3. HomeScreen.js
```javascript
// Qo'shish:
import AnimatedView from '../components/AnimatedView';
import OptimizedImage from '../components/OptimizedImage';

// Banners da:
<AnimatedView animationType="slideUp" delay={index * 100}>
  <OptimizedImage source={banner.image_url} />
</AnimatedView>
```

### 4. CartScreen.js
```javascript
// Qo'shish:
import AnimatedView from '../components/AnimatedView';
import AnimatedButton from '../components/AnimatedButton';
import useOffline from '../hooks/useOffline';

// Order creation da:
const { queueAction, isOnline } = useOffline();

const handleCheckout = async () => {
  if (isOnline) {
    // Direct API call
  } else {
    await queueAction('create_order', orderData);
  }
};
```

### 5. OrdersScreen.js
```javascript
// Qo'shish:
import AnimatedView from '../components/AnimatedView';
import useOffline from '../hooks/useOffline';

// loadOrders da:
const { loadWithCache } = useOffline();
// Cache bilan yuklash
```

### 6. FavoritesScreen.js
```javascript
// Qo'shish:
import AnimatedView from '../components/AnimatedView';
import OptimizedImage from '../components/OptimizedImage';
```

### 7. ProfileScreen.js
```javascript
// Qo'shish:
import AnimatedView from '../components/AnimatedView';
import AnimatedButton from '../components/AnimatedButton';

// Sections da:
<AnimatedView animationType="fadeIn" delay={index * 50}>
  <View>...</View>
</AnimatedView>
```

## 📝 Qo'shimcha Optimizatsiyalar

1. **Network Status Indicator**: Barcha screenlarda offline indicator
2. **Sync Status**: Sync jarayonini ko'rsatish
3. **Cache Size Management**: Cache hajmini boshqarish
4. **Image Preloading**: Keyingi sahifadagi rasmlarni oldindan yuklash
