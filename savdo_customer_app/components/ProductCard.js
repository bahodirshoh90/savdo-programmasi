/**
 * Product Card Component - Optimized with animations and image optimization
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedView from './AnimatedView';
import OptimizedImage from './OptimizedImage';
import AnimatedButton from './AnimatedButton';
import { useTheme } from '../context/ThemeContext';
import responsive from '../utils/responsive';

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
  const { colors, isDark } = useTheme();
  const price = product.retail_price || product.regular_price || 0;
  const isOutOfStock = product.total_pieces !== undefined && product.total_pieces !== null && product.total_pieces <= 0;
  const imageHeight = responsive.isSmallPhone() ? 150 : (responsive.isTablet() ? 220 : 180);
  const favoriteBg = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';

  return (
    <AnimatedView
      animationType="slideUp"
      delay={index * 50}
      duration={300}
      style={styles.container}
    >
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => onPress && onPress(product)}
        activeOpacity={0.7}
      >
        {/* Product Image */}
        <View style={[styles.imageContainer, { height: imageHeight, backgroundColor: colors.background }]}>
          <OptimizedImage
            source={product.image_url}
            style={styles.image}
            resizeMode="cover"
            placeholder={
              <View style={[styles.imagePlaceholder, { backgroundColor: colors.background }]}>
                <Ionicons name="image-outline" size={40} color={colors.textLight} />
              </View>
            }
          />
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={[styles.outOfStockText, { color: colors.surface }]}>Omborda yo'q</Text>
            </View>
          )}
          {isInCompare && (
            <View style={[styles.compareBadge, { backgroundColor: colors.surface }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            </View>
          )}
          {/* Favorite Button */}
          {onFavorite && (
            <TouchableOpacity
              style={[styles.favoriteButton, { backgroundColor: favoriteBg, borderColor: colors.border }]}
              onPress={() => {
                onFavorite(product);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? colors.danger : colors.textLight}
              />
            </TouchableOpacity>
          )}
          {/* Quantity Badge */}
          {quantity > 0 && (
            <View style={[styles.quantityBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.quantityBadgeText, { color: colors.surface }]}>{quantity}</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          
          {product.category && (
            <Text style={[styles.category, { color: colors.textLight }]} numberOfLines={1}>
              {product.category}
            </Text>
          )}

          <Text style={[styles.price, { color: colors.primary }]}>
            {price.toLocaleString('uz-UZ')} so'm
          </Text>

          {product.total_pieces !== undefined && product.total_pieces !== null && (
            <Text style={[
              styles.stock,
              { color: isOutOfStock ? colors.danger : colors.success }
            ]}>
              {isOutOfStock ? 'Omborda yo\'q' : `Omborda: ${product.total_pieces} dona`}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {quantity > 0 ? (
              <View style={styles.cartControlsContainer}>
                <TouchableOpacity
                  style={[
                    styles.quantityControlButton,
                    { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
                    (isOutOfStock || quantity <= 1) && styles.quantityControlButtonDisabled
                  ]}
                  onPress={() => {
                    if (onAddToCart && quantity > 1) {
                      onAddToCart(product, -1);
                    }
                  }}
                  disabled={isOutOfStock || quantity <= 1}
                >
                  <Text style={[
                    styles.quantityControlText,
                    { color: colors.primary },
                    (isOutOfStock || quantity <= 1) && styles.quantityControlTextDisabled
                  ]}>-</Text>
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
                    { backgroundColor: isOutOfStock ? colors.border : colors.primary }
                  ]}
                >
                  <Text
                    style={[
                      styles.addButtonText,
                      { color: isOutOfStock ? colors.textLight : colors.surface }
                    ]}
                  >
                    {quantity}
                  </Text>
                </AnimatedButton>
                <TouchableOpacity
                  style={[
                    styles.quantityControlButton,
                    { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
                    isOutOfStock && styles.quantityControlButtonDisabled
                  ]}
                  onPress={() => {
                    if (onAddToCart) {
                      onAddToCart(product, 1);
                    }
                  }}
                  disabled={isOutOfStock}
                >
                  <Text style={[
                    styles.quantityControlText,
                    { color: colors.primary },
                    isOutOfStock && styles.quantityControlTextDisabled
                  ]}>+</Text>
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
                  { backgroundColor: isOutOfStock ? colors.border : colors.primary },
                ]}
                haptic={true}
              >
                <Ionicons
                  name={isOutOfStock ? 'close-circle' : 'cart'}
                  size={18}
                  color={isOutOfStock ? colors.textLight : colors.surface}
                />
                <Text
                  style={[
                    styles.addButtonText,
                    { color: isOutOfStock ? colors.textLight : colors.surface },
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
                  { backgroundColor: colors.background, borderColor: colors.border },
                  isInCompare && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
                ]}
                haptic={true}
              >
                <Ionicons
                  name={isInCompare ? 'checkmark-circle' : 'git-compare-outline'}
                  size={18}
                  color={isInCompare ? colors.primary : colors.text}
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
    marginBottom: responsive.getSpacing(12),
  },
  card: {
    borderRadius: responsive.getSpacing(12),
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
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
    fontSize: responsive.getFontSize(16),
    fontWeight: 'bold',
  },
  compareBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    padding: 4,
  },
  info: {
    padding: responsive.getSpacing(12),
  },
  name: {
    fontSize: responsive.getFontSize(16),
    fontWeight: '600',
    marginBottom: responsive.getSpacing(4),
    minHeight: responsive.getFontSize(16) * 2.4,
  },
  category: {
    fontSize: responsive.getFontSize(12),
    marginBottom: responsive.getSpacing(8),
  },
  price: {
    fontSize: responsive.getFontSize(18),
    fontWeight: 'bold',
    marginBottom: responsive.getSpacing(8),
  },
  stock: {
    fontSize: responsive.getFontSize(12),
    marginBottom: responsive.getSpacing(12),
  },
  actions: {
    flexDirection: 'row',
    gap: responsive.getSpacing(8),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsive.getSpacing(12),
    paddingHorizontal: responsive.getSpacing(16),
    borderRadius: responsive.getSpacing(10),
    gap: responsive.getSpacing(6),
    minHeight: responsive.getSpacing(44),
  },
  addButtonText: {
    fontSize: responsive.getFontSize(15),
    fontWeight: '700',
    textAlign: 'center',
  },
  compareButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: responsive.getSpacing(8),
    borderWidth: 1,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  quantityBadgeText: {
    fontSize: responsive.getFontSize(12),
    fontWeight: 'bold',
  },
  addButtonWithQuantity: {
    backgroundColor: '#4CAF50',
  },
  cartControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsive.getSpacing(8),
    flex: 1,
    width: '100%',
  },
  quantityControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  quantityControlButtonDisabled: {
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
  quantityControlText: {
    fontSize: responsive.getFontSize(22),
    fontWeight: 'bold',
    lineHeight: 22,
  },
  quantityControlTextDisabled: {
    color: '#94a3b8',
  },
  addButtonWithControls: {
    flex: 1,
    minWidth: 80,
    maxWidth: 120,
  },
});
