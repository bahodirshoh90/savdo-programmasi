/**
 * Favorites Screen - Sevimli mahsulotlar sahifasi
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import responsive from '../utils/responsive';

export default function FavoritesScreen({ navigation }) {
  const { colors } = useTheme();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteStatus, setFavoriteStatus] = useState({}); // product_id -> is_favorite

  useEffect(() => {
    loadFavorites();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        Alert.alert('Xatolik', 'Foydalanuvchi ma\'lumotlari topilmadi');
        setFavorites([]);
        setFavoriteStatus({});
        return;
      }

      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL 
        : `${API_ENDPOINTS.BASE_URL}/api`;
      
      const response = await fetch(`${baseUrl}/favorites`, {
        headers: {
          'X-Customer-ID': customerId,
        },
      });

      if (!response.ok) {
        throw new Error('Sevimli mahsulotlarni yuklashda xatolik');
      }

      const data = await response.json();
      const favoritesPayload = Array.isArray(data)
        ? data
        : (data.favorites || data.items || []);
      const normalizedFavorites = favoritesPayload
        .map(item => item?.product || item)
        .filter(Boolean);

      setFavorites(normalizedFavorites);
      
      // Build favorite status map
      const statusMap = {};
      normalizedFavorites.forEach(product => {
        const productId = product.id || product.product_id;
        if (productId) {
          statusMap[productId] = true;
        }
      });
      setFavoriteStatus(statusMap);
    } catch (error) {
      console.error('Error loading favorites:', error);
      Alert.alert('Xatolik', error.message || 'Sevimli mahsulotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleFavorite = async (product) => {
    try {
      const productId = product?.id || product?.product_id;
      if (!productId) {
        Alert.alert('Xatolik', 'Mahsulot ID topilmadi');
        return;
      }
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        Alert.alert('Xatolik', 'Foydalanuvchi ma\'lumotlari topilmadi');
        return;
      }

      const isFavorite = favoriteStatus[productId] || false;

      if (isFavorite) {
        // Remove from favorites
        const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
          ? API_ENDPOINTS.BASE_URL 
          : `${API_ENDPOINTS.BASE_URL}/api`;
        
        const response = await fetch(
          `${baseUrl}/favorites/${productId}`,
          {
            method: 'DELETE',
            headers: {
              'X-Customer-ID': customerId,
            },
          }
        );

        if (response.ok) {
          setFavorites(prev => prev.filter(fav => (fav.id || fav.product_id) !== productId));
          setFavoriteStatus(prev => ({ ...prev, [productId]: false }));
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Sevimlilar ro\'yxatidan olib tashlashda xatolik');
        }
      } else {
        // Add to favorites
        const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
          ? API_ENDPOINTS.BASE_URL 
          : `${API_ENDPOINTS.BASE_URL}/api`;
        
        const response = await fetch(`${baseUrl}/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Customer-ID': customerId,
          },
          body: JSON.stringify({ product_id: productId }),
        });

        if (response.ok) {
          await response.json().catch(() => ({}));
          if (!favorites.find(fav => (fav.id || fav.product_id) === productId)) {
            setFavorites([product, ...favorites]);
          }
          setFavoriteStatus(prev => ({ ...prev, [productId]: true }));
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Sevimlilar ro\'yxatiga qo\'shishda xatolik');
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Xatolik', error.message || 'Xatolik yuz berdi');
    }
  };


  const getImageUrl = (imageUrl) => {
    if (!imageUrl || !imageUrl.trim()) return null;
    
    if (imageUrl.startsWith('http')) {
      return imageUrl.replace('http://', 'https://');
    }
    
    const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
      ? API_ENDPOINTS.BASE_URL.replace('/api', '') 
      : API_ENDPOINTS.BASE_URL.replace('/api', '');
    
    const imagePath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${baseUrl}${imagePath}`.replace('http://', 'https://');
  };

  const renderProduct = ({ item }) => {
    const productId = item.id || item.product_id;
    const isFavorite = favoriteStatus[productId] || false;
    const imageUrl = getImageUrl(item.image_url);
    const price = item.retail_price || item.regular_price || item.wholesale_price || 0;
    const isOutOfStock = item.total_pieces !== undefined && item.total_pieces !== null && item.total_pieces <= 0;

    return (
      <View style={[styles.cardWrapper, { maxWidth: responsive.isTablet() ? '31%' : '48%' }]}>
        <TouchableOpacity
          style={[styles.productCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('ProductDetail', { product: item, productId })}
          activeOpacity={0.7}
        >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[styles.productImage, { backgroundColor: colors.background }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.productImagePlaceholder, { backgroundColor: colors.background }]}>
            <Ionicons name="cube-outline" size={40} color={colors.textLight} />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>

          {item.brand && (
            <Text style={[styles.productBrand, { color: colors.textLight }]} numberOfLines={1}>
              {item.brand}
            </Text>
          )}

          <View style={styles.productFooter}>
            <Text style={[styles.productPrice, { color: colors.primary }]}>
              {price.toLocaleString('uz-UZ')} so'm
            </Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                toggleFavorite(item);
              }}
              style={styles.favoriteButton}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? colors.danger : colors.textLight}
              />
            </TouchableOpacity>
          </View>

          {isOutOfStock && (
            <View style={[styles.outOfStockBadge, { backgroundColor: colors.danger + '20' }]}>
              <Text style={[styles.outOfStockText, { color: colors.danger }]}>Tugagan</Text>
            </View>
          )}
        </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textLight }]}>Yuklanmoqda...</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="heart-outline" size={80} color={colors.textLight} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sevimli mahsulotlar yo'q</Text>
          <Text style={[styles.emptyText, { color: colors.textLight }]}>
            Mahsulotlar sahifasidan sevimli mahsulotlarni qo'shing
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Products')}
          >
            <Text style={[styles.browseButtonText, { color: colors.surface }]}>Mahsulotlarni ko'rish</Text>
          </TouchableOpacity>
        </View>
        <Footer currentScreen="favorites" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Sevimli Mahsulotlar</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>
          {favorites.length} ta mahsulot
        </Text>
      </View>

      <FlatList
        data={favorites}
        renderItem={renderProduct}
        keyExtractor={(item, index) => ((item.id || item.product_id || index).toString())}
        numColumns={responsive.isTablet() ? 3 : 2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadFavorites();
            }}
            colors={[colors.primary]}
          />
        }
      />
      <Footer currentScreen="favorites" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: responsive.getFontSize(24),
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: responsive.getFontSize(14),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: responsive.getFontSize(16),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: responsive.getFontSize(20),
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: responsive.getFontSize(14),
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: responsive.getFontSize(16),
    fontWeight: '600',
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  cardWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  productCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: responsive.isSmallPhone() ? 130 : (responsive.isTablet() ? 200 : 150),
  },
  productImagePlaceholder: {
    width: '100%',
    height: responsive.isSmallPhone() ? 130 : (responsive.isTablet() ? 200 : 150),
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: responsive.getFontSize(14),
    fontWeight: '600',
    marginBottom: 4,
    minHeight: 36,
  },
  productBrand: {
    fontSize: responsive.getFontSize(12),
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: responsive.getFontSize(16),
    fontWeight: 'bold',
    flex: 1,
  },
  favoriteButton: {
    padding: 4,
  },
  outOfStockBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  outOfStockText: {
    fontSize: responsive.getFontSize(10),
    fontWeight: '600',
  },
});
