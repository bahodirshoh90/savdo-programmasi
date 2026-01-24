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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';
import Colors from '../constants/colors';
import Footer from '../components/Footer';

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteStatus, setFavoriteStatus] = useState({}); // product_id -> is_favorite

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        Alert.alert('Xatolik', 'Foydalanuvchi ma\'lumotlari topilmadi');
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
      setFavorites(data.favorites || []);
      
      // Build favorite status map
      const statusMap = {};
      data.favorites.forEach(product => {
        statusMap[product.id] = true;
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
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        Alert.alert('Xatolik', 'Foydalanuvchi ma\'lumotlari topilmadi');
        return;
      }

      const isFavorite = favoriteStatus[product.id] || false;

      if (isFavorite) {
        // Remove from favorites
        const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
          ? API_ENDPOINTS.BASE_URL 
          : `${API_ENDPOINTS.BASE_URL}/api`;
        
        const response = await fetch(
          `${baseUrl}/favorites/${product.id}`,
          {
            method: 'DELETE',
            headers: {
              'X-Customer-ID': customerId,
            },
          }
        );

        if (response.ok) {
          setFavorites(prev => prev.filter(fav => fav.id !== product.id));
          setFavoriteStatus(prev => ({ ...prev, [product.id]: false }));
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
          body: JSON.stringify({ product_id: product.id }),
        });

        if (response.ok) {
          const data = await response.json();
          if (!favorites.find(fav => fav.id === product.id)) {
            setFavorites([product, ...favorites]);
          }
          setFavoriteStatus(prev => ({ ...prev, [product.id]: true }));
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
    const isFavorite = favoriteStatus[item.id] || false;
    const imageUrl = getImageUrl(item.image_url);
    const price = item.retail_price || item.regular_price || item.wholesale_price || 0;
    const isOutOfStock = item.total_pieces !== undefined && item.total_pieces !== null && item.total_pieces <= 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { product: item, productId: item.id })}
        activeOpacity={0.7}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="cube-outline" size={40} color={Colors.textLight} />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>

          {item.brand && (
            <Text style={styles.productBrand} numberOfLines={1}>
              {item.brand}
            </Text>
          )}

          <View style={styles.productFooter}>
            <Text style={styles.productPrice}>
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
                color={isFavorite ? '#ff3b30' : Colors.textLight}
              />
            </TouchableOpacity>
          </View>

          {isOutOfStock && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Tugagan</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Yuklanmoqda...</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>Sevimli mahsulotlar yo'q</Text>
          <Text style={styles.emptyText}>
            Mahsulotlar sahifasidan sevimli mahsulotlarni qo'shing
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('Products')}
          >
            <Text style={styles.browseButtonText}>Mahsulotlarni ko'rish</Text>
          </TouchableOpacity>
        </View>
        <Footer currentScreen="favorites" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sevimli Mahsulotlar</Text>
        <Text style={styles.headerSubtitle}>
          {favorites.length} ta mahsulot
        </Text>
      </View>

      <FlatList
        data={favorites}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadFavorites();
            }}
            colors={[Colors.primary]}
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
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.background,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  productCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.background,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    minHeight: 36,
  },
  productBrand: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    flex: 1,
  },
  favoriteButton: {
    padding: 4,
  },
  outOfStockBadge: {
    marginTop: 8,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  outOfStockText: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: '600',
  },
});
