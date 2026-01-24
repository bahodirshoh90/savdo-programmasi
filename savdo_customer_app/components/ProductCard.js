/**
 * Product Card Component - Optimized with animations and image optimization
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import AnimatedView from './AnimatedView';
import OptimizedImage from './OptimizedImage';
import AnimatedButton from './AnimatedButton';

export default function ProductCard({
  product,
  onPress,
  onAddToCart,
  onCompare,
  onFavorite,
  isInCompare = false,
  isFavorite = false,
  quantity = 0,
  index = 0,
}) {
  const price = product.retail_price || product.regular_price || 0;
  const isOutOfStock = product.total_pieces !== undefined && product.total_pieces !== null && product.total_pieces <= 0;

  return (
    <AnimatedView
      animationType="slideUp"
      delay={index * 50}
      duration={300}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress && onPress(product)}
        activeOpacity={0.7}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <OptimizedImage
            source={product.image_url}
            style={styles.image}
            resizeMode="cover"
            placeholder={
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={40} color={Colors.textLight} />
              </View>
            }
          />
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Omborda yo'q</Text>
            </View>
          )}
          {isInCompare && (
            <View style={styles.compareBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            </View>
          )}
          {/* Favorite Button */}
          {onFavorite && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => {
                onFavorite(product);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? '#ff3b30' : Colors.surface}
              />
            </TouchableOpacity>
          )}
          {/* Quantity Badge */}
          {quantity > 0 && (
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityBadgeText}>{quantity}</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          
          {product.category && (
            <Text style={styles.category} numberOfLines={1}>
              {product.category}
            </Text>
          )}

          <Text style={styles.price}>
            {price.toLocaleString('uz-UZ')} so'm
          </Text>

          {product.total_pieces !== undefined && product.total_pieces !== null && (
            <Text style={[styles.stock, isOutOfStock && styles.stockOut]}>
              {isOutOfStock ? 'Omborda yo\'q' : `Omborda: ${product.total_pieces} dona`}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {quantity > 0 ? (
              <View style={styles.cartControlsContainer}>
                <TouchableOpacity
                  style={[styles.quantityControlButton, (isOutOfStock || quantity <= 1) && styles.quantityControlButtonDisabled]}
                  onPress={() => {
                    if (onAddToCart && quantity > 1) {
                      onAddToCart(product, -1);
                    }
                  }}
                  disabled={isOutOfStock || quantity <= 1}
                >
                  <Text style={[styles.quantityControlText, (isOutOfStock || quantity <= 1) && styles.quantityControlTextDisabled]}>-</Text>
                </TouchableOpacity>
                <AnimatedButton
                  onPress={() => {
                    // Just show quantity, no action needed
                  }}
                  disabled={true}
                  style={[
                    styles.addButton,
                    styles.addButtonWithControls,
                    isOutOfStock && styles.addButtonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.addButtonText,
                      isOutOfStock && styles.addButtonTextDisabled,
                    ]}
                  >
                    {quantity}
                  </Text>
                </AnimatedButton>
                <TouchableOpacity
                  style={[styles.quantityControlButton, isOutOfStock && styles.quantityControlButtonDisabled]}
                  onPress={() => {
                    if (onAddToCart) {
                      onAddToCart(product, 1);
                    }
                  }}
                  disabled={isOutOfStock}
                >
                  <Text style={[styles.quantityControlText, isOutOfStock && styles.quantityControlTextDisabled]}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <AnimatedButton
                onPress={() => {
                  if (onAddToCart) {
                    onAddToCart(product, 1);
                  }
                }}
                disabled={isOutOfStock}
                style={[
                  styles.addButton,
                  isOutOfStock && styles.addButtonDisabled,
                ]}
                haptic={true}
              >
                <Ionicons
                  name={isOutOfStock ? 'close-circle' : 'cart'}
                  size={18}
                  color={isOutOfStock ? Colors.textLight : Colors.surface}
                />
                <Text
                  style={[
                    styles.addButtonText,
                    isOutOfStock && styles.addButtonTextDisabled,
                  ]}
                >
                  {isOutOfStock ? 'Yo\'q' : 'Savatchaga'}
                </Text>
              </AnimatedButton>
            )}

            {onCompare && (
              <AnimatedButton
                onPress={() => onCompare(product)}
                style={[
                  styles.compareButton,
                  isInCompare && styles.compareButtonActive,
                ]}
                haptic={true}
              >
                <Ionicons
                  name={isInCompare ? 'checkmark-circle' : 'git-compare-outline'}
                  size={18}
                  color={isInCompare ? Colors.primary : Colors.text}
                />
              </AnimatedButton>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: Colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  compareBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    minHeight: 40,
  },
  category: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  stock: {
    fontSize: 12,
    color: Colors.success,
    marginBottom: 12,
  },
  stockOut: {
    color: Colors.danger,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonDisabled: {
    backgroundColor: Colors.border,
  },
  addButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonTextDisabled: {
    color: Colors.textLight,
  },
  compareButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compareButtonActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  quantityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  quantityBadgeText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  addButtonWithQuantity: {
    backgroundColor: Colors.success || '#4CAF50',
  },
  cartControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  quantityControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityControlButtonDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  quantityControlText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  quantityControlTextDisabled: {
    color: Colors.textLight,
  },
  addButtonWithControls: {
    flex: 1,
  },
});
