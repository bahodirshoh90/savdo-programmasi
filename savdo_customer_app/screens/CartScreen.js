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
} from 'react-native';
import Colors from '../constants/colors';
import { useCart } from '../context/CartContext';
import CartItem from '../components/CartItem';
import { createOrder } from '../services/orders';
import API_CONFIG from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CartScreen({ navigation }) {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getTotalAmount } = useCart();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Xatolik', 'Savatcha bo\'sh');
      return;
    }

    // Check if customer ID is available
    const customerId = await AsyncStorage.getItem('customer_id');
    if (!customerId) {
      Alert.alert('Xatolik', 'Mijoz ma\'lumotlari topilmadi. Iltimos, qayta login qiling.');
      return;
    }

    Alert.alert(
      'Buyurtma berish',
      `Jami: ${getTotalAmount().toLocaleString('uz-UZ')} so'm\n\nBuyurtmani tasdiqlaysizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Tasdiqlash',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const orderItems = cartItems.map(item => ({
                product_id: item.product.id,
                requested_quantity: item.quantity,
              }));

              const orderData = {
                items: orderItems,
              };

              console.log('Creating order with data:', orderData);
              const result = await createOrder(orderData);
              console.log('Order created:', result);
              
              Alert.alert(
                'Muvaffaqiyatli',
                'Buyurtma muvaffaqiyatli yaratildi!',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      clearCart();
                      if (navigation && navigation.navigate) {
                        navigation.navigate('Orders');
                      }
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Order creation error:', error);
              const errorMessage = error.response?.data?.detail || error.message || 'Buyurtma yaratishda xatolik';
              Alert.alert('Xatolik', errorMessage);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Savatcha bo'sh</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Products')}
        >
          <Text style={styles.browseButtonText}>Mahsulotlarni ko'rish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Jami:</Text>
          <Text style={styles.totalAmount}>
            {getTotalAmount().toLocaleString('uz-UZ')} so'm
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutButton, isSubmitting && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.checkoutButtonText}>Buyurtma berish</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.textLight,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  browseButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
    color: Colors.textDark,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  checkoutButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: '600',
  },
});
