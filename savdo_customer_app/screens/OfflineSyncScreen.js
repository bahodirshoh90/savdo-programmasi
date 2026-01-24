/**
 * Offline Sync Screen - Sync offline orders to server
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import Colors from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { syncOfflineOrders } from '../services/orders';
import Footer from '../components/Footer';

const OFFLINE_ORDERS_KEY = 'offline_orders_queue';

export default function OfflineSyncScreen({ navigation }) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOfflineOrders();
  }, []);

  const loadOfflineOrders = async () => {
    try {
      setLoading(true);
      const data = await AsyncStorage.getItem(OFFLINE_ORDERS_KEY);
      const offlineOrders = data ? JSON.parse(data) : [];
      setOrders(offlineOrders || []);
    } catch (error) {
      console.error('Error loading offline orders:', error);
      showToast('Xatolik', 'Offline buyurtmalarni yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOfflineOrders();
    setRefreshing(false);
  };

  const handleSync = async () => {
    if (orders.length === 0) {
      showToast('Xatolik', 'Sinxronizatsiya qilish uchun buyurtmalar yo\'q', 'error');
      return;
    }

    Alert.alert(
      'Sinxronizatsiya',
      `${orders.length} ta offline buyurtmani sinxronizatsiya qilishni xohlaysizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Sinxronizatsiya',
          onPress: async () => {
            setSyncing(true);
            try {
              const result = await syncOfflineOrders();
              
              if (result.synced > 0) {
                showToast(
                  'Muvaffaqiyatli',
                  `${result.synced} ta buyurtma sinxronizatsiya qilindi`,
                  'success'
                );
                await loadOfflineOrders();
              } else if (result.error) {
                throw result.error;
              } else {
                showToast('Xatolik', 'Sinxronizatsiya qilishda xatolik', 'error');
              }
            } catch (error) {
              console.error('Sync error:', error);
              const errorMsg = error.response?.data?.detail || error.message || 'Sinxronizatsiyada xatolik';
              showToast('Xatolik', errorMsg, 'error');
            } finally {
              setSyncing(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteOrder = (index) => {
    Alert.alert(
      'Buyurtmani o\'chirish',
      'Bu offline buyurtmani o\'chirishni xohlaysizmi?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'O\'chirish',
          style: 'destructive',
          onPress: async () => {
            try {
              const newOrders = orders.filter((_, i) => i !== index);
              await AsyncStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(newOrders));
              setOrders(newOrders);
              showToast('Muvaffaqiyatli', 'Buyurtma o\'chirildi', 'success');
            } catch (error) {
              console.error('Error deleting order:', error);
              showToast('Xatolik', 'Buyurtmani o\'chirishda xatolik', 'error');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Noma\'lum sana';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('uz-UZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const renderOrderItem = ({ item, index }) => {
    const totalAmount = item.total_amount || item.items?.reduce((sum, i) => sum + (i.price * i.quantity), 0) || 0;
    const itemCount = item.items?.length || 0;

    return (
      <View style={styles.orderItem}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>
              Buyurtma #{index + 1}
            </Text>
            <Text style={styles.orderDate}>{formatDate(item.created_at || item.timestamp)}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteOrder(index)}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="cube-outline" size={16} color={Colors.textLight} />
            <Text style={styles.detailText}>{itemCount} ta mahsulot</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={Colors.textLight} />
            <Text style={styles.detailText}>
              {totalAmount.toLocaleString('uz-UZ')} so'm
            </Text>
          </View>
        </View>

        {item.delivery_address && (
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={16} color={Colors.textLight} />
            <Text style={styles.addressText} numberOfLines={2}>
              {item.delivery_address}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Yuklanmoqda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offline Buyurtmalar</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          Internetga ulanib, offline buyurtmalarni sinxronizatsiya qiling
        </Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item, index) => `order-${index}-${item.timestamp || Date.now()}`}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-upload-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>Offline buyurtmalar yo'q</Text>
            <Text style={styles.emptySubtext}>
              Barcha buyurtmalar sinxronizatsiya qilingan
            </Text>
          </View>
        }
      />

      {orders.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <>
                <Ionicons name="sync" size={20} color={Colors.surface} />
                <Text style={styles.syncButtonText}>
                  {orders.length} ta buyurtmani sinxronizatsiya qilish
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      <Footer currentScreen="orders" />
    </View>
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
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textDark,
  },
  listContent: {
    padding: 16,
  },
  orderItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  deleteButton: {
    padding: 8,
  },
  orderDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textDark,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textLight,
  },
  emptyContainer: {
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
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
