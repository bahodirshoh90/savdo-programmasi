/**
 * Receipt Screen - Display sale receipt in the app
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Colors from '../constants/colors';
import { getSale } from '../services/sales';
import { formatDateTime } from '../utils/dateUtils';

export default function ReceiptScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { saleId } = route.params;
  const [sale, setSale] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSale();
  }, [saleId]);

  const loadSale = async () => {
    setIsLoading(true);
    try {
      const saleData = await getSale(saleId);
      if (saleData) {
        setSale(saleData);
      } else {
        Alert.alert('Xatolik', 'Sotuv topilmadi');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading sale:', error);
      Alert.alert('Xatolik', error.message || 'Sotuv ma\'lumotlarini yuklashda xatolik');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };


  const formatPaymentMethod = (method) => {
    const methods = {
      cash: 'Naqt',
      card: 'Karta',
      transfer: 'O\'tkazma',
    };
    return methods[method] || method || 'N/A';
  };

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      window.print();
    } else {
      Alert.alert(
        'Print qilish',
        'Print funksiyasi web versiyasida ishlaydi. Web versiyaga o\'tishni xohlaysizmi?',
        [
          { text: 'Bekor qilish', style: 'cancel' },
          { text: 'Ha', onPress: () => {} },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!sale) {
    return null;
  }

  const totalAmount = sale.total_amount || 0;
  const paymentAmount = sale.payment_amount || 0;
  const difference = paymentAmount - totalAmount;
  const hasExcess = difference > 0;
  const hasDebt = difference < 0;
  const debtAmount = Math.abs(difference);
  const customerDebtBalance = sale.customer_debt_balance || 0;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CHEK</Text>
        <Text style={styles.headerSubtitle}>Sotuv #{sale.id}</Text>
      </View>

      {/* Company Info */}
      <View style={styles.section}>
        <Text style={styles.companyName}>Savdo Dasturi</Text>
        <Text style={styles.dateText}>{formatDateTime(sale.created_at)}</Text>
      </View>

      {/* Customer Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mijoz:</Text>
        <Text style={styles.customerName}>{sale.customer_name || 'Noma\'lum'}</Text>
      </View>

      {/* Seller Info */}
      {sale.seller_name && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sotuvchi:</Text>
          <Text style={styles.sellerName}>{sale.seller_name}</Text>
        </View>
      )}

      {/* Items */}
      <View style={styles.itemsSection}>
        <View style={styles.itemsHeader}>
          <Text style={styles.itemsHeaderText}>Mahsulot</Text>
          <Text style={styles.itemsHeaderText}>Miqdor</Text>
          <Text style={styles.itemsHeaderText}>Summa</Text>
        </View>

        {sale.items && sale.items.length > 0 ? (
          sale.items.map((item, index) => (
            <View key={item.id || index} style={styles.itemRow}>
              <View style={styles.itemNameContainer}>
                <Text style={styles.itemName}>{item.product_name || 'Noma\'lum mahsulot'}</Text>
                <Text style={styles.itemDetails}>
                  {item.packages_sold > 0 && `${item.packages_sold} qop`}
                  {item.packages_sold > 0 && item.pieces_sold > 0 && ' + '}
                  {item.pieces_sold > 0 && `${item.pieces_sold} dona`}
                  {item.packages_sold === 0 && item.pieces_sold === 0 && `${item.requested_quantity} dona`}
                </Text>
              </View>
              <Text style={styles.itemQuantity}>{item.requested_quantity}</Text>
              <Text style={styles.itemAmount}>
                {(item.subtotal || 0).toLocaleString('uz-UZ')} so'm
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noItems}>Mahsulotlar topilmadi</Text>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Jami:</Text>
          <Text style={styles.totalAmount}>
            {totalAmount.toLocaleString('uz-UZ')} so'm
          </Text>
        </View>

        {paymentAmount > 0 && (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>To'landi:</Text>
              <Text style={styles.totalAmount}>
                {paymentAmount.toLocaleString('uz-UZ')} so'm
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>To'lov usuli:</Text>
              <Text style={styles.totalAmount}>
                {formatPaymentMethod(sale.payment_method)}
              </Text>
            </View>

            {hasExcess && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {sale.excess_action === 'debt' && customerDebtBalance > 0
                    ? 'Qarzga olib qolindi:'
                    : sale.excess_action === 'debt'
                      ? 'Qarzga qo\'shildi:'
                      : 'Ortiqcha summa:'}
                </Text>
                <Text style={[styles.totalAmount, styles.excessAmount]}>
                  {difference.toLocaleString('uz-UZ')} so'm
                </Text>
              </View>
            )}

            {hasDebt && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Qarz:</Text>
                <Text style={[styles.totalAmount, styles.debtAmount]}>
                  {debtAmount.toLocaleString('uz-UZ')} so'm
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Rahmat!</Text>
        {sale.requires_admin_approval && sale.admin_approved && (
          <Text style={styles.approvedText}>
            ✓ Admin tomonidan tasdiqlangan
          </Text>
        )}
        {sale.requires_admin_approval && sale.admin_approved === null && (
          <Text style={styles.pendingText}>
            ⏳ Admin tasdigini kutmoqda
          </Text>
        )}
      </View>
      
      {/* Print Button */}
      <View style={styles.printButtonContainer}>
        <TouchableOpacity 
          style={styles.printButton}
          onPress={handlePrint}
        >
          <Text style={styles.printButtonText}>🖨️ Print qilish</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100, // Extra padding for print button
    flexGrow: 1,
  },
  printButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Platform.select({
      web: {
        position: 'relative',
        marginTop: 20,
      },
    }),
  },
  printButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  printButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
  },
  section: {
    marginBottom: 16,
  },
  companyName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  itemsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 12,
  },
  itemsHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemNameContainer: {
    flex: 2,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 12,
    color: Colors.textLight,
  },
  itemQuantity: {
    fontSize: 14,
    color: Colors.text,
    flex: 0.5,
    textAlign: 'center',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1,
    textAlign: 'right',
  },
  noItems: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    padding: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  totalsSection: {
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  excessAmount: {
    color: Colors.success,
  },
  debtAmount: {
    color: Colors.warning,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  approvedText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  pendingText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600',
  },
});

