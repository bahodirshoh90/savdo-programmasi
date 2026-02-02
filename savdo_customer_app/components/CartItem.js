/**
 * Cart Item Component
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import responsive from '../utils/responsive';

export default function CartItem({ item, onUpdateQuantity, onRemove, getImageUrl }) {
  const { colors } = useTheme();
  const product = item.product;
  const price = product.retail_price || product.regular_price || 0;
  const subtotal = price * item.quantity;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {getImageUrl && getImageUrl(product) ? (
        <Image
          source={{ uri: getImageUrl(product) }}
          style={[styles.image, { backgroundColor: colors.borderLight }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.borderLight }]}>
          <Text style={styles.imagePlaceholderText}>📦</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.price, { color: colors.textLight }]}>
          {price.toLocaleString('uz-UZ')} so'm
        </Text>

        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={[styles.quantityButton, { borderColor: colors.border, backgroundColor: colors.borderLight }]}
            onPress={() => onUpdateQuantity(product.id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={20} color={colors.primary} />
          </TouchableOpacity>

          <Text style={[styles.quantity, { color: colors.text }]}>{item.quantity}</Text>

          <TouchableOpacity
            style={[styles.quantityButton, { borderColor: colors.border, backgroundColor: colors.borderLight }]}
            onPress={() => onUpdateQuantity(product.id, item.quantity + 1)}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.subtotal, { color: colors.primary }]}>
          Jami: {subtotal.toLocaleString('uz-UZ')} so'm
        </Text>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(product.id)}
      >
        <Ionicons name="trash-outline" size={24} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: responsive.getSpacing(12),
    borderWidth: 1,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: responsive.getFontSize(32),
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: responsive.getFontSize(16),
    fontWeight: '600',
    marginBottom: 4,
  },
  price: {
    fontSize: responsive.getFontSize(14),
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  quantity: {
    fontSize: responsive.getFontSize(16),
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  subtotal: {
    fontSize: responsive.getFontSize(16),
    fontWeight: 'bold',
  },
  removeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
});
