/**
 * Orders Screen
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../constants/colors';
import { getOrders, updateOrderStatus } from '../services/orders';
import { getSales, getSellerSalesHistory, getSaleReceiptUrl, getSale } from '../services/sales';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDateTime } from '../utils/dateUtils';

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('orders'); // 'sales' or 'orders' - default to 'orders' to show orders first
  const [statusFilter, setStatusFilter] = useState('all');

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'sales') {
        loadSales();
      } else {
        loadOrders();
      }
    }, [activeTab, statusFilter])
  );

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const sellerId = await AsyncStorage.getItem('seller_id');
      
      if (!sellerId) {
        console.warn('Seller ID not found');
        setSales([]);
        return;
      }
      
      // Get all sales for this seller (not just today)
      const params = {
        seller_id: parseInt(sellerId, 10),
        limit: 100,
      };
      
      console.log('Loading sales with params:', params);
      const result = await getSales(params);
      console.log('getSales result:', result);
      const salesArray = result?.sales || (Array.isArray(result) ? result : []);
      console.log('Sales loaded:', salesArray.length);
      setSales(salesArray);
    } catch (error) {
      console.error('Error loading sales:', error);
      Alert.alert('Xatolik', `Sotuvlarni yuklashda xatolik: ${error.message || 'Noma\'lum xatolik'}`);
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const sellerId = await AsyncStorage.getItem('seller_id');
      
      const params = {
        seller_id: sellerId ? parseInt(sellerId, 10) : undefined,
      };
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      console.log('Loading orders with params:', params);
      const result = await getOrders(params);
      console.log('Orders loaded:', result.orders?.length || 0);
      setOrders(result.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Xatolik', `Buyurtmalarni yuklashda xatolik: ${error.message || 'Noma\'lum xatolik'}`);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus, isLocalId = false) => {
    try {
      console.log('Updating order status:', { orderId, newStatus, isLocalId });
      const result = await updateOrderStatus(orderId, newStatus, isLocalId);
      console.log('Update result:', result);
      
      if (result.success) {
        // Reload orders to reflect the change
        await loadOrders();
        const message = result.offline 
          ? `Buyurtma statusi "${getStatusLabel(newStatus)}" ga o'zgartirildi (offline). Internet bilan bog'langaningizda server'ga sinxronlashtiriladi.`
          : `Buyurtma statusi "${getStatusLabel(newStatus)}" ga o'zgartirildi`;
        Alert.alert('Muvaffaqiyatli', message);
      } else {
        const errorMessage = result.error || 'Statusni yangilashda xatolik yuz berdi';
        console.error('Update failed:', errorMessage);
        Alert.alert('Xatolik', errorMessage);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Statusni yangilashda xatolik yuz berdi';
      Alert.alert('Xatolik', errorMessage);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return Colors.success;
      case 'pending':
        return Colors.warning;
      case 'cancelled':
        return Colors.danger;
      default:
        return Colors.textLight;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Kutilmoqda',
      processing: 'Jarayonda',
      completed: 'Bajarildi',
      cancelled: 'Bekor qilindi',
    };
    return labels[status] || status;
  };

  const handleViewReceipt = async (saleId) => {
    try {
      // First check if sale is approved
      const sale = await getSale(saleId);
      
      if (!sale) {
        Alert.alert('Xatolik', 'Sotuv topilmadi');
        return;
      }
      
      // Check if sale is approved
      if (sale.requires_admin_approval && sale.admin_approved !== true) {
        if (sale.admin_approved === null) {
          Alert.alert(
            'Kutilmoqda',
            'Sotuv hali admin tomonidan tasdiqlanmagan. Chek faqat tasdiqlangan sotuvlar uchun ko\'rsatiladi.'
          );
        } else if (sale.admin_approved === false) {
          Alert.alert('Rad etilgan', 'Sotuv rad etilgan. Chek ko\'rsatilmaydi.');
        }
        return;
      }
      
      // Navigate to Receipt screen instead of opening PDF
      navigation.navigate('Receipt', { saleId });
    } catch (error) {
      console.error('Error opening receipt:', error);
      Alert.alert('Xatolik', error.message || 'Chekni ochishda xatolik yuz berdi.');
    }
  };

  const renderSale = ({ item }) => {
    const saleDate = formatDateTime(item.created_at);
    
    const isPending = item.requires_admin_approval && (item.admin_approved === null || item.admin_approved === undefined);
    const isApproved = item.admin_approved === true;
    const isRejected = item.admin_approved === false;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => {
          // Navigate to sale details or show receipt
        }}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>
              Sotuv #{item.id}
              {isPending && ' ⏳'}
              {isApproved && ' ✓'}
              {isRejected && ' ✗'}
            </Text>
            <Text style={styles.orderCustomer}>
              {item.customer_name || 'Noma\'lum mijoz'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isPending
                  ? Colors.warning + '20'
                  : isApproved
                  ? Colors.success + '20'
                  : isRejected
                  ? Colors.danger + '20'
                  : Colors.success + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isPending
                    ? Colors.warning
                    : isApproved
                    ? Colors.success
                    : isRejected
                    ? Colors.danger
                    : Colors.success,
                },
              ]}
            >
              {isPending
                ? 'Kutilmoqda'
                : isApproved
                ? 'Tasdiqlandi'
                : isRejected
                ? 'Rad etildi'
                : 'Yakunlandi'}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <Text style={styles.orderDate}>{saleDate}</Text>
          <Text style={styles.orderAmount}>
            {item.total_amount?.toLocaleString('uz-UZ') || 0} so'm
          </Text>
        </View>

        <View style={styles.paymentInfo}>
          <Text style={styles.paymentLabel}>To'lov ma'lumotlari:</Text>
          <Text style={styles.paymentText}>
            Jami: {item.total_amount?.toLocaleString('uz-UZ') || 0} so'm
          </Text>
          {item.payment_amount !== null && item.payment_amount !== undefined && (
            <Text style={styles.paymentText}>
              To'landi: {item.payment_amount.toLocaleString('uz-UZ')} so'm ({item.payment_method === 'cash' ? 'Naqt' : item.payment_method === 'card' ? 'Karta' : item.payment_method === 'transfer' || item.payment_method === 'bank_transfer' ? 'O\'tkazma' : item.payment_method || 'N/A'})
            </Text>
          )}
          {item.payment_amount && item.total_amount && item.total_amount > item.payment_amount && (
            <Text style={styles.debtText}>
              Qarz: {(item.total_amount - item.payment_amount).toLocaleString('uz-UZ')} so'm
            </Text>
          )}
          {item.payment_amount && item.total_amount && item.payment_amount > item.total_amount && item.excess_action === 'return' && (
            <Text style={[styles.paymentText, { color: Colors.success }]}>
              Ortiqcha summa: {(item.payment_amount - item.total_amount).toLocaleString('uz-UZ')} so'm
            </Text>
          )}
          {/* Show items count if available */}
          {item.items && Array.isArray(item.items) && (
            <Text style={styles.paymentText}>
              Mahsulotlar: {item.items.length} ta
            </Text>
          )}
        </View>

        {(isApproved || (!item.requires_admin_approval && !isRejected)) && (
          <TouchableOpacity
            style={styles.viewReceiptButton}
            onPress={() => handleViewReceipt(item.id)}
          >
            <Text style={styles.viewReceiptButtonText}>📄 Chekni ko'rish</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderOrder = ({ item }) => {
    const isOffline = !item.server_id || item.synced === 0;
    const orderDate = formatDateTime(item.created_at);

    return (
      <TouchableOpacity
        style={[styles.orderCard, isOffline && styles.orderCardOffline]}
        onPress={() => {
          // Navigate to order details or edit
        }}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>
              Buyurtma #{item.server_id || item.id} {isOffline && '📴'}
            </Text>
            <Text style={styles.orderCustomer}>{item.customer_name || 'Noma\'lum mijoz'}</Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <Text style={styles.orderDate}>{orderDate}</Text>
          <Text style={styles.orderAmount}>
            {item.total_amount?.toLocaleString('uz-UZ') || 0} so'm
          </Text>
        </View>

        {item.status === 'pending' && (
          <View style={styles.orderActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => {
                navigation.navigate('CreateOrder', {
                  orderId: item.server_id || item.id,
                  isLocalId: !item.server_id,
                  order: item,
                });
              }}
            >
              <Text style={styles.actionButtonText}>✏️ Tahrirlash</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleStatusChange(item.server_id || item.id, 'processing', !item.server_id)}
            >
              <Text style={styles.actionButtonText}>Qabul qilish</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleStatusChange(item.server_id || item.id, 'cancelled', !item.server_id)}
            >
              <Text style={styles.actionButtonText}>Bekor qilish</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'sales' && styles.tabButtonActive]}
          onPress={() => setActiveTab('sales')}
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'sales' && styles.tabButtonTextActive]}
          >
            Sotuvlar ({sales.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'orders' && styles.tabButtonActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'orders' && styles.tabButtonTextActive]}
          >
            Buyurtmalar ({orders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status Filter - Only for Orders */}
      {activeTab === 'orders' && (
        <View style={styles.filterContainer}>
          {['all', 'pending', 'processing', 'completed'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                statusFilter === status && styles.filterButtonActive,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === status && styles.filterButtonTextActive,
                ]}
              >
                {status === 'all' ? 'Barchasi' : getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sales/Orders List */}
      <FlatList
        data={activeTab === 'sales' ? sales : orders}
        renderItem={activeTab === 'sales' ? renderSale : renderOrder}
        keyExtractor={(item, index) => {
          if (item?.id) return `sale-${item.id}`;
          if (item?.server_id) return `order-${item.server_id}`;
          return `item-${index}`;
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={activeTab === 'sales' ? loadSales : loadOrders}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'sales' ? 'Sotuvlar topilmadi' : 'Buyurtmalar topilmadi'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: Colors.surface,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: Colors.surface,
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderCardOffline: {
    borderColor: Colors.warning,
    borderWidth: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 4,
  },
  orderCustomer: {
    fontSize: 14,
    color: Colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  orderActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  cancelButton: {
    backgroundColor: Colors.danger,
  },
  actionButtonText: {
    color: Colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  paymentInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  paymentText: {
    fontSize: 13,
    color: Colors.text,
    marginBottom: 4,
  },
  debtText: {
    fontSize: 13,
    color: Colors.warning,
    fontWeight: '600',
  },
});

