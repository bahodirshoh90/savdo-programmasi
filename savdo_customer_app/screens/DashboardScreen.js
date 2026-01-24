/**
 * Dashboard Screen - Mijoz statistikasi va hisobotlari
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';
import Colors from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import Footer from '../components/Footer';

export default function DashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [period, setPeriod] = useState('monthly'); // daily, monthly, yearly

  useFocusEffect(
    useCallback(() => {
      loadStatistics();
    }, [period])
  );

  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL 
        : `${API_ENDPOINTS.BASE_URL}/api`;
      
      const response = await fetch(`${baseUrl}/statistics?period=${period}`);
      
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStatistics();
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (isLoading && !statistics) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
        />
      }
    >
      {/* Period Selector */}
      <View style={[styles.periodSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.periodButton, period === 'daily' && { backgroundColor: colors.primary }]}
          onPress={() => setPeriod('daily')}
        >
          <Text style={[styles.periodText, period === 'daily' && { color: Colors.surface }]}>
            Kunlik
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === 'monthly' && { backgroundColor: colors.primary }]}
          onPress={() => setPeriod('monthly')}
        >
          <Text style={[styles.periodText, period === 'monthly' && { color: Colors.surface }]}>
            Oylik
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === 'yearly' && { backgroundColor: colors.primary }]}
          onPress={() => setPeriod('yearly')}
        >
          <Text style={[styles.periodText, period === 'yearly' && { color: Colors.surface }]}>
            Yillik
          </Text>
        </TouchableOpacity>
      </View>

      {statistics && (
        <>
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="receipt-outline" size={32} color={Colors.primary} />
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {statistics.total_orders || 0}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Jami Buyurtmalar</Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="cash-outline" size={32} color={Colors.success} />
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatMoney(statistics.total_orders_amount || 0)}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Jami Summa</Text>
            </View>
          </View>

          {/* Orders by Status */}
          {statistics.orders_by_status && Object.keys(statistics.orders_by_status).length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Buyurtmalar Holati</Text>
              {Object.entries(statistics.orders_by_status).map(([status, count]) => (
                <View key={status} style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: colors.text }]}>
                    {status === 'pending' ? 'Kutilmoqda' :
                     status === 'processing' ? 'Jarayonda' :
                     status === 'completed' ? 'Bajarildi' :
                     status === 'cancelled' ? 'Bekor qilindi' :
                     status === 'returned' ? 'Qaytarildi' : status}
                  </Text>
                  <Text style={[styles.statusValue, { color: colors.primary }]}>{count}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tez Amallar</Text>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Orders')}
            >
              <Ionicons name="list-outline" size={20} color={Colors.surface} />
              <Text style={styles.actionText}>Barcha Buyurtmalar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Products')}
            >
              <Ionicons name="cube-outline" size={20} color={Colors.surface} />
              <Text style={styles.actionText}>Mahsulotlar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Favorites')}
            >
              <Ionicons name="heart-outline" size={20} color={Colors.surface} />
              <Text style={styles.actionText}>Sevimlilar</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {!statistics && !isLoading && (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={80} color={colors.textLight} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Statistika ma'lumotlari topilmadi
          </Text>
        </View>
        )}
      </ScrollView>
      <Footer currentScreen="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    margin: 16,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  actionText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
