/**
 * Admin Dashboard Screen
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/colors';
import api from '../services/api';
import { API_ENDPOINTS } from '../config/api';

export default function AdminDashboardScreen() {
  const { user, permissions } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalSales: 0,
    totalCustomers: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [productsRes, ordersRes, salesRes, customersRes] = await Promise.all([
        api.get(API_ENDPOINTS.PRODUCTS.COUNT),
        api.get(API_ENDPOINTS.ORDERS.LIST + '?limit=1'),
        api.get(API_ENDPOINTS.SALES.LIST + '?limit=1'),
        api.get(API_ENDPOINTS.CUSTOMERS.COUNT),
      ]);

      setStats({
        totalProducts: productsRes.count || 0,
        totalOrders: Array.isArray(ordersRes) && ordersRes.length > 0 ? ordersRes.length : 0,
        totalSales: Array.isArray(salesRes) && salesRes.length > 0 ? salesRes.length : 0,
        totalCustomers: customersRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
      Alert.alert('Xatolik', 'Statistikani yuklashda xatolik');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStats();
    setIsRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Statistika</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📦</Text>
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Jami Mahsulotlar</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🛒</Text>
          <Text style={styles.statValue}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Jami Buyurtmalar</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statValue}>{stats.totalSales}</Text>
          <Text style={styles.statLabel}>Jami Sotuvlar</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>👥</Text>
          <Text style={styles.statValue}>{stats.totalCustomers}</Text>
          <Text style={styles.statLabel}>Jami Mijozlar</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
});

