/**
 * Admin Sales Screen
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

export default function AdminSalesScreen() {
  const { permissions } = useAuth();
  const [sales, setSales] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.SALES.LIST + '?limit=50');
      setSales(response || []);
    } catch (error) {
      console.error('Error loading sales:', error);
      Alert.alert('Xatolik', 'Sotuvlarni yuklashda xatolik');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSales();
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

  const renderSale = ({ item }) => (
    <TouchableOpacity style={styles.saleCard}>
      <View style={styles.saleInfo}>
        <Text style={styles.saleId}>Sotuv #{item.id}</Text>
        <Text style={styles.saleCustomer}>
          Mijoz: {item.customer_name || 'Noma\'lum'}
        </Text>
        <Text style={styles.saleAmount}>
          Summa: {item.total_amount?.toLocaleString('uz-UZ') || '0'} so'm
        </Text>
        <Text style={styles.saleDate}>
          Sana: {formatDate(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sales}
        renderItem={renderSale}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sotuvlar topilmadi</Text>
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
  saleCard: {
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
  saleInfo: {
    flex: 1,
  },
  saleId: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  saleCustomer: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  saleDate: {
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

