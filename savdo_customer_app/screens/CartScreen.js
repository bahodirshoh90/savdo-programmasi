/**
 * Cart Screen for Customer App
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Colors from '../constants/colors';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import CartItem from '../components/CartItem';
import { createOrder } from '../services/orders';
import API_CONFIG from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import Footer from '../components/Footer';

export default function CartScreen({ navigation }) {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getTotalAmount } = useCart();
  const { colors } = useTheme();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState('cash'); // 'cash', 'card', 'debt'
  const [showLocationModal, setShowLocationModal] = React.useState(false);
  const [selectedLocation, setSelectedLocation] = React.useState({
    address: null,
    latitude: null,
    longitude: null,
  });

  const getImageUrl = (product) => {
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

  // Extract order creation logic to a separate function
  const executeOrderCreation = async () => {
    const customerId = await AsyncStorage.getItem('customer_id');
    console.log('[CART] Starting order creation process...');
    setIsSubmitting(true);
            try {
              console.log('[CART] Step 1: Validating cart items...');
              // Ensure items are in correct format for backend
              const orderItems = cartItems
                .filter(item => {
                  const isValid = item.product && item.product.id && item.quantity && item.quantity > 0;
                  if (!isValid) {
                    console.warn('[CART] Invalid cart item filtered out:', item);
                  }
                  return isValid;
                })
                .map(item => {
                  const productId = parseInt(item.product.id, 10);
                  const quantity = parseInt(item.quantity, 10);
                  console.log(`[CART] Processing item: product_id=${productId}, quantity=${quantity}`);
                  return {
                    product_id: productId,
                    requested_quantity: quantity,
                  };
                })
                .filter(item => {
                  const isValid = item.product_id > 0 && item.requested_quantity > 0;
                  if (!isValid) {
                    console.warn('[CART] Item failed final validation:', item);
                  }
                  return isValid;
                });
              
              console.log('[CART] Step 2: Validated order items:', JSON.stringify(orderItems, null, 2));
              
              if (orderItems.length === 0) {
                console.error('[CART] No valid items found after validation');
        Alert.alert('Xatolik', 'Buyurtma uchun mahsulot topilmadi.');
      setIsSubmitting(false);
      return;
    }

    const orderData = {
      items: orderItems,
      payment_method: paymentMethod, // 'cash', 'card', 'debt' (olinadigan)
      delivery_address: selectedLocation.address,
      delivery_latitude: selectedLocation.latitude,
      delivery_longitude: selectedLocation.longitude,
    };

    console.log('[CART] Step 3: Order data prepared:', JSON.stringify(orderData, null, 2));
    console.log('[CART] Step 4: Customer ID from storage:', customerId);
    console.log('[CART] Step 5: Calling createOrder service...');
    
      const result = await createOrder(orderData);
      console.log('[CART] Step 6: Order created successfully!');
      console.log('[CART] Order result:', JSON.stringify(result, null, 2));
      
      // Clear cart immediately after successful order creation
      clearCart();
      console.log('[CART] Cart cleared after successful order');
      
      Alert.alert(
        'Muvaffaqiyatli',
        `Buyurtma muvaffaqiyatli yaratildi!\n\nBuyurtma raqami: #${result.id || 'N/A'}`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (navigation && navigation.navigate) {
                navigation.navigate('Orders');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('[CART] ===== ORDER CREATION FAILED =====');
      console.error('[CART] Error object:', error);
      console.error('[CART] Error message:', error.message);
      console.error('[CART] Error response:', error.response?.data);
      console.error('[CART] Error status:', error.response?.status);
      console.error('[CART] Error config URL:', error.config?.url);
      console.error('[CART] Error config method:', error.config?.method);
      
      // Show user-friendly error message
      let errorMessage = 'Buyurtma yaratishda xatolik yuz berdi.';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Xatolik', errorMessage);
    } finally {
    setIsSubmitting(false);
  }
  };

  const handleCheckout = async () => {
    console.log('[CART] handleCheckout called');
    console.log('[CART] Cart items:', cartItems.length);
    
    if (cartItems.length === 0) {
      Alert.alert('Xatolik', 'Savatcha bo\'sh');
      return;
    }

    // Check if customer ID is available
    const customerId = await AsyncStorage.getItem('customer_id');
    console.log('[CART] Customer ID from storage:', customerId);
    
    if (!customerId) {
      Alert.alert('Xatolik', 'Mijoz ma\'lumotlari topilmadi. Iltimos, qayta login qiling.');
      return;
    }

    // Validate cart items
    const invalidItems = cartItems.filter(item => !item.product || !item.product.id || !item.quantity || item.quantity <= 0);
    if (invalidItems.length > 0) {
      Alert.alert('Xatolik', 'Savatchada noto\'g\'ri mahsulotlar mavjud. Iltimos, savatni tekshiring.');
      return;
    }

    console.log('[CART] Showing confirmation alert');
    console.log('[CART] Total amount:', getTotalAmount());
    console.log('[CART] Cart items for order:', JSON.stringify(cartItems.map(item => ({
      product_id: item.product?.id,
      quantity: item.quantity,
      product_name: item.product?.name
    })), null, 2));
    
    // Use window.confirm on web for better compatibility
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Jami: ${getTotalAmount().toLocaleString('uz-UZ')} so'm\n\nBuyurtmani tasdiqlaysizmi?`
      );
      if (confirmed) {
        console.log('[CART] User confirmed via window.confirm');
        await executeOrderCreation();
      } else {
        console.log('[CART] Order cancelled by user (web)');
      }
    } else {
      // Use Alert.alert on native platforms
      Alert.alert(
        'Buyurtma berish',
        `Jami: ${getTotalAmount().toLocaleString('uz-UZ')} so'm\n\nBuyurtmani tasdiqlaysizmi?`,
        [
          { 
            text: 'Bekor qilish', 
            style: 'cancel', 
            onPress: () => {
              console.log('[CART] Order cancelled by user');
              setIsSubmitting(false);
            }
          },
          {
            text: 'Tasdiqlash',
            onPress: () => executeOrderCreation(),
          },
        ]
      );
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.emptyText, { color: colors.text }]}>Savatcha bo'sh</Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Products')}
          >
            <Text style={[styles.browseButtonText, { color: Colors.surface }]}>Mahsulotlarni ko'rish</Text>
          </TouchableOpacity>
        </View>
        <Footer currentScreen="cart" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, { paddingBottom: 300 }]}
      >
        {cartItems.map((item) => (
          <CartItem
            key={item.product.id}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            getImageUrl={getImageUrl}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {/* Location Selection */}
        <View style={[styles.locationContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.locationLabel, { color: colors.text }]}>Yetkazib berish manzili:</Text>
          <TouchableOpacity
            style={[styles.locationButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowLocationModal(true)}
          >
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={[styles.locationText, { color: selectedLocation.address ? colors.text : colors.textLight }]}>
              {selectedLocation.address || 'Xaritadan joyni tanlang'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
          {selectedLocation.address && (
            <TouchableOpacity
              style={styles.clearLocationButton}
              onPress={() => setSelectedLocation({ address: null, latitude: null, longitude: null })}
            >
              <Ionicons name="close-circle" size={18} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Method Selection */}
        <View style={[styles.paymentMethodContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.paymentMethodLabel, { color: colors.text }]}>To'lov usuli:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={paymentMethod}
              onValueChange={(value) => {
                console.log('[CART] Payment method changed to:', value);
                setPaymentMethod(value);
              }}
              style={[styles.picker, { color: colors.text }]}
              dropdownIconColor={colors.primary}
            >
              <Picker.Item label="Naqd" value="cash" />
              <Picker.Item label="Plastik karta" value="card" />
              <Picker.Item label="Olinadigan (qarz)" value="debt" />
            </Picker>
          </View>
        </View>

        <View style={styles.totalContainer}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>Jami:</Text>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>
            {getTotalAmount().toLocaleString('uz-UZ')} so'm
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutButton, { backgroundColor: colors.primary }, isSubmitting && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={[styles.checkoutButtonText, { color: colors.surface }]}>Buyurtma berish</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Yetkazib berish manzili</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.locationModalContent}>
              <Text style={[styles.locationModalText, { color: colors.text }]}>
                Xaritadan joyni tanlash funksiyasi tez orada qo'shiladi.
              </Text>
              <Text style={[styles.locationModalSubtext, { color: colors.textLight }]}>
                Hozircha manzilni qo'lda kiriting:
              </Text>

              <TextInput
                style={[styles.addressInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Manzilni kiriting (masalan: Toshkent shahar, Chilonzor tumani, ...)"
                placeholderTextColor={colors.textLight}
                value={selectedLocation.address || ''}
                onChangeText={(text) => setSelectedLocation({ ...selectedLocation, address: text })}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.getCurrentLocationButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert('Ruxsat kerak', 'Joylashuv ruxsatini bering');
                      return;
                    }

                    const location = await Location.getCurrentPositionAsync({});
                    const { latitude, longitude } = location.coords;

                    // Use coordinates directly (Geocoding API removed in SDK 49)
                    // User can manually enter address or we can use coordinates
                    const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                    
                    setSelectedLocation({
                      address: address,
                      latitude,
                      longitude,
                    });
                    Alert.alert('Muvaffaqiyatli', 'Joylashuv aniqlandi. Iltimos, manzilni qo\'lda kiriting.');
                  } catch (error) {
                    console.error('Error getting location:', error);
                    Alert.alert('Xatolik', 'Joylashuvni aniqlashda xatolik');
                  }
                }}
              >
                <Ionicons name="locate" size={20} color={Colors.surface} />
                <Text style={[styles.getCurrentLocationText, { color: Colors.surface }]}>
                  Joriy joylashuvni olish
                </Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setShowLocationModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>Bekor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    if (selectedLocation.address) {
                      setShowLocationModal(false);
                    } else {
                      Alert.alert('Xatolik', 'Manzilni kiriting');
                    }
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: Colors.surface }]}>Saqlash</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Footer currentScreen="cart" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingBottom: 100, // Add padding to avoid footer overlap
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 20,
  },
  browseButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    position: 'relative',
    zIndex: 10,
    backgroundColor: Colors.surface,
  },
  paymentMethodContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  checkoutButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  locationContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
  },
  clearLocationButton: {
    marginLeft: 8,
    padding: 4,
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
  locationModalContent: {
    gap: 16,
  },
  locationModalText: {
    fontSize: 16,
    textAlign: 'center',
  },
  locationModalSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  addressInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  getCurrentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  getCurrentLocationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
});
