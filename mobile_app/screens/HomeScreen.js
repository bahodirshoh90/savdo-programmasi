/**
 * Home Screen - Dashboard
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/colors';
import { isOnline } from '../services/api';
import { syncOfflineQueue } from '../services/api';
import { syncOrders } from '../services/orders';
import { syncAllLocations } from '../services/location';
import { getDashboardData } from '../services/statistics';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user, permissions } = useAuth();
  
  // Helper function to check permissions
  const hasPermission = (permissionCode) => {
    return permissions && permissions.includes(permissionCode);
  };
  const [isOnlineState, setIsOnlineState] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [dashboardData, setDashboardData] = useState({
    productsCount: 0,
    todaySalesCount: 0,
    todayRevenue: 0,
    pendingOrdersCount: 0,
  });

  useEffect(() => {
    checkOnlineStatus();
    checkPendingSync();
    loadDashboardData();
    
    const interval = setInterval(() => {
      checkOnlineStatus();
      checkPendingSync();
      loadDashboardData();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');
      const data = await getDashboardData();
      console.log('Dashboard data loaded:', data);
      setDashboardData(data || {
        productsCount: 0,
        todaySalesCount: 0,
        todayRevenue: 0,
        pendingOrdersCount: 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set default values on error
      setDashboardData({
        productsCount: 0,
        todaySalesCount: 0,
        todayRevenue: 0,
        pendingOrdersCount: 0,
      });
    }
  };

  const checkOnlineStatus = async () => {
    const online = await isOnline();
    setIsOnlineState(online);
  };

  const checkPendingSync = async () => {
    // TODO: Count unsynced items
    // For now, just check if offline
    const online = await isOnline();
    setPendingSync(online ? 0 : 1);
  };

  const handleSync = async () => {
    setIsRefreshing(true);
    
    try {
      const online = await isOnline();
      if (!online) {
        Alert.alert('Xabar', 'Internetga ulanmagansiz. Sinxronlash uchun internetni yoqing.');
        setIsRefreshing(false);
        return;
      }

      // Sync all pending data
      await Promise.all([
        syncOfflineQueue(),
        syncOrders(),
        syncAllLocations(),
      ]);

      // Reload dashboard data
      await loadDashboardData();
      
      Alert.alert('Muvaffaqiyatli', 'Barcha ma\'lumotlar sinxronlashtirildi');
      checkPendingSync();
    } catch (error) {
      Alert.alert('Xatolik', 'Sinxronlashda xatolik yuz berdi');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={async () => {
            await handleSync();
            await loadDashboardData();
          }}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Assalomu alaykum!</Text>
          <Text style={styles.userName}>{user?.name || user?.seller_name || 'Foydalanuvchi'}</Text>
        </View>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnlineState ? Colors.success : Colors.danger },
            ]}
          />
          <Text style={styles.statusText}>
            {isOnlineState ? 'Onlayn' : 'Oflayn'}
          </Text>
        </View>
      </View>

      {/* Sync Status */}
      {pendingSync > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>
            {pendingSync} ta ma'lumot sinxronlash kutmoqda
          </Text>
          <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
            <Text style={styles.syncButtonText}>Sinxronlash</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tezkor amallar</Text>
        <View style={styles.actionsGrid}>
          {hasPermission('orders.create') && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('CreateOrder')}
            >
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionText}>Yangi buyurtma</Text>
            </TouchableOpacity>
          )}

          {hasPermission('orders.view') && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('MainTabs', { screen: 'OrdersTab' })}
            >
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionText}>Buyurtmalar</Text>
            </TouchableOpacity>
          )}

          {hasPermission('products.view') && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('MainTabs', { screen: 'ProductsTab' })}
            >
              <Text style={styles.actionIcon}>📦</Text>
              <Text style={styles.actionText}>Mahsulotlar</Text>
            </TouchableOpacity>
          )}

          {hasPermission('customers.view') && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('MainTabs', { screen: 'CustomersTab' })}
            >
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionText}>Mijozlar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistika</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📦</Text>
            <Text style={styles.statValue}>{dashboardData.productsCount}</Text>
            <Text style={styles.statLabel}>Jami Mahsulotlar</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🛒</Text>
            <Text style={styles.statValue}>{dashboardData.todaySalesCount}</Text>
            <Text style={styles.statLabel}>Bugungi Sotuvlar soni</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>
              {dashboardData.todayRevenue ? dashboardData.todayRevenue.toLocaleString('uz-UZ') : '0'}
            </Text>
            <Text style={styles.statLabel}>Bugungi Savdo summasi</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📋</Text>
            <Text style={styles.statValue}>{dashboardData.pendingOrdersCount}</Text>
            <Text style={styles.statLabel}>Kutilayotgan Buyurtmalar</Text>
          </View>
        </View>
      </View>

      {/* Admin Section - Only for admins */}
      {(user?.role_name?.toLowerCase().includes('admin') || 
        (permissions && (
          permissions.includes('admin.settings') ||
          permissions.includes('admin.sellers') ||
          permissions.includes('admin.roles')
        ))) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.adminBadge}>🛡️</Text> Admin Boshqaruvi
          </Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AdminDashboard')}
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionText}>Umumiy Statistika</Text>
            </TouchableOpacity>

            {hasPermission('products.view') && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('AdminProducts')}
              >
                <Text style={styles.actionIcon}>📦</Text>
                <Text style={styles.actionText}>Mahsulotlar</Text>
              </TouchableOpacity>
            )}

            {hasPermission('customers.view') && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('AdminCustomers')}
              >
                <Text style={styles.actionIcon}>👥</Text>
                <Text style={styles.actionText}>Mijozlar</Text>
              </TouchableOpacity>
            )}

            {hasPermission('sales.view') && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('AdminSales')}
              >
                <Text style={styles.actionIcon}>💰</Text>
                <Text style={styles.actionText}>Sotuvlar</Text>
              </TouchableOpacity>
            )}

            {hasPermission('orders.view') && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('AdminOrders')}
              >
                <Text style={styles.actionIcon}>📋</Text>
                <Text style={styles.actionText}>Buyurtmalar</Text>
              </TouchableOpacity>
            )}

            {(hasPermission('admin.sellers') || user?.role_name?.toLowerCase().includes('admin')) && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('AdminSellers')}
              >
                <Text style={styles.actionIcon}>👔</Text>
                <Text style={styles.actionText}>Sotuvchilar</Text>
              </TouchableOpacity>
            )}

            {(hasPermission('admin.settings') || user?.role_name?.toLowerCase().includes('admin')) && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('AdminSettings')}
              >
                <Text style={styles.actionIcon}>⚙️</Text>
                <Text style={styles.actionText}>Sozlamalar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textLight,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  syncBanner: {
    backgroundColor: Colors.warning,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncText: {
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  syncButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  syncButtonText: {
    color: Colors.warningDark,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  actionCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    margin: '1%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    margin: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
  },
});

