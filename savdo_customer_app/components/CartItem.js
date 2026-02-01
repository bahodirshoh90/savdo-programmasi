/**
 * Cart Item Component
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Colors from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getProductPrice } from '../utils/pricing';

export default function CartItem({ item, onUpdateQuantity, onRemove, getImageUrl }) {
  const { user } = useAuth();
  const product = item.product;
  const price = getProductPrice(product, user?.customer_type);
  const subtotal = price * item.quantity;

  return (
    <View style={styles.container}>
      {getImageUrl && getImageUrl(product) ? (
        <Image
          source={{ uri: getImageUrl(product) }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>📦</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>
          {price.toLocaleString('uz-UZ')} so'm
        </Text>

        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdateQuantity(product.id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={20} color={Colors.primary} />
          </TouchableOpacity>

          <Text style={styles.quantity}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdateQuantity(product.id, item.quantity + 1)}
          >
            <Ionicons name="add" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtotal}>
          Jami: {subtotal.toLocaleString('uz-UZ')} so'm
        </Text>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(product.id)}
      >
        <Ionicons name="trash-outline" size={24} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.borderLight,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    minWidth: 30,
    textAlign: 'center',
  },
  subtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  removeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
});
