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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';
import StarRating from '../components/StarRating';
import { TextInput } from 'react-native';

export default function ProductDetailScreen({ route, navigation }) {
  const { productId, product: routeProduct } = route.params || {};
  const { addToCart, cartItems } = useCart();
  const [product, setProduct] = useState(routeProduct || null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
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
    if (currentProductId && !product && !routeProduct) {
      loadProduct();
    } else if (product || routeProduct) {
      checkFavoriteStatus();
    }
  }, [currentProductId, product, routeProduct]);

  const checkFavoriteStatus = async () => {
    const currentProduct = product || routeProduct;
    if (!currentProduct || !currentProduct.id) return;
    
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) return;

      const response = await fetch(
        `${API_ENDPOINTS.BASE_URL}/favorites/check/${currentProduct.id}`,
        {
          headers: {
            'X-Customer-ID': customerId,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setIsFavorite(data.is_favorite || false);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    const currentProduct = product || routeProduct;
    if (!currentProduct) return;

    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        Alert.alert('Xatolik', 'Foydalanuvchi ma\'lumotlari topilmadi');
        return;
      }

      if (isFavorite) {
        // Remove from favorites
        const response = await fetch(
          `${API_ENDPOINTS.BASE_URL}/favorites/${currentProduct.id}`,
          {
            method: 'DELETE',
            headers: {
              'X-Customer-ID': customerId,
            },
          }
        );

        if (response.ok) {
          setIsFavorite(false);
          Alert.alert('Muvaffaqiyatli', 'Sevimlilar ro\'yxatidan olib tashlandi');
        } else {
          throw new Error('Sevimlilar ro\'yxatidan olib tashlashda xatolik');
        }
      } else {
        // Add to favorites
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Customer-ID': customerId,
          },
          body: JSON.stringify({ product_id: currentProduct.id }),
        });

        if (response.ok) {
          setIsFavorite(true);
          Alert.alert('Muvaffaqiyatli', 'Sevimlilar ro\'yxatiga qo\'shildi');
        } else {
          throw new Error('Sevimlilar ro\'yxatiga qo\'shishda xatolik');
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Xatolik', error.message || 'Xatolik yuz berdi');
    }
  };

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

        {/* Rating Summary */}
        {ratingSummary && ratingSummary.total_reviews > 0 && (
          <View style={styles.ratingContainer}>
            <StarRating 
              rating={ratingSummary.average_rating} 
              size={18}
              showValue={true}
            />
            <Text style={styles.reviewCount}>
              ({ratingSummary.total_reviews} baholash)
            </Text>
          </View>
        )}

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

      {/* Reviews Section */}
      <View style={styles.reviewsSection}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.reviewsTitle}>Baholashlar va Sharhlar</Text>
          <TouchableOpacity
            style={styles.writeReviewButton}
            onPress={() => setShowReviewForm(!showReviewForm)}
          >
            <Text style={styles.writeReviewText}>
              {showReviewForm ? 'Bekor qilish' : 'Baholash yozish'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Review Form */}
        {showReviewForm && (
          <View style={styles.reviewForm}>
            <Text style={styles.reviewFormLabel}>Baholash:</Text>
            <StarRating
              rating={reviewRating}
              onRatingPress={setReviewRating}
              size={30}
            />
            <Text style={styles.reviewFormLabel}>Sharh:</Text>
            <TextInput
              style={styles.reviewInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Baholashingizni yozing..."
              multiline
              numberOfLines={4}
              placeholderTextColor={Colors.textLight}
            />
            <TouchableOpacity
              style={[styles.submitReviewButton, isSubmittingReview && styles.submitReviewButtonDisabled]}
              onPress={handleSubmitReview}
              disabled={isSubmittingReview}
            >
              {isSubmittingReview ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <Text style={styles.submitReviewText}>Yuborish</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Reviews List */}
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{review.customer_name}</Text>
                <View style={styles.reviewMeta}>
                  <StarRating rating={review.rating} size={14} />
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('uz-UZ')}
                  </Text>
                </View>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
              {review.is_verified_purchase && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.verifiedText}>Tasdiqlangan xarid</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.noReviewsText}>Hozircha baholashlar yo'q</Text>
        )}
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
  imageContainer: {
    position: 'relative',
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
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
