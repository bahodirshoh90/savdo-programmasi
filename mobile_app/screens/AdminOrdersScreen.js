/**
 * Admin Orders Screen
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/colors';
import api from '../services/api';
import { API_ENDPOINTS } from '../config/api';

export default function AdminOrdersScreen() {
  const { permissions } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ORDERS.LIST + '?limit=50');
      setOrders(response || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Xatolik', 'Buyurtmalarni yuklashda xatolik');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
    setIsRefreshing(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const renderOrder = ({ item }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderInfo}>
        <Text style={styles.orderId}>Buyurtma #{item.id}</Text>
        <Text style={styles.orderCustomer}>
          Mijoz: {item.customer_name || 'Noma\'lum'}
        </Text>
        <Text style={styles.orderAmount}>
          Summa: {item.total_amount?.toLocaleString('uz-UZ') || '0'} so'm
        </Text>
        <View style={styles.orderFooter}>
          <Text
            style={[styles.orderStatus, { color: getStatusColor(item.status) }]}
          >
            {item.status || 'pending'}
          </Text>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Buyurtmalar topilmadi</Text>
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
  orderCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  orderCustomer: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textLight,
  },
});

