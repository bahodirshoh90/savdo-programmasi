/**
 * Referal Screen - Do'stlarni taklif qilish
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Share as RNShare,
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

export default function ReferalScreen({ navigation }) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [referalCode, setReferalCode] = useState('');
  const [totalReferals, setTotalReferals] = useState(0);
  const [totalBonus, setTotalBonus] = useState(0);
  const [referals, setReferals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadReferalData();
    }, [])
  );

  const loadReferalData = async () => {
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
      
      // Get referal code
      const codeResponse = await fetch(`${baseUrl}/referals/my-code`, {
        headers: {
          'X-Customer-ID': customerId,
        },
      });
      
      if (codeResponse.ok) {
        const codeData = await codeResponse.json();
        setReferalCode(codeData.referal_code || '');
        setTotalReferals(codeData.total_referals || 0);
        setTotalBonus(codeData.total_bonus || 0);
      }

      // Get all referals
      const referalsResponse = await fetch(`${baseUrl}/referals`, {
        headers: {
          'X-Customer-ID': customerId,
        },
      });
      
      if (referalsResponse.ok) {
        const referalsData = await referalsResponse.json();
        setReferals(referalsData.referals_sent || []);
        setTotalReferals(referalsData.total_referals || 0);
        setTotalBonus(referalsData.total_bonus_earned || 0);
      }
    } catch (error) {
      console.error('Error loading referal data:', error);
      showToast('Ma\'lumotlarni yuklashda xatolik', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleInvite = async () => {
    if (!invitePhone.trim()) {
      showToast('Telefon raqamni kiriting', 'error');
      return;
    }

    setIsInviting(true);
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        showToast('Foydalanuvchi ma\'lumotlari topilmadi', 'error');
        return;
      }

      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL 
        : `${API_ENDPOINTS.BASE_URL}/api`;
      
      const response = await fetch(`${baseUrl}/referals/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Customer-ID': customerId,
        },
        body: JSON.stringify({
          phone: invitePhone.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast('Do\'st taklif qilindi!', 'success');
        setInvitePhone('');
        loadReferalData();
      } else {
        const errorData = await response.json();
        showToast(errorData.detail || 'Taklif qilishda xatolik', 'error');
      }
    } catch (error) {
      console.error('Error inviting friend:', error);
      showToast('Taklif qilishda xatolik', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleShare = async () => {
    if (!referalCode) {
      showToast('Referal kod topilmadi', 'error');
      return;
    }

    try {
      const message = `Salom! Men sizni Savdo ilovasiga taklif qilmoqchiman. Referal kodingiz: ${referalCode}\n\nIlovani yuklab oling va bu kodni kiriting!`;
      
      await RNShare.share({
        message: message,
        title: 'Do\'stni taklif qilish',
      });
    } catch (error) {
      console.error('Error sharing referal:', error);
      showToast('Ulashishda xatolik', 'error');
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadReferalData();
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
      {/* Referal Code Card */}
      <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.codeLabel, { color: colors.textLight }]}>Sizning referal kodingiz</Text>
        <View style={styles.codeContainer}>
          <Text style={[styles.codeText, { color: colors.primary }]}>{referalCode || 'Yuklanmoqda...'}</Text>
          <TouchableOpacity
            style={[styles.copyButton, { backgroundColor: colors.primary }]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={20} color={Colors.surface} />
            <Text style={styles.copyButtonText}>Ulashish</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{totalReferals}</Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Taklif qilingan</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{totalBonus.toLocaleString('uz-UZ')}</Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Bonus (so'm)</Text>
        </View>
      </View>

      {/* Invite Friend */}
      <View style={[styles.inviteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Do'stni taklif qilish</Text>
        <TextInput
          style={[styles.phoneInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder="Telefon raqami"
          placeholderTextColor={colors.textLight}
          value={invitePhone}
          onChangeText={setInvitePhone}
          keyboardType="phone-pad"
        />
        <TouchableOpacity
          style={[styles.inviteButton, { backgroundColor: colors.primary }, isInviting && styles.inviteButtonDisabled]}
          onPress={handleInvite}
          disabled={isInviting}
        >
          {isInviting ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <>
              <Ionicons name="person-add-outline" size={20} color={Colors.surface} />
              <Text style={styles.inviteButtonText}>Taklif qilish</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Referals List */}
      <View style={[styles.referalsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Taklif qilingan do'stlar</Text>
        {referals.length > 0 ? (
          referals.map((referal) => (
            <View key={referal.id} style={[styles.referalItem, { borderBottomColor: colors.border }]}>
              <View style={styles.referalInfo}>
                <Text style={[styles.referalPhone, { color: colors.text }]}>
                  {referal.phone || 'Noma\'lum'}
                </Text>
                <Text style={[styles.referalStatus, { color: getStatusColor(referal.status) }]}>
                  {getStatusLabel(referal.status)}
                </Text>
              </View>
              {referal.bonus_amount > 0 && (
                <Text style={[styles.referalBonus, { color: Colors.success }]}>
                  +{referal.bonus_amount.toLocaleString('uz-UZ')} so'm
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textLight }]}>
            Hozircha taklif qilingan do'stlar yo'q
          </Text>
        )}
      </View>
      </ScrollView>
      <Footer currentScreen="profile" />
    </FooterAwareView>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return Colors.success;
    case 'registered':
      return Colors.primary;
    case 'pending':
      return Colors.warning;
    default:
      return Colors.textLight;
  }
};

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Kutilmoqda',
    registered: 'Ro\'yxatdan o\'tgan',
    completed: 'Tugallangan',
  };
  return labels[status] || status;
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
  codeCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  codeLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codeText: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  copyButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 20,
  },
  inviteCard: {
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
  phoneInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  referalsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },
  referalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  referalInfo: {
    flex: 1,
  },
  referalPhone: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  referalStatus: {
    fontSize: 12,
  },
  referalBonus: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});
