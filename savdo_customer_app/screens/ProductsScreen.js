/**
 * Products Screen for Customer App
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import { getProducts } from '../services/products';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import responsive from '../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';

export default function ProductsScreen({ navigation }) {
  const { addToCart, cartItems, removeFromCart, updateQuantity } = useCart();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(''); // 'name_asc', 'name_desc', 'price_asc', 'price_desc'
  const [filterBrand, setFilterBrand] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const PRODUCTS_PER_PAGE = 20; // Mahsulotlar bir sahifada

  const loadProducts = async (resetPage = false) => {
    const currentPage = resetPage ? 0 : page;
    const skip = currentPage * PRODUCTS_PER_PAGE;
    
    if (resetPage) {
      setIsLoading(true);
      setProducts([]);
      setPage(0);
      setHasMore(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      // Parse sort parameter for backend
      let sortParam = '';
      if (sortBy === 'name_asc') sortParam = 'name_asc';
      else if (sortBy === 'name_desc') sortParam = 'name_desc';
      else if (sortBy === 'price_asc') sortParam = 'price_low_asc';
      else if (sortBy === 'price_desc') sortParam = 'price_high_desc';
      
      const result = await getProducts(searchQuery, skip, PRODUCTS_PER_PAGE, filterBrand, '', sortParam);
      const newProducts = Array.isArray(result) ? result : [];
      
      if (resetPage) {
        setProducts(newProducts);
      } else {
        setProducts(prev => [...prev, ...newProducts]);
      }
      
      // Agar qaytgan mahsulotlar soni limitdan kam bo'lsa, boshqa sahifa yo'q
      setHasMore(newProducts.length === PRODUCTS_PER_PAGE);
      if (resetPage) {
        setPage(1); // Keyingi yuklash uchun page 1 ga o'rnatiladi
      } else {
        setPage(currentPage + 1);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      if (resetPage) {
        setProducts([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProducts(true); // Reset to first page when screen focused or filters change
    }, [searchQuery, sortBy, filterBrand])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProducts(true);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      loadProducts(false);
    }
  };

  const handleProductPress = (product) => {
    // Navigate within ProductsStack
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const handleAddToCart = (product, quantityChange = 1) => {
    if (quantityChange > 0) {
      addToCart(product, quantityChange);
    } else {
      // Remove or decrease quantity
      const currentItem = cartItems.find(item => item.product.id === product.id);
      if (currentItem) {
        if (currentItem.quantity <= 1) {
          // Remove from cart
          removeFromCart(product.id);
        } else {
          // Decrease quantity
          updateQuantity(product.id, currentItem.quantity - 1);
        }
      }
    }
  };

  const getCartQuantity = (productId) => {
    const item = cartItems.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  };

  // Responsive number of columns
  const numColumns = responsive.isTablet() ? 3 : 2;
  const itemWidth = responsive.isTablet() ? '32%' : '48%';

  const renderProduct = ({ item }) => (
    <View style={{ flex: 1, marginHorizontal: 4, maxWidth: itemWidth }}>
      <ProductCard
        product={item}
        onPress={handleProductPress}
        onAdd={handleAddToCart}
        quantity={getCartQuantity(item.id)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <TextInput
              style={[styles.searchInput, { flex: 1 }]}
              placeholder="Mahsulot qidirish..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  loadProducts(true);
                }}
                style={styles.clearSearchButton}
              >
                <Ionicons name="close-circle" size={20} color={Colors.textLight} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="search" size={20} color={Colors.textLight} style={styles.searchIcon} />
            )}
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={24} color={Colors.primary} />
            {(sortBy || filterBrand) && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>

        {/* Search History Dropdown */}
        {showSearchHistory && searchHistory.length > 0 && !searchQuery && (
          <View style={styles.searchHistoryContainer}>
            <View style={styles.searchHistoryHeader}>
              <Text style={styles.searchHistoryTitle}>So'nggi qidiruvlar</Text>
              <TouchableOpacity onPress={clearSearchHistory}>
                <Text style={styles.clearHistoryText}>Tozalash</Text>
              </TouchableOpacity>
            </View>
            {searchHistory.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyItem}
                onPress={() => handleHistoryItemPress(item.search_query)}
              >
                <Ionicons name="time-outline" size={18} color={Colors.textLight} />
                <Text style={styles.historyText}>{item.search_query}</Text>
                {item.result_count !== null && (
                  <Text style={styles.historyCount}>{item.result_count} ta</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {isLoading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.row : null}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingMoreText}>Yuklanmoqda...</Text>
              </View>
            ) : !hasMore && products.length > 0 ? (
              <View style={styles.endContainer}>
                <Text style={styles.endText}>Barcha mahsulotlar ko'rsatildi</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Mahsulot topilmadi' : 'Mahsulotlar topilmadi'}
              </Text>
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrlar va Tartiblash</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={Colors.textDark} />
              </TouchableOpacity>
            </View>

            {/* Sort */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Tartiblash</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={sortBy}
                  onValueChange={(value) => setSortBy(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Tartibsiz" value="" />
                  <Picker.Item label="Nomi (A-Z)" value="name_asc" />
                  <Picker.Item label="Nomi (Z-A)" value="name_desc" />
                  <Picker.Item label="Narx (Pastdan Yuqori)" value="price_asc" />
                  <Picker.Item label="Narx (Yuqoridan Past)" value="price_desc" />
                </Picker>
              </View>
            </View>

            {/* Brand Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Brend (Keyinchalik)</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Brend nomi..."
                value={filterBrand}
                onChangeText={setFilterBrand}
              />
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.clearButton]}
                onPress={() => {
                  setSortBy('');
                  setFilterBrand('');
                }}
              >
                <Text style={styles.clearButtonText}>Tozalash</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.applyButton]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Qo'llash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    padding: responsive.getSpacing(16),
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  searchIcon: {
    marginLeft: 8,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchHistoryContainer: {
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 200,
    overflow: 'hidden',
  },
  searchHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchHistoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  clearHistoryText: {
    fontSize: 12,
    color: Colors.primary,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  historyText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text,
  },
  historyCount: {
    fontSize: 12,
    color: Colors.textLight,
  },
  compareBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
  },
  compareBarText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.surface,
  },
  compareBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  clearCompareButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
  clearCompareText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  viewCompareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  viewCompareText: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.surface,
    fontWeight: '600',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.borderLight,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  picker: {
    height: 50,
    color: Colors.textDark,
  },
  filterInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  applyButton: {
    backgroundColor: Colors.primary,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'flex-start',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  loadingMoreContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textLight,
  },
  endContainer: {
    padding: 20,
    alignItems: 'center',
  },
  endText: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
});
