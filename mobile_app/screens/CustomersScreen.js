/**
 * Customers Screen
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../constants/colors';
import { getCustomers, getCachedCustomers, createCustomer, getCustomerSalesHistory, getCustomerDebtHistory } from '../services/customers';

export default function CustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    customer_type: 'retail',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyType, setHistoryType] = useState(null); // 'sales' or 'debt'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [])
  );

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers, customerTypeFilter]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const result = await getCustomers('');
      
      // Ensure result is an array
      const data = Array.isArray(result) ? result : (result?.customers || result?.data || []);
      
      if (!Array.isArray(data)) {
        console.error('Customers data is not an array:', result);
        setCustomers([]);
        setFilteredCustomers([]);
        return;
      }
      
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      // Don't show alert if it's just an API error - use cached data silently
      // Only show alert for critical errors (not API HTML errors)
      if (error.message && !error.message.includes('API returned HTML') && !error.useCache) {
        Alert.alert('Xatolik', `Mijozlarni yuklashda xatolik: ${error.message || 'Noma\'lum xatolik'}`);
      }
      // Customers service should already return cached data on error, but if we still get here with empty data,
      // it means the error wasn't properly handled or cache is empty - which is fine, just show empty state
    } finally {
      setIsLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Apply type filter
    if (customerTypeFilter !== 'all') {
      filtered = filtered.filter(c => c && c.customer_type === customerTypeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c && c.name && c.name.toLowerCase().includes(query)) ||
          (c && c.phone && c.phone.includes(query))
      );
    }

    setFilteredCustomers(filtered);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      Alert.alert('Xatolik', 'Mijoz ismi majburiy!');
      return;
    }

    setIsCreating(true);
    try {
      await createCustomer(newCustomer);
      Alert.alert('Muvaffaqiyatli', 'Mijoz yaratildi!');
      setShowCreateModal(false);
      setNewCustomer({ name: '', phone: '', address: '', customer_type: 'retail' });
      await loadCustomers();
    } catch (error) {
      Alert.alert('Xatolik', error.message || 'Mijoz yaratishda xatolik yuz berdi');
    } finally {
      setIsCreating(false);
    }
  };

  const getCustomerTypeLabel = (type) => {
    const labels = {
      wholesale: 'Ulgurji',
      retail: 'Dona',
      regular: 'Oddiy',
    };
    return labels[type] || type;
  };

  const getCustomerTypeColor = (type) => {
    const colors = {
      wholesale: Colors.primary,
      retail: Colors.secondary,
      regular: Colors.textLight,
    };
    return colors[type] || Colors.textLight;
  };

  const handleViewSalesHistory = async (customer) => {
    console.log('handleViewSalesHistory called for customer:', customer);
    setSelectedCustomer(customer);
    setHistoryType('sales');
    setHistoryData([]); // Clear previous data
    setShowHistoryModal(true);
    setIsLoadingHistory(true);
    
    try {
      console.log('Loading sales history for customer ID:', customer.id);
      const sales = await getCustomerSalesHistory(customer.id);
      console.log('Sales history loaded:', sales?.length || 0, 'items');
      setHistoryData(Array.isArray(sales) ? sales : []);
    } catch (error) {
      console.error('Error in handleViewSalesHistory:', error);
      Alert.alert('Xatolik', `Sotuv tarixini yuklashda xatolik: ${error.message || 'Noma\'lum xatolik'}`);
      setHistoryData([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleViewDebtHistory = async (customer) => {
    console.log('handleViewDebtHistory called for customer:', customer);
    setSelectedCustomer(customer);
    setHistoryType('debt');
    setHistoryData([]); // Clear previous data
    setShowHistoryModal(true);
    setIsLoadingHistory(true);
    
    try {
      console.log('Loading debt history for customer ID:', customer.id);
      const history = await getCustomerDebtHistory(customer.id);
      console.log('Debt history loaded:', history?.length || 0, 'items');
      setHistoryData(Array.isArray(history) ? history : []);
    } catch (error) {
      console.error('Error in handleViewDebtHistory:', error);
      Alert.alert('Xatolik', `Qarz tarixini yuklashda xatolik: ${error.message || 'Noma\'lum xatolik'}`);
      setHistoryData([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const renderCustomer = ({ item }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => {
        // Navigate to customer details or select for order
      }}
    >
      <View style={styles.customerHeader}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          {item.phone && (
            <Text style={styles.customerPhone}>📞 {item.phone}</Text>
          )}
        </View>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: getCustomerTypeColor(item.customer_type) + '20' },
          ]}
        >
          <Text
            style={[
              styles.typeText,
              { color: getCustomerTypeColor(item.customer_type) },
            ]}
          >
            {getCustomerTypeLabel(item.customer_type)}
          </Text>
        </View>
      </View>

      {item.debt_balance > 0 && (
        <View style={styles.debtInfo}>
          <Text style={styles.debtText}>
            Qarz: {item.debt_balance.toLocaleString('uz-UZ')} so'm
          </Text>
        </View>
      )}
      
      <View style={styles.customerActions}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => handleViewSalesHistory(item)}
        >
          <Text style={styles.historyButtonText}>📊 Sotuv tarixi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.historyButton, styles.debtHistoryButton]}
          onPress={() => handleViewDebtHistory(item)}
        >
          <Text style={styles.historyButtonText}>💳 Qarz tarixi</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { flex: 1 }]}
            placeholder="Mijoz qidirish..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterRow}>
          {['all', 'wholesale', 'retail', 'regular'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                customerTypeFilter === type && styles.filterButtonActive,
              ]}
              onPress={() => setCustomerTypeFilter(type)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  customerTypeFilter === type && styles.filterButtonTextActive,
                ]}
              >
                {type === 'all' ? 'Barchasi' : getCustomerTypeLabel(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Create Customer Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Yangi mijoz</Text>
                <TouchableOpacity
                  onPress={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  <Text style={styles.modalCloseButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ism *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mijoz ismi"
                  value={newCustomer.name}
                  onChangeText={(text) => setNewCustomer({ ...newCustomer, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Telefon</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Telefon raqami"
                  value={newCustomer.phone}
                  onChangeText={(text) => setNewCustomer({ ...newCustomer, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Manzil</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Manzil"
                  value={newCustomer.address}
                  onChangeText={(text) => setNewCustomer({ ...newCustomer, address: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Turi</Text>
                <View style={styles.radioGroup}>
                  {['retail', 'wholesale', 'regular'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={styles.radioOption}
                      onPress={() => setNewCustomer({ ...newCustomer, customer_type: type })}
                    >
                      <View style={styles.radio}>
                        {newCustomer.customer_type === type && (
                          <View style={styles.radioSelected} />
                        )}
                      </View>
                      <Text style={styles.radioLabel}>{getCustomerTypeLabel(type)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
                onPress={handleCreateCustomer}
                disabled={isCreating}
              >
                <Text style={styles.submitButtonText}>
                  {isCreating ? 'Yaratilmoqda...' : 'Yaratish'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Customers List */}
      {isLoading && customers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomer}
          keyExtractor={(item, index) => (item?.id?.toString() || `customer-${index}`)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadCustomers}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Mijoz topilmadi' : 'Mijozlar topilmadi'}
              </Text>
            </View>
          }
        />
      )}

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedCustomer?.name || 'Mijoz'} - {historyType === 'sales' ? 'Sotuv Tarixi' : 'Qarz Tarixi'}
              </Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {historyType === 'sales' && (
                <>
                  <View style={styles.historySummary}>
                    <Text style={styles.summaryText}>
                      Jami sotuvlar: {historyData.length} ta
                    </Text>
                    <Text style={styles.summaryText}>
                      Jami summa: {historyData.reduce((sum, s) => sum + (s.total_amount || 0), 0).toLocaleString('uz-UZ')} so'm
                    </Text>
                  </View>
                  
                  {isLoadingHistory ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                      <Text style={styles.loadingText}>Yuklanmoqda...</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={historyData}
                      keyExtractor={(item, index) => `sale-${item?.id || index}`}
                      style={styles.historyList}
                      contentContainerStyle={[
                        styles.historyListContent,
                        historyData.length === 0 && styles.emptyListContent
                      ]}
                      renderItem={({ item }) => (
                        <View style={styles.historyItem}>
                          <View style={styles.historyItemHeader}>
                            <Text style={styles.historyItemTitle}>Sotuv #{item?.id || 'N/A'}</Text>
                            <Text style={styles.historyItemAmount}>
                              {(item?.total_amount || 0).toLocaleString('uz-UZ')} so'm
                            </Text>
                          </View>
                          <Text style={styles.historyItemDate}>
                            {item?.created_at ? new Date(item.created_at).toLocaleString('uz-UZ') : '-'}
                          </Text>
                          {item?.payment_method && (
                            <Text style={styles.historyItemMeta}>
                              To'lov: {item.payment_method === 'cash' ? 'Naqt' : item.payment_method === 'card' ? 'Karta' : item.payment_method}
                            </Text>
                          )}
                        </View>
                      )}
                      ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                          <Text style={styles.emptyText}>Sotuv tarixi topilmadi</Text>
                        </View>
                      }
                    />
                  )}
                </>
              )}

              {historyType === 'debt' && (
                <>
                  <View style={styles.historySummary}>
                    <Text style={styles.summaryText}>
                      Joriy qarz: {(selectedCustomer?.debt_balance || 0).toLocaleString('uz-UZ')} so'm
                    </Text>
                    <Text style={styles.summaryText}>
                      Jami operatsiyalar: {historyData.length} ta
                    </Text>
                  </View>
                  
                  {isLoadingHistory ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                      <Text style={styles.loadingText}>Yuklanmoqda...</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={historyData}
                      keyExtractor={(item, index) => `debt-${item?.id || index}`}
                      style={styles.historyList}
                      contentContainerStyle={[
                        styles.historyListContent,
                        historyData.length === 0 && styles.emptyListContent
                      ]}
                      renderItem={({ item }) => {
                        const typeMap = {
                          'payment': 'To\'lov',
                          'debt_added': 'Qarz qo\'shildi',
                          'debt_paid': 'Qarz to\'landi',
                          'order_payment': 'Buyurtma to\'lovi',
                          'sale_payment': 'Sotuv to\'lovi'
                        };
                        const typeLabel = typeMap[item?.transaction_type] || item?.transaction_type || 'Noma\'lum';
                        const amountColor = (item?.amount || 0) > 0 ? Colors.success : Colors.danger;
                        const amountPrefix = (item?.amount || 0) > 0 ? '+' : '';
                        
                        return (
                          <View style={styles.historyItem}>
                            <View style={styles.historyItemHeader}>
                              <Text style={styles.historyItemTitle}>{typeLabel}</Text>
                              <Text style={[styles.historyItemAmount, { color: amountColor }]}>
                                {amountPrefix}{(item?.amount || 0).toLocaleString('uz-UZ')} so'm
                              </Text>
                            </View>
                            <Text style={styles.historyItemDate}>
                              {item?.created_at ? new Date(item.created_at).toLocaleString('uz-UZ') : '-'}
                            </Text>
                            <View style={styles.debtBalanceRow}>
                              <Text style={styles.historyItemMeta}>
                                Oldin: {(item?.balance_before || 0).toLocaleString('uz-UZ')} so'm
                              </Text>
                              <Text style={styles.historyItemMeta}>
                                Keyin: {(item?.balance_after || 0).toLocaleString('uz-UZ')} so'm
                              </Text>
                            </View>
                            {item?.notes && (
                              <Text style={styles.historyItemNotes}>{item.notes}</Text>
                            )}
                          </View>
                        );
                      }}
                      ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                          <Text style={styles.emptyText}>Qarz tarixi topilmadi</Text>
                        </View>
                      }
                    />
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  listContent: {
    padding: 16,
  },
  customerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: Colors.textLight,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  debtInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  debtText: {
    fontSize: 14,
    color: Colors.danger,
    fontWeight: '600',
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
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.borderLight,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
  },
  modalBody: {
    flex: 1,
    minHeight: 200,
  },
  historyList: {
    flex: 1,
  },
  historyListContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  modalCloseButton: {
    fontSize: 24,
    color: Colors.textLight,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioLabel: {
    fontSize: 16,
    color: Colors.textDark,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  customerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  historyButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  debtHistoryButton: {
    backgroundColor: Colors.secondary,
  },
  historyButtonText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  historySummary: {
    padding: 16,
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 4,
    fontWeight: '600',
  },
  historyItem: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1,
  },
  historyItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  historyItemDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  historyItemMeta: {
    fontSize: 12,
    color: Colors.textLight,
  },
  debtBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  historyItemNotes: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

