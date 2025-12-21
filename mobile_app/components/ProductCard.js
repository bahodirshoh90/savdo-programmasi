/**
 * Product Card Component
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import Colors from '../constants/colors';
import API_CONFIG from '../config/api';

export default function ProductCard({ product, onPress, onAdd, style }) {
  // Handle null/undefined product
  if (!product) {
    return null;
  }

  const getPrice = (customerType = 'retail') => {
    switch (customerType) {
      case 'wholesale':
        return product.wholesale_price || 0;
      case 'retail':
        return product.retail_price || 0;
      default:
        return product.regular_price || 0;
    }
  };

  // Build image URL - handle both relative and absolute URLs
  const getImageUrl = () => {
    if (!product.image_url) return null;
    
    // If it's already a full URL, use it directly
    if (product.image_url.startsWith('http://') || product.image_url.startsWith('https://')) {
      return product.image_url;
    }
    
    // If it's a relative path, prepend base URL
    let baseUrl = API_CONFIG.BASE_URL;
    // Remove /api if present to get base server URL
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.replace('/api', '');
    } else if (baseUrl.includes('/api')) {
      baseUrl = baseUrl.split('/api')[0];
    }
    
    // Ensure image_url starts with /
    const imagePath = product.image_url.startsWith('/') ? product.image_url : `/${product.image_url}`;
    return `${baseUrl}${imagePath}`;
  };

  const imageUrl = getImageUrl();

  return (
    <View style={[styles.card, style]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={(e) => {
            console.warn('Image load error:', imageUrl, e);
          }}
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

        {product.barcode && (
          <Text style={styles.barcode}>Barcode: {product.barcode}</Text>
        )}

        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {getPrice('retail').toLocaleString('uz-UZ')} so'm
          </Text>
        </View>

        {onAdd && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              onAdd(product);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>Qo'shish</Text>
          </TouchableOpacity>
        )}
        {onPress && !onAdd && (
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => {
              onPress(product);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.viewButtonText}>Ko'rish</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }
      : {
          elevation: 2,
          shadowColor: Colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }
    ),
    flex: 1,
    maxWidth: '100%',
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
    marginBottom: 4,
  },
  barcode: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  addButton: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  viewButton: {
    marginTop: 8,
    backgroundColor: Colors.border,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewButtonText: {
    color: Colors.textDark,
    fontWeight: '600',
    fontSize: 14,
  },
});

