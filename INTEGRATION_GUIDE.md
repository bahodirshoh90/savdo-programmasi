# Integration Guide - Offline Mode, Animations, Image Optimization

## 1. Offline Mode Integration

### ProductsScreen ga qo'shish:

```javascript
import offlineService from '../services/offlineService';
import useOffline from '../hooks/useOffline';

// Component ichida:
const { isOnline, loadWithCache } = useOffline();

const loadProducts = async (resetPage = false) => {
  // ...
  
  // Offline mode bilan
  const { data, fromCache } = await loadWithCache(
    'products',
    async () => {
      // Fetch from API
      const response = await fetch(...);
      return await response.json();
    },
    7 * 24 * 60 * 60 * 1000 // 7 days cache
  );
  
  if (data) {
    setProducts(data);
    if (fromCache && isOnline) {
      // Show cached indicator
    }
  }
};
```

### Order yaratishda:

```javascript
const { queueAction } = useOffline();

const handleCreateOrder = async (orderData) => {
  if (isOnline) {
    // Direct API call
    await createOrder(orderData);
  } else {
    // Queue for sync
    await queueAction('create_order', orderData);
  }
};
```

## 2. Smooth Animations Integration

### Screen componentlarida:

```javascript
import AnimatedView from '../components/AnimatedView';
import AnimatedButton from '../components/AnimatedButton';

// Screen renderida:
<AnimatedView animationType="fadeIn" duration={300}>
  <View>
    {/* Content */}
  </View>
</AnimatedView>

// Buttonlarda:
<AnimatedButton
  onPress={handlePress}
  style={styles.button}
  haptic={true}
>
  <Text>Button</Text>
</AnimatedButton>
```

### List items uchun:

```javascript
<FlatList
  data={items}
  renderItem={({ item, index }) => (
    <AnimatedView
      animationType="slideUp"
      delay={index * 50}
      duration={300}
    >
      <ItemComponent item={item} />
    </AnimatedView>
  )}
/>
```

## 3. Image Optimization Integration

### ProductCard.js da:

```javascript
import OptimizedImage from '../components/OptimizedImage';

// Image o'rniga:
<OptimizedImage
  source={product.image_url}
  style={styles.productImage}
  resizeMode="cover"
  placeholder={
    <View style={styles.placeholder}>
      <ActivityIndicator size="small" />
    </View>
  }
/>
```

### ProductDetailScreen da:

```javascript
import OptimizedImage from '../components/OptimizedImage';

// Image gallery da:
<OptimizedImage
  source={currentImageUrl}
  style={styles.productImage}
  resizeMode="contain"
/>
```

## 4. Barcha Screenlarda Qo'llash

### 1. ProductsScreen
- ✅ Offline mode qo'shish
- ✅ AnimatedView list items uchun
- ✅ OptimizedImage ProductCard da

### 2. ProductDetailScreen
- ✅ AnimatedView sections uchun
- ✅ OptimizedImage gallery uchun
- ✅ AnimatedButton buttons uchun

### 3. HomeScreen
- ✅ AnimatedView banners uchun
- ✅ OptimizedImage images uchun

### 4. CartScreen
- ✅ AnimatedView items uchun
- ✅ AnimatedButton buttons uchun
- ✅ Offline mode order creation uchun

### 5. OrdersScreen
- ✅ Offline mode cache
- ✅ AnimatedView orders uchun

### 6. FavoritesScreen
- ✅ AnimatedView products uchun
- ✅ OptimizedImage images uchun

### 7. ProfileScreen
- ✅ AnimatedView sections uchun
- ✅ AnimatedButton buttons uchun

## 5. Performance Tips

1. **Lazy Loading**: Faqat ko'rinadigan items uchun animation
2. **Image Caching**: OptimizedImage avtomatik cache qiladi
3. **Offline Queue**: Kichik actions uchun queue, katta data uchun cache
4. **Animation Delay**: List items uchun staggered animation (delay)

## 6. Testing

1. **Offline Mode**: Internetni o'chirib test qiling
2. **Animations**: Barcha screenlarda animation ishlashini tekshiring
3. **Image Loading**: Yavashe internetda image loading tekshiring
