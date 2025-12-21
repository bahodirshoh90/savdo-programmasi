/**
 * Admin Customers Screen
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

export default function AdminCustomersScreen() {
  const { permissions } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CUSTOMERS.LIST + '?limit=50');
      setCustomers(response || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Xatolik', 'Mijozlarni yuklashda xatolik');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCustomers();
    setIsRefreshing(false);
  };

  const renderCustomer = ({ item }) => (
    <TouchableOpacity style={styles.customerCard}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name || 'Noma\'lum'}</Text>
        <Text style={styles.customerDetails}>
          Telefon: {item.phone || '-'}
        </Text>
        <Text style={styles.customerDebt}>
          Qarz: {item.debt_balance?.toLocaleString('uz-UZ') || '0'} so'm
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        renderItem={renderCustomer}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Mijozlar topilmadi</Text>
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
  customerCard: {
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
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  customerDetails: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  customerDebt: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
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

