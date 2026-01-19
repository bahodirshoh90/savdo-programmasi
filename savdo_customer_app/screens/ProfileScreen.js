/**
 * Profile Screen for Customer App
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/colors';
import api from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [customerData, setCustomerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });

  useFocusEffect(
    useCallback(() => {
      loadCustomerData();
    }, [])
  );

  const loadCustomerData = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (customerId) {
        const response = await api.get(API_ENDPOINTS.CUSTOMERS.GET(customerId));
        setCustomerData(response);
        setFormData({
          name: response.name || '',
          phone: response.phone || '',
          address: response.address || '',
        });
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Xatolik', 'Ismni kiriting');
      return;
    }

    setIsSaving(true);
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        Alert.alert('Xatolik', 'Mijoz ma\'lumotlari topilmadi. Iltimos, qayta login qiling.');
        setIsSaving(false);
        return;
      }

      console.log('Updating customer with ID:', customerId);
      console.log('Form data:', formData);
      
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
      };
      
      const response = await api.put(API_ENDPOINTS.CUSTOMERS.UPDATE(customerId), updateData);
      console.log('Update response:', response);
      
      Alert.alert('Muvaffaqiyatli', 'Ma\'lumotlar yangilandi');
      setIsEditing(false);
      await loadCustomerData();
    } catch (error) {
      console.error('Error updating customer:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Ma\'lumotlarni yangilashda xatolik';
      Alert.alert('Xatolik', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Chiqish',
      'Tizimdan chiqmoqchimisiz?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Chiqish',
          style: 'destructive',
          onPress: async () => {
            try {
              // Logout first
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              // Always navigate to login screen, even if logout fails
              if (navigation) {
                // Use reset to clear navigation stack and go to login
                navigation.getParent()?.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
                // Also try direct navigation as fallback
                navigation.navigate('Login');
              }
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shaxsiy ma'lumotlar</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Ism:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Ism"
            />
          ) : (
            <Text style={styles.fieldValue}>{customerData?.name || '-'}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Telefon:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Telefon"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.fieldValue}>{customerData?.phone || '-'}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Manzil:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Manzil"
              multiline
            />
          ) : (
            <Text style={styles.fieldValue}>{customerData?.address || '-'}</Text>
          )}
        </View>

        {isEditing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setIsEditing(false);
                setFormData({
                  name: customerData?.name || '',
                  phone: customerData?.phone || '',
                  address: customerData?.address || '',
                });
              }}
            >
              <Text style={styles.cancelButtonText}>Bekor qilish</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.saveButton, isSaving && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <Text style={styles.saveButtonText}>Saqlash</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.editButton]}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.editButtonText}>Tahrirlash</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Qarz balansi</Text>
        <Text style={styles.debtAmount}>
          {customerData?.debt_balance?.toLocaleString('uz-UZ') || '0'} so'm
        </Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Chiqish</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  section: {
    backgroundColor: Colors.surface,
    padding: 20,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: Colors.textDark,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textDark,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  editButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.success,
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
  debtAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.warning,
  },
  logoutButton: {
    backgroundColor: Colors.danger,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
