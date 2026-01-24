/**
 * Payment History Screen
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

export default function PaymentHistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalDebt, setTotalDebt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadPaymentHistory();
      loadTotalDebt();
    }, [])
  );

  const loadPaymentHistory = async () => {
    try {
      setIsLoading(true);
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) return;

      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL 
        : `${API_ENDPOINTS.BASE_URL}/api`;
      
      // Get orders with payment info
      const response = await fetch(`${baseUrl}/orders?customer_id=${customerId}`, {
        headers: {
          'X-Customer-ID': customerId,
        },
      });
      
      if (response.ok) {
        const orders = await response.json();
        // Extract payment info from orders
        const paymentList = orders
          .filter(order => order.payment_method && order.total_amount)
          .map(order => ({
            id: order.id,
            date: order.created_at,
            amount: order.total_amount,
            method: order.payment_method,
            order_id: order.id,
            status: order.status,
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setPayments(paymentList);
      }
    } catch (error) {
      console.error('Error loading payment history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadTotalDebt = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) return;

      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL 
        : `${API_ENDPOINTS.BASE_URL}/api`;
      
      const response = await fetch(`${baseUrl}/debt/total`, {
        headers: {
          'X-Customer-ID': customerId,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTotalDebt(data.total_debt || 0);
      }
    } catch (error) {
      console.error('Error loading total debt:', error);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPaymentHistory();
    loadTotalDebt();
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Naqd',
      card: 'Karta',
      bank_transfer: 'Bank orqali',
      debt: 'Qarz',
    };
    return labels[method] || method;
  };

  if (isLoading && payments.length === 0) {
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
      {/* Total Debt Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Jami qarz</Text>
        <Text style={[styles.summaryAmount, { color: colors.primary }]}>
          {formatMoney(totalDebt)}
        </Text>
      </View>

      {/* Payment List */}
      <View style={styles.paymentsList}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>To'lov tarixi</Text>
        {payments.length > 0 ? (
          payments.map((payment) => (
            <View
              key={payment.id}
              style={[styles.paymentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.paymentHeader}>
                <View>
                  <Text style={[styles.paymentDate, { color: colors.text }]}>
                    {new Date(payment.date).toLocaleDateString('uz-UZ', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={[styles.paymentMethod, { color: colors.textLight }]}>
                    {getPaymentMethodLabel(payment.method)}
                  </Text>
                </View>
                <Text style={[styles.paymentAmount, { color: Colors.success }]}>
                  {formatMoney(payment.amount)}
                </Text>
              </View>
              <View style={styles.paymentFooter}>
                <Text style={[styles.paymentOrderId, { color: colors.textLight }]}>
                  Buyurtma #{payment.order_id}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('OrderDetail', { orderId: payment.order_id })}
                >
                  <Text style={[styles.viewOrderLink, { color: colors.primary }]}>
                    Ko'rish →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              To'lov tarixi bo'sh
            </Text>
          </View>
        )}
      </View>
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
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  paymentsList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  paymentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentDate: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 12,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  paymentOrderId: {
    fontSize: 12,
  },
  viewOrderLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  paymentHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  paymentHistoryButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
