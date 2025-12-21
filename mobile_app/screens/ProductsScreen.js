/**
 * Products Screen
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../constants/colors';
import { getProducts } from '../services/products';
import ProductCard from '../components/ProductCard';

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const PRODUCTS_PER_PAGE = 20;

  const loadProducts = async (page = 1) => {
    setIsLoading(true);
    try {
      const skip = (page - 1) * PRODUCTS_PER_PAGE;
      const hasActiveFilters = searchQuery || brandFilter || supplierFilter || locationFilter;
      
      // If searching or filtering, get all results (no pagination)
      // If not searching, get paginated results
      const result = await getProducts(
        searchQuery || '', 
        hasActiveFilters ? 0 : skip, 
        hasActiveFilters ? 1000 : PRODUCTS_PER_PAGE,
        brandFilter || '',
        supplierFilter || '',
        locationFilter || ''
      );
      
      // Ensure result is an array
      const data = Array.isArray(result) ? result : (result?.products || result?.data || []);
      
      console.log('Products loaded:', {
        resultType: typeof result,
        isArray: Array.isArray(result),
        dataLength: Array.isArray(data) ? data.length : 0,
        hasActiveFilters,
        page,
        skip
      });
      
      if (!Array.isArray(data)) {
        console.error('Products data is not an array:', result);
        setProducts([]);
        setDisplayedProducts([]);
        return;
      }
      
      if (hasActiveFilters) {
        // Filter mode: show all results
        setProducts(data);
        setDisplayedProducts(data);
        setHasMore(false);
        setTotalProducts(data.length);
        setCurrentPage(1);
      } else {
        // Normal mode: pagination
        setProducts(data);
        setDisplayedProducts(data);
        setHasMore(data.length === PRODUCTS_PER_PAGE);
        setCurrentPage(page);
        // Update total count if needed
        if (data.length > 0) {
          setTotalProducts((page - 1) * PRODUCTS_PER_PAGE + data.length);
        } else {
          setTotalProducts(0);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
      console.log('Error details:', {
        message: error.message,
        code: error.code,
        useCache: error.useCache,
        response: error.response
      });
      
      // Products service should return cached data on error, but if it throws here,
      // it means the error wasn't properly handled or cache is empty
      // Try to get products one more time - service might return cached data
      try {
        const fallbackResult = await getProducts(
          searchQuery || '',
          (page - 1) * PRODUCTS_PER_PAGE,
          PRODUCTS_PER_PAGE,
          brandFilter || '',
          supplierFilter || '',
          locationFilter || ''
        );
        const fallbackData = Array.isArray(fallbackResult) ? fallbackResult : (fallbackResult?.products || fallbackResult?.data || []);
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
          console.log('Using fallback/cached products:', fallbackData.length);
          setProducts(fallbackData);
          setDisplayedProducts(fallbackData);
          setHasMore(fallbackData.length === PRODUCTS_PER_PAGE);
          setCurrentPage(page);
          return;
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
      
      // Don't show alert if it's just an API error - use cached data silently
      // Only show alert for critical errors (not API HTML errors)
      if (error.message && !error.message.includes('API returned HTML') && !error.useCache) {
        Alert.alert('Xatolik', `Mahsulotlarni yuklashda xatolik: ${error.message || 'Noma\'lum xatolik'}`);
      }
      
      // If we get here, both API and cache failed - show empty state
      setProducts([]);
      setDisplayedProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProducts(1);
    }, [])
  );

  useEffect(() => {
    // When any filter changes, reset to page 1
    setCurrentPage(1);
    loadProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, brandFilter, supplierFilter, locationFilter]);

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const handleBrandFilter = (text) => {
    setBrandFilter(text);
  };

  const handleSupplierFilter = (text) => {
    setSupplierFilter(text);
  };

  const handleLocationFilter = (text) => {
    setLocationFilter(text);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setBrandFilter('');
    setSupplierFilter('');
    setLocationFilter('');
  };

  const loadNextPage = () => {
    const hasActiveFilters = searchQuery || brandFilter || supplierFilter || locationFilter;
    if (!hasActiveFilters && hasMore && !isLoading) {
      loadProducts(currentPage + 1);
    }
  };

  const loadPrevPage = () => {
    if (!searchQuery && currentPage > 1 && !isLoading) {
      loadProducts(currentPage - 1);
    }
  };

  const renderProduct = ({ item, index }) => {
    // For 2-column layout, add margin to create spacing
    const marginHorizontal = 4;
    return (
      <View style={{ flex: 1, marginHorizontal, maxWidth: '48%' }}>
        <ProductCard 
          product={item} 
          style={{ flex: 1, width: '100%' }}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Mahsulot qidirish..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.filtersRow}>
          <TextInput
            style={styles.filterInput}
            placeholder="Brend..."
            value={brandFilter}
            onChangeText={handleBrandFilter}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.filterInput}
            placeholder="Yetkazib beruvchi..."
            value={supplierFilter}
            onChangeText={handleSupplierFilter}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.filterInput}
            placeholder="Joylashuv..."
            value={locationFilter}
            onChangeText={handleLocationFilter}
            autoCapitalize="none"
          />
        </View>
        {(searchQuery || brandFilter || supplierFilter || locationFilter) && (
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Filterni tozalash</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Products List */}
      {isLoading && displayedProducts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <>
          <FlatList
            data={displayedProducts}
            renderItem={renderProduct}
            keyExtractor={(item, index) => (item?.id?.toString() || `product-${index}`)}
            contentContainerStyle={styles.listContent}
            numColumns={2}
            columnWrapperStyle={styles.row}
            refreshControl={
              <RefreshControl
                refreshing={isLoading && displayedProducts.length > 0}
                onRefresh={() => loadProducts(currentPage, searchQuery)}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {(searchQuery || brandFilter || supplierFilter || locationFilter) 
                    ? 'Mahsulot topilmadi' 
                    : 'Mahsulotlar topilmadi'}
                </Text>
              </View>
            }
            ListFooterComponent={
              !(searchQuery || brandFilter || supplierFilter || locationFilter) && displayedProducts.length > 0 ? (
                <View style={styles.paginationContainer}>
                  <View style={styles.paginationInfo}>
                    <Text style={styles.paginationText}>
                      Sahifa {currentPage} {totalProducts > 0 && `(${totalProducts}+ ta mahsulot)`}
                    </Text>
                  </View>
                  <View style={styles.paginationButtons}>
                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        currentPage === 1 && styles.paginationButtonDisabled,
                      ]}
                      onPress={loadPrevPage}
                      disabled={currentPage === 1 || isLoading}
                    >
                      <Text
                        style={[
                          styles.paginationButtonText,
                          currentPage === 1 && styles.paginationButtonTextDisabled,
                        ]}
                      >
                        ← Oldingi
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        !hasMore && styles.paginationButtonDisabled,
                      ]}
                      onPress={loadNextPage}
                      disabled={!hasMore || isLoading}
                    >
                      <Text
                        style={[
                          styles.paginationButtonText,
                          !hasMore && styles.paginationButtonTextDisabled,
                        ]}
                      >
                        Keyingi →
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  filterInput: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearFiltersButton: {
    marginTop: 8,
    padding: 10,
    backgroundColor: Colors.danger || '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 8,
    paddingBottom: 16,
  },
  row: {
    justifyContent: 'flex-start',
    paddingHorizontal: 0,
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
  paginationContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  paginationInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  paginationText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  paginationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  paginationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
  paginationButtonTextDisabled: {
    color: Colors.textLight,
  },
});

