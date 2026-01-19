/**
 * Product Detail Screen for Customer App
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Colors from '../constants/colors';
import { getProduct } from '../services/products';
import { useCart } from '../context/CartContext';
import API_CONFIG from '../config/api';
import { useFocusEffect } from '@react-navigation/native';

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const { addToCart, cartItems } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get current cart quantity for this product
  const getCartQuantity = () => {
    const item = cartItems.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  };
  
  const [cartQuantity, setCartQuantity] = useState(0);
  
  // Update cart quantity when cartItems change
  useFocusEffect(
    React.useCallback(() => {
      setCartQuantity(getCartQuantity());
    }, [cartItems, productId])
  );

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    setIsLoading(true);
    try {
      const result = await getProduct(productId);
      setProduct(result);
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Xatolik', 'Mahsulot ma\'lumotlarini yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    const isOutOfStock = product.total_pieces !== undefined && product.total_pieces !== null && product.total_pieces <= 0;
    if (isOutOfStock) {
      Alert.alert('Xatolik', 'Bu mahsulot omborda yo\'q');
      return;
    }

    addToCart(product, quantity);
    Alert.alert('Muvaffaqiyatli', `${quantity} dona savatchaga qo'shildi`);
    // Update cart quantity after adding
    setTimeout(() => {
      setCartQuantity(getCartQuantity());
    }, 100);
  };

  const getImageUrl = () => {
    if (!product?.image_url) return null;
    if (product.image_url.startsWith('http')) {
      return product.image_url.replace('http://', 'https://');
    }
    let baseUrl = API_CONFIG.BASE_URL;
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.replace('/api', '');
    }
    const imagePath = product.image_url.startsWith('/') ? product.image_url : `/${product.image_url}`;
    return `${baseUrl}${imagePath}`.replace('http://', 'https://');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Mahsulot topilmadi</Text>
      </View>
    );
  }

  const imageUrl = getImageUrl();
  const price = product.retail_price || product.regular_price || 0;
  const isOutOfStock = product.total_pieces !== undefined && product.total_pieces !== null && product.total_pieces <= 0;

  return (
    <ScrollView style={styles.container}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>📦</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.name}>{product.name}</Text>

        {product.barcode && (
          <Text style={styles.barcode}>Barcode: {product.barcode}</Text>
        )}

        <Text style={styles.price}>
          {price.toLocaleString('uz-UZ')} so'm
        </Text>

        {product.total_pieces !== undefined && product.total_pieces !== null && (
          <Text style={[styles.stockInfo, isOutOfStock && styles.stockInfoOutOfStock]}>
            {isOutOfStock ? 'Omborda yo\'q' : `Omborda: ${product.total_pieces} dona`}
          </Text>
        )}

        {/* Quantity Selector */}
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Miqdor:</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cart Quantity Indicator */}
        {cartQuantity > 0 && (
          <View style={styles.cartQuantityContainer}>
            <Text style={styles.cartQuantityText}>
              Savatchada: {cartQuantity} dona
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.addButton, isOutOfStock && styles.addButtonDisabled]}
          onPress={handleAddToCart}
          disabled={isOutOfStock}
        >
          <Text style={[styles.addButtonText, isOutOfStock && styles.addButtonTextDisabled]}>
            {isOutOfStock ? 'Omborda yo\'q' : 'Savatchaga qo\'shish'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 40,
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.borderLight,
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 64,
  },
  content: {
    backgroundColor: Colors.surface,
    padding: 20,
    marginTop: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 8,
  },
  barcode: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 12,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  stockInfo: {
    fontSize: 14,
    color: Colors.success,
    marginBottom: 20,
    fontWeight: '600',
  },
  stockInfoOutOfStock: {
    color: Colors.danger,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  quantityLabel: {
    fontSize: 16,
    color: Colors.textDark,
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  quantity: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    minWidth: 30,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: Colors.border,
  },
  addButtonText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: '600',
  },
  addButtonTextDisabled: {
    color: Colors.textLight,
  },
  cartQuantityContainer: {
    backgroundColor: Colors.primary + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  cartQuantityText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
