/**
 * Orders Screen for Customer App
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Colors from '../constants/colors';
import { getOrders } from '../services/orders';
import OrderCard from '../components/OrderCard';

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadOrders = async () => {
    console.log('[ORDERS SCREEN] Loading orders with filter:', statusFilter);
    setIsLoading(true);
    try {
      const status = statusFilter === 'all' ? null : statusFilter;
      console.log('[ORDERS SCREEN] Calling getOrders with status:', status);
      const result = await getOrders(status);
      console.log('[ORDERS SCREEN] Orders received:', result);
      console.log('[ORDERS SCREEN] Orders count:', Array.isArray(result) ? result.length : 0);
      setOrders(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('[ORDERS SCREEN] Error loading orders:', error);
      // Only show alert for non-Customer ID errors
      if (error.message && !error.message.includes('Customer ID not found')) {
        Alert.alert('Xatolik', 'Buyurtmalarni yuklashda xatolik');
      }
      setOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [statusFilter])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
  };

  const handleOrderPress = (order) => {
    navigation.navigate('OrderDetail', { orderId: order.id });
  };

  return (
    <View style={styles.container}>
      {/* Status Filter - Modern Design */}
      <View style={styles.filterContainer}>
        <View style={styles.filterCard}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterLabel}>Holatni tanlang</Text>
          </View>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={statusFilter}
              onValueChange={(value) => {
                console.log('[ORDERS SCREEN] Filter changed to:', value);
                setStatusFilter(value);
              }}
              style={styles.picker}
              dropdownIconColor={Colors.primary}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Barchasi" value="all" />
              <Picker.Item label="Kutilmoqda" value="pending" />
              <Picker.Item label="Jarayonda" value="processing" />
              <Picker.Item label="Bajarildi" value="completed" />
              <Picker.Item label="Bekor qilindi" value="cancelled" />
            </Picker>
          </View>
        </View>
      </View>

      {isLoading && orders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={handleOrderPress} />
          )}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Buyurtmalar topilmadi</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: Colors.background,
  },
  filterCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterHeader: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 16,
    color: Colors.textDark,
    fontWeight: '600',
  },
  pickerWrapper: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
    overflow: 'hidden',
  },
  picker: {
    backgroundColor: 'transparent',
    height: 50,
  },
  pickerItem: {
    fontSize: 15,
    color: Colors.textDark,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
