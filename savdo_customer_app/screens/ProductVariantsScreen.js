/**
 * Product Variants Screen - View and select product variants (size, color, etc.)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import Colors from '../constants/colors';
import { useToast } from '../context/ToastContext';
import Footer, { FooterAwareView } from '../components/Footer';

export default function ProductVariantsScreen({ navigation, route }) {
  const { productId, onSelectVariant } = route.params || {};
  const { showToast } = useToast();
  const { colors } = useTheme();
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    if (productId) {
      loadVariants();
    } else {
      showToast('Xatolik', 'Mahsulot ID topilmadi', 'error');
      navigation.goBack();
    }
  }, [productId]);

  const loadVariants = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/${productId}/variants`);
      setVariants(response || []);
      
      // Auto-select default variant if exists
      const defaultVariant = response?.find((v) => v.is_default);
      if (defaultVariant) {
        setSelectedVariant(defaultVariant);
      } else if (response?.length > 0) {
        setSelectedVariant(response[0]);
      }
    } catch (error) {
      console.error('Error loading variants:', error);
      showToast('Xatolik', 'Variantlarni yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVariant = (variant) => {
    setSelectedVariant(variant);
    if (onSelectVariant) {
      onSelectVariant(variant);
    }
  };

  const handleConfirm = () => {
    if (selectedVariant && onSelectVariant) {
      onSelectVariant(selectedVariant);
      navigation.goBack();
    } else {
      showToast('Xatolik', 'Variantni tanlang', 'error');
    }
  };

  const renderVariantItem = ({ item }) => {
    const isSelected = selectedVariant?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.variantItem,
          isSelected && styles.variantItemSelected,
        ]}
        onPress={() => handleSelectVariant(item)}
      >
        <View style={styles.variantContent}>
          {item.image_url && (
            <Image
              source={{ uri: item.image_url }}
              style={styles.variantImage}
              resizeMode="cover"
            />
          )}
          
          <View style={styles.variantInfo}>
            <View style={styles.variantHeader}>
              <Text style={styles.variantName}>
                {item.name || `Variant #${item.id}`}
              </Text>
              {item.is_default && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Asosiy</Text>
                </View>
              )}
            </View>
            
            {item.description && (
              <Text style={styles.variantDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            
            <View style={styles.variantDetails}>
              {item.sku && (
                <Text style={styles.variantSku}>SKU: {item.sku}</Text>
              )}
              
              {item.price !== undefined && item.price !== null && (
                <Text style={styles.variantPrice}>
                  {item.price.toLocaleString('uz-UZ')} so'm
                </Text>
              )}
              
              {item.stock_quantity !== undefined && item.stock_quantity !== null && (
                <View style={styles.stockContainer}>
                  <Ionicons
                    name={item.stock_quantity > 0 ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={item.stock_quantity > 0 ? Colors.success : Colors.danger}
                  />
                  <Text
                    style={[
                      styles.stockText,
                      item.stock_quantity === 0 && styles.stockTextOut,
                    ]}
                  >
                    {item.stock_quantity > 0
                      ? `${item.stock_quantity} dona mavjud`
                      : 'Omborda yo\'q'}
                  </Text>
                </View>
              )}
            </View>
            
            {item.attributes && Object.keys(item.attributes).length > 0 && (
              <View style={styles.attributesContainer}>
                {Object.entries(item.attributes).map(([key, value]) => (
                  <View key={key} style={styles.attributeItem}>
                    <Text style={styles.attributeKey}>{key}:</Text>
                    <Text style={styles.attributeValue}>{value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <FooterAwareView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Variantlar yuklanmoqda...</Text>
        </View>
        <Footer currentScreen="products" />
      </FooterAwareView>
    );
  }

  if (variants.length === 0) {
    return (
      <FooterAwareView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mahsulot Variantlari</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={Colors.textLight} />
          <Text style={styles.emptyText}>Variantlar topilmadi</Text>
          <Text style={styles.emptySubtext}>
            Bu mahsulot uchun variantlar mavjud emas
          </Text>
        </View>
        <Footer currentScreen="products" />
      </FooterAwareView>
    );
  }

  return (
    <FooterAwareView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Variantni tanlang</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={variants}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderVariantItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {onSelectVariant && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedVariant && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!selectedVariant}
          >
            <Text style={styles.confirmButtonText}>
              {selectedVariant
                ? `Tanlangan: ${selectedVariant.name || `Variant #${selectedVariant.id}`}`
                : 'Variantni tanlang'}
            </Text>
            <Ionicons name="checkmark" size={20} color={Colors.surface} />
          </TouchableOpacity>
        </View>
      )}
      <Footer currentScreen="products" />
    </FooterAwareView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: 16,
  },
  variantItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  variantItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  variantContent: {
    flexDirection: 'row',
  },
  variantImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: Colors.background,
  },
  variantInfo: {
    flex: 1,
  },
  variantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  variantName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  defaultBadgeText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  variantDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  variantDetails: {
    marginTop: 8,
  },
  variantSku: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  variantPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stockText: {
    fontSize: 14,
    color: Colors.success,
    marginLeft: 4,
  },
  stockTextOut: {
    color: Colors.danger,
  },
  attributesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  attributeItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  attributeKey: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '600',
    marginRight: 4,
  },
  attributeValue: {
    fontSize: 12,
    color: Colors.textDark,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
