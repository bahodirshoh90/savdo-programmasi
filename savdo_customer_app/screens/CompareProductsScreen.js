/**
 * Compare Products Screen - Mahsulotlarni taqqoslash sahifasi
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { API_ENDPOINTS } from '../config/api';
import API_CONFIG from '../config/api';
import StarRating from '../components/StarRating';
import Footer, { FooterAwareView } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getProductPrice } from '../utils/pricing';

export default function CompareProductsScreen({ route, navigation }) {
  const { productIds } = route.params || { productIds: [] };
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, [productIds]);

  const loadProducts = async () => {
    if (!productIds || productIds.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const productPromises = productIds.map(id =>
        fetch(`${API_ENDPOINTS.BASE_URL}/products/${id}`)
          .then(res => res.json())
          .catch(() => null)
      );

      const results = await Promise.all(productPromises);
      const validProducts = results.filter(p => p !== null);
      setProducts(validProducts);
    } catch (error) {
      console.error('Error loading products for comparison:', error);
      Alert.alert('Xatolik', 'Mahsulotlarni yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) {
      return imageUrl.replace('http://', 'https://');
    }
    let baseUrl = API_CONFIG.BASE_URL;
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.replace('/api', '');
    }
    const imagePath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${baseUrl}${imagePath}`.replace('http://', 'https://');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const removeProduct = (productId) => {
    const newProducts = products.filter(p => p.id !== productId);
    setProducts(newProducts);
    
    if (newProducts.length === 0) {
      navigation.goBack();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Yuklanmoqda...</Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="git-compare-outline" size={80} color={Colors.textLight} />
        <Text style={styles.emptyTitle}>Taqqoslash uchun mahsulotlar yo'q</Text>
        <Text style={styles.emptyText}>
          Mahsulotlar sahifasidan taqqoslash uchun mahsulotlarni tanlang
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Products')}
        >
          <Text style={styles.browseButtonText}>Mahsulotlarni ko'rish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Comparison fields
  const comparisonFields = [
    { key: 'name', label: 'Nomi', type: 'text' },
    { key: 'brand', label: 'Brend', type: 'text' },
    { key: 'category', label: 'Kategoriya', type: 'text' },
    { key: 'price', label: 'Narx', type: 'price' },
    { key: 'total_pieces', label: 'Omborda', type: 'stock' },
  ];

  return (
    <FooterAwareView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mahsulotlarni Taqqoslash</Text>
          <View style={{ width: 24 }} />
        </View>

      {/* Products Grid */}
      <View style={styles.productsContainer}>
        {products.map((product, index) => {
          const imageUrl = getImageUrl(product.image_url);
          
          return (
            <View key={product.id} style={styles.productColumn}>
              {/* Product Image */}
              <View style={styles.productImageContainer}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Ionicons name="cube-outline" size={40} color={Colors.textLight} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeProduct(product.id)}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.danger} />
                </TouchableOpacity>
              </View>

              {/* Product Name */}
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>

              {/* Comparison Fields */}
              {comparisonFields.map((field) => {
                let value = product[field.key];
                let displayValue = '-';

                if (field.type === 'price') {
                  value = getProductPrice(product, user?.customer_type);
                }

                if (field.type === 'price' && value) {
                  displayValue = formatPrice(value);
                } else if (field.type === 'stock' && value !== undefined) {
                  displayValue = `${value} dona`;
                } else if (field.type === 'text' && value) {
                  displayValue = value;
                }

                return (
                  <View key={field.key} style={styles.comparisonRow}>
                    <Text style={styles.comparisonLabel}>{field.label}:</Text>
                    <Text style={styles.comparisonValue}>{displayValue}</Text>
                  </View>
                );
              })}

              {/* View Details Button */}
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              >
                <Text style={styles.viewDetailsText}>Batafsil</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Add More Products */}
      {products.length < 3 && (
        <TouchableOpacity
          style={styles.addProductButton}
          onPress={() => navigation.navigate('Products', { compareMode: true, selectedIds: products.map(p => p.id) })}
        >
          <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
          <Text style={styles.addProductText}>Yana mahsulot qo'shish</Text>
        </TouchableOpacity>
      )}
      </ScrollView>
      <Footer currentScreen="products" />
    </FooterAwareView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  productsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  productColumn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    minHeight: 36,
  },
  comparisonRow: {
    marginBottom: 8,
  },
  comparisonLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
  },
  comparisonValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  viewDetailsButton: {
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  addProductText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});
