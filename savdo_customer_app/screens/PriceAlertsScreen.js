/**
 * Price Alerts Screen - Narx eslatmalari sahifasi
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';
import Colors from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import Footer from '../components/Footer';

export default function PriceAlertsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(route?.params?.product || null);
  const [targetPrice, setTargetPrice] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
      // Check if product was passed from navigation
      if (route?.params?.product) {
        setSelectedProduct(route.params.product);
        setShowAddModal(true);
      }
    }, [route?.params?.product])
  );

  const loadAlerts = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        setIsLoading(false);
        return;
      }

      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL 
        : `${API_ENDPOINTS.BASE_URL}/api`;
      
      const response = await fetch(`${baseUrl}/price-alerts`, {
        headers: {
          'X-Customer-ID': customerId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data || []);
      }
    } catch (error) {
      console.error('Error loading price alerts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleAddAlert = async () => {
    if (!selectedProduct) {
      Alert.alert('Xatolik', 'Mahsulot tanlang');
      return;
    }

    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Xatolik', 'To\'g\'ri narx kiriting');
      return;
    }

    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        Alert.alert('Xatolik', 'Foydalanuvchi ma\'lumotlari topilmadi');
        return;
      }

      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL 
        : `${API_ENDPOINTS.BASE_URL}/api`;
      
      const response = await fetch(`${baseUrl}/price-alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Customer-ID': customerId,
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          target_price: price,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert('Muvaffaqiyatli', 'Narx eslatmasi qo\'shildi');
        setShowAddModal(false);
        setSelectedProduct(null);
        setTargetPrice('');
        await loadAlerts();
      } else {
        let errorMessage = 'Eslatma qo\'shishda xatolik';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        Alert.alert('Xatolik', errorMessage);
      }
    } catch (error) {
      console.error('Error adding price alert:', error);
      const errorMessage = error.message || 'Eslatma qo\'shishda xatolik';
      Alert.alert('Xatolik', errorMessage);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) return;

      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL 
        : `${API_ENDPOINTS.BASE_URL}/api`;
      
      const response = await fetch(`${baseUrl}/price-alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'X-Customer-ID': customerId,
        },
      });

      if (response.ok) {
        Alert.alert('Muvaffaqiyatli', 'Eslatma o\'chirildi');
        await loadAlerts();
      }
    } catch (error) {
      console.error('Error deleting price alert:', error);
      Alert.alert('Xatolik', 'Eslatmani o\'chirishda xatolik');
    }
  };

  const handleToggleAlert = async (alert) => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) return;

      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL 
        : `${API_ENDPOINTS.BASE_URL}/api`;
      
      const response = await fetch(`${baseUrl}/price-alerts/${alert.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Customer-ID': customerId,
        },
        body: JSON.stringify({
          is_active: !alert.is_active,
        }),
      });

      if (response.ok) {
        await loadAlerts();
      }
    } catch (error) {
      console.error('Error toggling price alert:', error);
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

  const renderAlert = ({ item }) => {
    const imageUrl = getImageUrl(item.product_image_url);
    const priceDiff = item.current_price - item.target_price;
    const isPriceReached = item.current_price <= item.target_price;

    return (
      <View style={[styles.alertCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductDetail', { productId: item.product_id })}
          style={styles.alertContent}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={[styles.productImagePlaceholder, { backgroundColor: colors.background }]}>
              <Ionicons name="cube-outline" size={30} color={colors.textLight} />
            </View>
          )}
          
          <View style={styles.alertInfo}>
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
              {item.product_name}
            </Text>
            
            <View style={styles.priceRow}>
              <View>
                <Text style={[styles.priceLabel, { color: colors.textLight }]}>Joriy narx:</Text>
                <Text style={[styles.currentPrice, { color: colors.text }]}>
                  {item.current_price?.toLocaleString('uz-UZ')} so'm
                </Text>
              </View>
              <View style={styles.targetPriceContainer}>
                <Text style={[styles.priceLabel, { color: colors.textLight }]}>Maqsadli narx:</Text>
                <Text style={[styles.targetPrice, { color: colors.primary }]}>
                  {item.target_price?.toLocaleString('uz-UZ')} so'm
                </Text>
              </View>
            </View>

            {isPriceReached && item.is_active && (
              <View style={styles.reachedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.reachedText}>Narx yetdi!</Text>
              </View>
            )}

            {!isPriceReached && item.is_active && (
              <Text style={[styles.diffText, { color: colors.textLight }]}>
                {priceDiff > 0 ? `${priceDiff.toLocaleString('uz-UZ')} so'm qoldi` : 'Narx tushdi'}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.alertActions}>
          <TouchableOpacity
            style={[styles.toggleButton, item.is_active ? styles.activeButton : styles.inactiveButton]}
            onPress={() => handleToggleAlert(item)}
          >
            <Ionicons 
              name={item.is_active ? 'notifications' : 'notifications-off'} 
              size={18} 
              color={item.is_active ? Colors.success : colors.textLight} 
            />
            <Text style={[styles.toggleText, { color: item.is_active ? Colors.success : colors.textLight }]}>
              {item.is_active ? 'Faol' : 'Nofaol'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert(
                'Eslatmani o\'chirish',
                'Bu eslatmani o\'chirmoqchimisiz?',
                [
                  { text: 'Bekor qilish', style: 'cancel' },
                  { text: 'O\'chirish', style: 'destructive', onPress: () => handleDeleteAlert(item.id) },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Narx Eslatmalari</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            // Show add modal or navigate to product selection
            if (route?.params?.product) {
              setSelectedProduct(route.params.product);
              setShowAddModal(true);
            } else {
              // Navigate to Products tab first, then to product selection
              navigation.navigate('MainTabs', { 
                screen: 'Products',
                params: { selectForPriceAlert: true }
              });
            }
          }}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={80} color={colors.textLight} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Eslatmalar yo'q</Text>
          <Text style={[styles.emptyText, { color: colors.textLight }]}>
            Mahsulotlar sahifasidan narx eslatmasi qo'shing
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              // Navigate to Products tab first, then to product selection
              navigation.navigate('MainTabs', { 
                screen: 'Products',
                params: { selectForPriceAlert: true }
              });
            }}
          >
            <Text style={styles.browseButtonText}>Mahsulotlarni ko'rish</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={alerts}
          renderItem={renderAlert}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                loadAlerts();
              }}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* Add Alert Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setSelectedProduct(null);
          setTargetPrice('');
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Narx Eslatmasi Qo'shish</Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                setSelectedProduct(null);
                setTargetPrice('');
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedProduct ? (
              <>
                <View style={[styles.productInfo, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.productName, { color: colors.text }]}>{selectedProduct.name}</Text>
                  <Text style={[styles.productPrice, { color: colors.primary }]}>
                    Joriy narx: {(selectedProduct.retail_price || selectedProduct.regular_price || 0).toLocaleString('uz-UZ')} so'm
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Maqsadli narx (so'm):</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="Narxni kiriting"
                    value={targetPrice}
                    onChangeText={setTargetPrice}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => {
                      setShowAddModal(false);
                      setSelectedProduct(null);
                      setTargetPrice('');
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Bekor</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={handleAddAlert}
                  >
                    <Text style={[styles.modalButtonText, { color: Colors.surface }]}>Qo'shish</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.emptyModalContent}>
                <Text style={[styles.emptyModalText, { color: colors.text }]}>
                  Mahsulot tanlang
                </Text>
                <TouchableOpacity
                  style={[styles.browseButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setShowAddModal(false);
                    navigation.navigate('MainTabs', { 
                      screen: 'Products',
                      params: { selectForPriceAlert: true }
                    });
                  }}
                >
                  <Text style={styles.browseButtonText}>Mahsulotlarni ko'rish</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Footer currentScreen="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
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
    padding: 16,
  },
  alertCard: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  alertContent: {
    flexDirection: 'row',
    padding: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  targetPriceContainer: {
    alignItems: 'flex-end',
  },
  targetPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  reachedText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
    marginLeft: 4,
  },
  diffText: {
    fontSize: 12,
    marginTop: 4,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  activeButton: {
    backgroundColor: Colors.success + '20',
  },
  inactiveButton: {
    backgroundColor: Colors.background,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  productInfo: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    // backgroundColor set inline
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyModalContent: {
    alignItems: 'center',
    padding: 20,
  },
  emptyModalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
});
