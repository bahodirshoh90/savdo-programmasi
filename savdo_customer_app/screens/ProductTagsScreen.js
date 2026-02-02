/**
 * Product Tags Screen - Personal tags for products
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAppSettings } from '../context/AppSettingsContext';
import api from '../services/api';
import { getProduct } from '../services/products';
import Colors from '../constants/colors';
import FeatureUnavailable from '../components/FeatureUnavailable';
import Footer, { FooterAwareView } from '../components/Footer';

export default function ProductTagsScreen({ navigation }) {
  const { colors } = useTheme();
  const { settings, isLoading: settingsLoading } = useAppSettings();
  const [tags, setTags] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTag, setNewTag] = useState({ productId: '', tag: '' });
  const [isSaving, setIsSaving] = useState(false);

  const isFeatureEnabled = settings?.enable_tags !== false;

  useEffect(() => {
    if (isFeatureEnabled) {
      loadTags();
    } else {
      setIsLoading(false);
    }
  }, [isFeatureEnabled]);

  const loadTags = async () => {
    try {
      if (!isRefreshing) {
        setIsLoading(true);
      }
      const response = await api.get('/product-tags');
      const list = Array.isArray(response) ? response : [];
      setTags(list);
      await loadProductsForTags(list);
    } catch (error) {
      console.error('Error loading product tags:', error);
      setTags([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadProductsForTags = async (list) => {
    const ids = Array.from(new Set(list.map((tag) => tag.product_id)));
    const missingIds = ids.filter((id) => !productMap[id]);
    if (!missingIds.length) return;

    try {
      const results = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const product = await getProduct(id);
            return [id, product];
          } catch (error) {
            console.warn('Error loading product for tag:', id, error?.message || error);
            return [id, null];
          }
        })
      );

      setProductMap((prev) => {
        const next = { ...prev };
        results.forEach(([id, product]) => {
          if (product) {
            next[id] = product;
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Error loading tagged products:', error);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTags();
  }, []);

  const handleDelete = (tagId) => {
    Alert.alert(
      'Tegni o\'chirish',
      'Bu tegni o\'chirmoqchimisiz?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'O\'chirish',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/product-tags/${tagId}`);
              setTags((prev) => prev.filter((tag) => tag.id !== tagId));
            } catch (error) {
              console.error('Error deleting tag:', error);
              Alert.alert('Xatolik', 'Tegni o\'chirishda xatolik');
            }
          },
        },
      ]
    );
  };

  const handleAddTag = async () => {
    const productId = parseInt(newTag.productId, 10);
    if (!productId || Number.isNaN(productId)) {
      Alert.alert('Xatolik', 'Mahsulot ID ni kiriting');
      return;
    }
    if (!newTag.tag.trim()) {
      Alert.alert('Xatolik', 'Teg nomini kiriting');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.post('/product-tags', {
        product_id: productId,
        tag: newTag.tag.trim(),
      });
      setTags((prev) => [response, ...prev]);
      await loadProductsForTags([response]);
      setShowAddModal(false);
      setNewTag({ productId: '', tag: '' });
    } catch (error) {
      console.error('Error adding tag:', error);
      Alert.alert('Xatolik', error.response?.data?.detail || 'Teg qo\'shishda xatolik');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTag = ({ item }) => {
    const product = productMap[item.product_id];
    return (
      <View style={[styles.tagCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.tagHeader}>
          <Text style={[styles.tagTitle, { color: colors.text }]}>
            {item.tag}
          </Text>
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.productRow}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.product_id })}
        >
          <Ionicons name="cube-outline" size={18} color={colors.textLight} />
          <Text style={[styles.productText, { color: colors.text }]}>
            {product?.name || `Mahsulot #${item.product_id}`}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>
      </View>
    );
  };

  if (settingsLoading) {
    return (
      <FooterAwareView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Footer currentScreen="products" />
      </FooterAwareView>
    );
  }

  if (!isFeatureEnabled) {
    return (
      <FooterAwareView style={styles.container}>
        <FeatureUnavailable
          title="Mahsulot teglar o'chirilgan"
          description="Administrator bu funksiyani vaqtincha o'chirgan."
          icon="pricetags-outline"
        />
        <Footer currentScreen="products" />
      </FooterAwareView>
    );
  }

  if (isLoading) {
    return (
      <FooterAwareView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Footer currentScreen="products" />
      </FooterAwareView>
    );
  }

  return (
    <FooterAwareView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mahsulot teglar</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tags}
        renderItem={renderTag}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetags-outline" size={64} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              Hozircha teglar yo'q
            </Text>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Teg qo'shish</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Mahsulot ID</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Masalan: 123"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              value={newTag.productId}
              onChangeText={(text) => setNewTag((prev) => ({ ...prev, productId: text }))}
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Teg nomi</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Masalan: Sevimli"
              placeholderTextColor={colors.textLight}
              value={newTag.tag}
              onChangeText={(text) => setNewTag((prev) => ({ ...prev, tag: text }))}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleAddTag}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={Colors.surface} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: Colors.surface }]}>Saqlash</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Footer currentScreen="products" />
    </FooterAwareView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  tagCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tagTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productText: {
    flex: 1,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
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
  saveButton: {},
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
