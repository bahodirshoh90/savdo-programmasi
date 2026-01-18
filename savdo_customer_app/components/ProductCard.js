/**
 * Product Card Component for Customer App
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Colors from '../constants/colors';
import API_CONFIG from '../config/api';

export default function ProductCard({ product, onPress, onAdd, quantity = 0, style }) {
  if (!product) return null;

  const displayPrice = product.retail_price || product.regular_price || 0;
  const isOutOfStock = product.total_pieces !== undefined && product.total_pieces !== null && product.total_pieces <= 0;
  const isInCart = quantity > 0;

  const getImageUrl = () => {
    if (!product.image_url) return null;
    
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

  const imageUrl = getImageUrl();

  return (
    <TouchableOpacity
      style={[styles.card, isInCart && styles.cardInCart, isOutOfStock && styles.cardOutOfStock, style]}
      onPress={() => onPress && onPress(product)}
      activeOpacity={0.7}
    >
      {isInCart && (
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityBadgeText}>{quantity}</Text>
        </View>
      )}
      
      {isOutOfStock && (
        <View style={styles.outOfStockBadge}>
          <Text style={styles.outOfStockBadgeText}>Yo'q</Text>
        </View>
      )}

      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
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
          {displayPrice.toLocaleString('uz-UZ')} so'm
        </Text>

        {product.total_pieces !== undefined && product.total_pieces !== null && (
          <Text style={[styles.stockInfo, isOutOfStock && styles.stockInfoOutOfStock]}>
            {isOutOfStock ? 'Omborda yo\'q' : `Omborda: ${product.total_pieces} dona`}
          </Text>
        )}

        {onAdd && !onPress && (
          <TouchableOpacity
            style={[styles.addButton, isOutOfStock && styles.addButtonDisabled]}
            onPress={() => !isOutOfStock && onAdd(product)}
            disabled={isOutOfStock}
          >
            <Text style={[styles.addButtonText, isOutOfStock && styles.addButtonTextDisabled]}>
              {isOutOfStock ? 'Yo\'q' : 'Savatchaga'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  cardInCart: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  cardOutOfStock: {
    opacity: 0.6,
  },
  quantityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 6,
  },
  quantityBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.danger,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },
  outOfStockBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.borderLight,
  },
  imagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  stockInfo: {
    fontSize: 12,
    color: Colors.success,
    marginBottom: 8,
  },
  stockInfoOutOfStock: {
    color: Colors.danger,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  addButtonDisabled: {
    backgroundColor: Colors.border,
  },
  addButtonText: {
    color: Colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  addButtonTextDisabled: {
    color: Colors.textLight,
  },
});
