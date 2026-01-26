/**
 * Loyalty Program Screen - Bonus tizimi
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';
import Colors from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Footer, { FooterAwareView } from '../components/Footer';

export default function LoyaltyScreen({ navigation }) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [loyalty, setLoyalty] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadLoyaltyData();
    }, [])
  );

  const loadLoyaltyData = async () => {
    try {
      setIsLoading(true);
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        showToast('Foydalanuvchi ma\'lumotlari topilmadi', 'error');
        return;
      }

      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL 
        : `${API_ENDPOINTS.BASE_URL}/api`;
      
      // Get loyalty points
      const pointsResponse = await fetch(`${baseUrl}/loyalty/points`, {
        headers: {
          'X-Customer-ID': customerId,
        },
      });
      
      if (pointsResponse.ok) {
        const pointsData = await pointsResponse.json();
        setLoyalty(pointsData);
      }

      // Get transactions
      const transactionsResponse = await fetch(`${baseUrl}/loyalty/transactions?limit=50`, {
        headers: {
          'X-Customer-ID': customerId,
        },
      });
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData || []);
      }
    } catch (error) {
      console.error('Error loading loyalty data:', error);
      showToast('Ma\'lumotlarni yuklashda xatolik', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLoyaltyData();
  };

  const getVipLevelColor = (level) => {
    switch (level) {
      case 'platinum':
        return '#E5E4E2';
      case 'gold':
        return '#FFD700';
      case 'silver':
        return '#C0C0C0';
      default:
        return '#CD7F32';
    }
  };

  const getVipLevelLabel = (level) => {
    const labels = {
      bronze: 'Bronza',
      silver: 'Kumush',
      gold: 'Oltin',
      platinum: 'Platina',
    };
    return labels[level] || level;
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FooterAwareView style={styles.container}>
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
      {/* Points Card */}
      {loyalty && (
        <View style={[styles.pointsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.pointsHeader}>
            <View>
              <Text style={[styles.pointsLabel, { color: colors.textLight }]}>Jami bonuslar</Text>
              <Text style={[styles.pointsValue, { color: colors.primary }]}>
                {loyalty.points.toLocaleString('uz-UZ')}
              </Text>
            </View>
            <View style={[styles.vipBadge, { backgroundColor: getVipLevelColor(loyalty.vip_level) }]}>
              <Ionicons name="trophy" size={24} color={Colors.textDark} />
              <Text style={[styles.vipText, { color: Colors.textDark }]}>
                {getVipLevelLabel(loyalty.vip_level)}
              </Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.success }]}>
                {loyalty.total_earned.toLocaleString('uz-UZ')}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Yig'ilgan</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.danger }]}>
                {loyalty.total_spent.toLocaleString('uz-UZ')}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Sarflangan</Text>
            </View>
          </View>
        </View>
      )}

      {/* How to Earn */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bonuslar qanday yig'iladi?</Text>
        <View style={styles.infoItem}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Har bir xarid uchun 1% bonus
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Do'stni taklif qilish uchun bonus
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            A'zo bo'lish uchun bonus
          </Text>
        </View>
      </View>

      {/* Transactions */}
      <View style={[styles.transactionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tranzaksiyalar</Text>
        {transactions.length > 0 ? (
          transactions.map((transaction) => (
            <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
              <View style={styles.transactionInfo}>
                <Ionicons
                  name={transaction.points > 0 ? 'add-circle' : 'remove-circle'}
                  size={24}
                  color={transaction.points > 0 ? Colors.success : Colors.danger}
                />
                <View style={styles.transactionDetails}>
                  <Text style={[styles.transactionDescription, { color: colors.text }]}>
                    {transaction.description || getTransactionTypeLabel(transaction.transaction_type)}
                  </Text>
                  <Text style={[styles.transactionDate, { color: colors.textLight }]}>
                    {new Date(transaction.created_at).toLocaleDateString('uz-UZ', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.transactionPoints,
                  { color: transaction.points > 0 ? Colors.success : Colors.danger },
                ]}
              >
                {transaction.points > 0 ? '+' : ''}{transaction.points.toLocaleString('uz-UZ')}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textLight }]}>
            Hozircha tranzaksiyalar yo'q
          </Text>
        )}
      </View>
      </ScrollView>
      <Footer currentScreen="profile" />
    </FooterAwareView>
  );
}

const getTransactionTypeLabel = (type) => {
  const labels = {
    earned: 'Yig\'ilgan',
    spent: 'Sarflangan',
    expired: 'Muddati o\'tgan',
    bonus: 'Bonus',
  };
  return labels[type] || type;
};

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
  pointsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pointsLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  vipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  infoCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  transactionsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionPoints: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});
