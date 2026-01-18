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
    setIsLoading(true);
    try {
      const status = statusFilter === 'all' ? null : statusFilter;
      const result = await getOrders(status);
      setOrders(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Error loading orders:', error);
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
      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Status:</Text>
        <Picker
          selectedValue={statusFilter}
          onValueChange={setStatusFilter}
          style={styles.picker}
          dropdownIconColor={Colors.primary}
        >
          <Picker.Item label="Barchasi" value="all" />
          <Picker.Item label="Kutilmoqda" value="pending" />
          <Picker.Item label="Jarayonda" value="processing" />
          <Picker.Item label="Bajarildi" value="completed" />
          <Picker.Item label="Bekor qilindi" value="cancelled" />
        </Picker>
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterLabel: {
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 8,
    fontWeight: '500',
  },
  picker: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
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
