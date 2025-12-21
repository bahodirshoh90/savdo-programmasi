/**
 * Admin Sellers Screen
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/colors';
import api from '../services/api';
import { API_ENDPOINTS } from '../config/api';

export default function AdminSellersScreen() {
  const { permissions } = useAuth();
  const [sellers, setSellers] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.SELLERS.LIST);
      setSellers(response || []);
    } catch (error) {
      console.error('Error loading sellers:', error);
      Alert.alert('Xatolik', 'Sotuvchilarni yuklashda xatolik');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSellers();
    setIsRefreshing(false);
  };

  const renderSeller = ({ item }) => (
    <TouchableOpacity style={styles.sellerCard}>
      <View style={styles.sellerInfo}>
        <Text style={styles.sellerName}>{item.name || 'Noma\'lum'}</Text>
        <Text style={styles.sellerDetails}>
          Username: {item.username || '-'}
        </Text>
        <Text style={styles.sellerDetails}>
          Telefon: {item.phone || '-'}
        </Text>
        <View style={styles.sellerFooter}>
          <Text style={styles.sellerRole}>{item.role_name || 'Rol yo\'q'}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.is_active ? Colors.success : Colors.danger },
            ]}
          >
            <Text style={styles.statusText}>
              {item.is_active ? 'Faol' : 'Nofaol'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sellers}
        renderItem={renderSeller}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sotuvchilar topilmadi</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  sellerCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  sellerDetails: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  sellerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sellerRole: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
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

