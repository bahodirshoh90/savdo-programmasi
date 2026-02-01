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
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import Footer, { FooterAwareView } from '../components/Footer';
import Colors from '../constants/colors';
import api from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
// ✅ PUSH NOTIFICATION IMPORTS
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getExpoPushToken, registerDeviceToken, requestNotificationPermissions } from '../services/notifications';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { theme, isDark, colors, toggleTheme } = useTheme();
  const { language, changeLanguage, t } = useLanguage();
  const [customerData, setCustomerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactData, setContactData] = useState({
    issueType: 'other',
    message: '',
  });
  const [isSendingContact, setIsSendingContact] = useState(false);

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

  const performLogout = async () => {
    console.log('[LOGOUT] Step 1: Starting logout process...');
    let logoutSuccess = false;
    let errorMessage = null;
    
    const Platform = require('react-native').Platform;
    const isWeb = Platform.OS === 'web';
    
    try {
      console.log('[LOGOUT] Step 2: Calling logout function from AuthContext...');
      await logout();
      logoutSuccess = true;
      console.log('[LOGOUT] Step 3: Logout function completed successfully');
    } catch (error) {
      logoutSuccess = false;
      errorMessage = error.message || 'Noma\'lum xatolik';
      console.error('[LOGOUT] Step 3: Logout error:', error);
      console.error('[LOGOUT] Error details:', {
        message: error.message,
        stack: error.stack,
      });
      
      if (isWeb) {
        alert(`Chiqishda xatolik: ${errorMessage}`);
      } else {
        Alert.alert('Xatolik', `Chiqishda xatolik: ${errorMessage}`);
      }
    }
    
    console.log('[LOGOUT] Step 4: Attempting navigation reset...');
    let navigationSuccess = false;
    
    setTimeout(() => {
      try {
        if (navigation) {
          console.log('[LOGOUT] Step 5: Navigation object available');
          let rootNav = navigation;
          try {
            const parent1 = navigation.getParent?.();
            console.log('[LOGOUT] First parent exists:', !!parent1);
            if (parent1) {
              const parent2 = parent1.getParent?.();
              console.log('[LOGOUT] Second parent exists:', !!parent2);
              rootNav = parent2 || parent1 || navigation;
            }
          } catch (e) {
            console.log('[LOGOUT] Could not get parent, using current navigation');
            console.error('[LOGOUT] Parent error:', e.message);
          }
          
          console.log('[LOGOUT] Step 6: Attempting reset with rootNav');
          if (rootNav && typeof rootNav.reset === 'function') {
            rootNav.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
            navigationSuccess = true;
            console.log('[LOGOUT] Step 7: Navigation reset completed successfully');
          } else {
            console.log('[LOGOUT] Step 6: reset not available, trying CommonActions');
            try {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
              navigationSuccess = true;
              console.log('[LOGOUT] Step 7: CommonActions.reset completed successfully');
            } catch (dispatchError) {
              console.error('[LOGOUT] CommonActions.reset error:', dispatchError.message);
              throw dispatchError;
            }
          }
        } else {
          const errorMsg = 'Navigation obyekti topilmadi';
          console.error('[LOGOUT] Step 5:', errorMsg);
          if (!isWeb) {
            Alert.alert('Xatolik', errorMsg);
          }
        }
      } catch (e) {
        console.error('[LOGOUT] Navigation error:', e);
        console.error('[LOGOUT] Error message:', e.message);
        console.error('[LOGOUT] Error stack:', e.stack);
        
        if (logoutSuccess && !navigationSuccess) {
          const navErrorMsg = `Chiqish muvaffaqiyatli, lekin sahifaga o'tishda xatolik: ${e.message || 'Noma\'lum xatolik'}`;
          if (isWeb) {
            alert(navErrorMsg);
            window.location.href = '/';
          } else {
            Alert.alert('Xatolik', navErrorMsg);
          }
        }
      }
    }, 200);
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword.trim()) {
      Alert.alert('Xatolik', 'Joriy parolni kiriting');
      return;
    }

    if (!passwordData.newPassword.trim() || passwordData.newPassword.length < 4) {
      Alert.alert('Xatolik', 'Yangi parol kamida 4 belgi bo\'lishi kerak');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Xatolik', 'Yangi parollar mos kelmayapti');
      return;
    }

    setIsChangingPassword(true);
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (!customerId) {
        Alert.alert('Xatolik', 'Mijoz ma\'lumotlari topilmadi. Iltimos, qayta login qiling.');
        setIsChangingPassword(false);
        return;
      }

      const updateData = {
        password: passwordData.newPassword,
      };

      await api.put(API_ENDPOINTS.CUSTOMERS.UPDATE(customerId), updateData);
      
      Alert.alert('Muvaffaqiyatli', 'Parol muvaffaqiyatli o\'zgartirildi', [
        {
          text: 'OK',
          onPress: () => {
            setShowPasswordModal(false);
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Parolni o\'zgartirishda xatolik';
      Alert.alert('Xatolik', errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleContactAdmin = async () => {
    if (!contactData.message.trim()) {
      Alert.alert('Xatolik', 'Xabaringizni kiriting');
      return;
    }

    setIsSendingContact(true);
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      const response = await api.post('/help-request', {
        message: contactData.message.trim(),
        issue_type: contactData.issueType,
      }, {
        headers: {
          'X-Customer-ID': customerId || '',
        },
      });

      Alert.alert('Muvaffaqiyatli', response.message || 'Xabar yuborildi. Admin tez orada siz bilan bog\'lanadi.', [
        {
          text: 'OK',
          onPress: () => {
            setShowContactModal(false);
            setContactData({
              issueType: 'other',
              message: '',
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Error sending contact message:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Xabar yuborishda xatolik';
      Alert.alert('Xatolik', errorMessage);
    } finally {
      setIsSendingContact(false);
    }
  };

  const handleLogout = async () => {
    console.log('[LOGOUT] Logout button pressed');
    
    const Platform = require('react-native').Platform;
    const isWeb = Platform.OS === 'web';
    
    if (isWeb) {
      const confirmed = window.confirm('Tizimdan chiqmoqchimisiz?');
      if (!confirmed) {
        console.log('[LOGOUT] Logout cancelled by user (web)');
        return;
      }
      console.log('[LOGOUT] User confirmed logout (web)');
      performLogout();
    } else {
      Alert.alert(
        'Chiqish',
        'Tizimdan chiqmoqchimisiz?',
        [
          { 
            text: 'Bekor qilish', 
            style: 'cancel',
            onPress: () => {
              console.log('[LOGOUT] Logout cancelled by user');
            }
          },
          {
            text: 'Chiqish',
            style: 'destructive',
            onPress: () => {
              console.log('[LOGOUT] User confirmed logout');
              performLogout();
            },
          },
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

  return (
    <FooterAwareView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      {/* ✅ ADVANCED DEBUG PUSH TOKEN COMPONENT */}
      <AdvancedDebugPushToken />

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
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Telefon:</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Telefon"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={[styles.fieldValue, { color: colors.text }]}>{customerData?.phone || '-'}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Manzil:</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Manzil"
              placeholderTextColor={colors.textLight}
              multiline
            />
          ) : (
            <Text style={[styles.fieldValue, { color: colors.text }]}>{customerData?.address || '-'}</Text>
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
        <Text style={styles.sectionTitle}>Sozlamalar</Text>
        <TouchableOpacity
          style={styles.settingButton}
          onPress={() => {
            const newTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
            toggleTheme(newTheme);
          }}
        >
          <View style={styles.settingRow}>
            <Ionicons 
              name={isDark ? 'moon' : 'sunny'} 
              size={24} 
              color={colors.primary} 
              style={styles.settingIcon}
            />
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Tema</Text>
              <Text style={[styles.settingValue, { color: colors.textLight }]}>
                {theme === 'system' ? 'Tizim' : theme === 'dark' ? 'Qorong\'u' : 'Yorug\'lik'}
              </Text>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={colors.textLight} 
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingButton}
          onPress={() => {
            const newLang = language === 'uz' ? 'ru' : 'uz';
            changeLanguage(newLang);
          }}
        >
          <View style={styles.settingRow}>
            <Ionicons 
              name="language" 
              size={24} 
              color={colors.primary} 
              style={styles.settingIcon}
            />
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Til</Text>
              <Text style={[styles.settingValue, { color: colors.textLight }]}>
                {language === 'uz' ? 'O\'zbek' : 'Русский'}
              </Text>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20}
              color={colors.textLight} 
            />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Xavfsizlik</Text>
        <TouchableOpacity
          style={styles.changePasswordButton}
          onPress={() => setShowPasswordModal(true)}
        >
          <Text style={styles.changePasswordButtonText}>Parolni o'zgartirish</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Yordam va Sevimlilar</Text>
        <TouchableOpacity
          style={styles.changePasswordButton}
          onPress={() => navigation.navigate('Favorites')}
        >
          <Ionicons name="heart-outline" size={20} color={Colors.surface} style={{ marginRight: 8 }} />
          <Text style={styles.changePasswordButtonText}>Sevimlilar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.changePasswordButton, { marginTop: 8 }]}
          onPress={() => navigation.navigate('ChatList')}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={Colors.surface} style={{ marginRight: 8 }} />
          <Text style={styles.changePasswordButtonText}>Chat / Yordam</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.changePasswordButton, { marginTop: 8 }]}
          onPress={() => navigation.navigate('PriceAlerts')}
        >
          <Ionicons name="notifications-outline" size={20} color={Colors.surface} style={{ marginRight: 8 }} />
          <Text style={styles.changePasswordButtonText}>Narx Eslatmalari</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Qarz balansi</Text>
        <Text style={[styles.debtAmount, { color: colors.primary }]}>
          {customerData?.debt_balance?.toLocaleString('uz-UZ') || '0'} so'm
        </Text>
        <TouchableOpacity
          style={styles.paymentHistoryButton}
          onPress={() => navigation.navigate('PaymentHistory')}
        >
          <Ionicons name="receipt-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.paymentHistoryButtonText}>To'lov tarixi</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Referal')}
        >
          <Ionicons name="people-outline" size={24} color={colors.primary} />
          <Text style={[styles.menuItemText, { color: colors.text }]}>Do'stni Taklif Qilish</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Loyalty')}
        >
          <Ionicons name="trophy-outline" size={24} color={colors.primary} />
          <Text style={[styles.menuItemText, { color: colors.text }]}>Bonus Tizimi</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.danger }]} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Chiqish</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showContactModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Admin bilan bog'lanish</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Muammo turi:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={contactData.issueType}
                    onValueChange={(value) => setContactData({ ...contactData, issueType: value })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Buyurtma haqida" value="order" />
                    <Picker.Item label="Mahsulot haqida" value="product" />
                    <Picker.Item label="To'lov haqida" value="payment" />
                    <Picker.Item label="Boshqa" value="other" />
                  </Picker>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Xabar:</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={contactData.message}
                  onChangeText={(text) => setContactData({ ...contactData, message: text })}
                  placeholder="Xabaringizni yozing..."
                  multiline
                  numberOfLines={5}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowContactModal(false);
                    setContactData({
                      issueType: 'other',
                      message: '',
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Bekor qilish</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, isSendingContact && styles.saveButtonDisabled]}
                  onPress={handleContactAdmin}
                  disabled={isSendingContact}
                >
                  {isSendingContact ? (
                    <ActivityIndicator color={Colors.surface} />
                  ) : (
                    <Text style={styles.saveButtonText}>Yuborish</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Parolni o'zgartirish</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Joriy parol:</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
                  placeholder="Joriy parolni kiriting"
                  secureTextEntry
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Yangi parol:</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                  placeholder="Yangi parol (min. 4 belgi)"
                  secureTextEntry
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Yangi parolni tasdiqlash:</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                  placeholder="Yangi parolni qayta kiriting"
                  secureTextEntry
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowPasswordModal(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Bekor qilish</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, isChangingPassword && styles.saveButtonDisabled]}
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <ActivityIndicator color={Colors.surface} />
                  ) : (
                    <Text style={styles.saveButtonText}>Saqlash</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
      <Footer currentScreen="profile" />
    </FooterAwareView>
  );
}

// ✅✅✅ ADVANCED DEBUG PUSH TOKEN COMPONENT - ProfileScreen ichida ✅✅✅
function AdvancedDebugPushToken() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  
  const updateResult = (key, value) => {
    setResults(prev => ({ ...prev, [key]: value }));
  };
  
  const testStep1_CheckCustomerId = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customer_id');
      updateResult('customerId', customerId || 'YO\'Q ❌');
      console.log('1. Customer ID:', customerId);
      
      if (!customerId) {
        Alert.alert('Xatolik', 'Customer ID topilmadi! Login qiling.');
        return false;
      }
      return true;
    } catch (e) {
      console.error('Step 1 error:', e);
      updateResult('customerId', 'ERROR: ' + e.message);
      return false;
    }
  };
  
  const testStep2_CheckPermissions = async () => {
    try {
      console.log('2. Checking permissions...');
      const { status } = await Notifications.getPermissionsAsync();
      updateResult('permission', status);
      console.log('2. Permission status:', status);
      
      if (status !== 'granted') {
        console.log('2. Requesting permissions...');
        const result = await Notifications.requestPermissionsAsync();
        updateResult('permission', result.status);
        console.log('2. Permission result:', result.status);
        
        if (result.status !== 'granted') {
          Alert.alert('Xatolik', 'Notification ruxsati berilmadi!\n\nSettings > Apps > YourApp > Permissions > Notifications ni yoqing.');
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error('Step 2 error:', e);
      updateResult('permission', 'ERROR: ' + e.message);
      Alert.alert('Xatolik', 'Permission tekshirishda xatolik: ' + e.message);
      return false;
    }
  };
  
  const testStep3_CheckProjectId = async () => {
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || 
                       Constants?.easConfig?.projectId;
      updateResult('projectId', projectId || 'YO\'Q ⚠️');
      console.log('3. Project ID:', projectId);
      
      if (!projectId) {
        Alert.alert('Ogohlantirish', 'Project ID topilmadi. Bu muammo keltirib chiqarishi mumkin.');
      }
      return true;
    } catch (e) {
      console.error('Step 3 error:', e);
      updateResult('projectId', 'ERROR: ' + e.message);
      return true;
    }
  };
  
  const testStep4_GetToken = async () => {
    try {
      console.log('4. Getting push token...');
      const token = await getExpoPushToken();
      
      if (!token) {
        updateResult('token', 'YO\'Q ❌');
        Alert.alert('Xatolik', 'Push token olinmadi!\n\nConsoleni tekshiring.');
        return null;
      }
      
      updateResult('token', token.substring(0, 40) + '...');
      console.log('4. Token:', token);
      return token;
    } catch (e) {
      console.error('Step 4 error:', e);
      updateResult('token', 'ERROR: ' + e.message);
      Alert.alert('Xatolik', 'Token olishda xatolik: ' + e.message);
      return null;
    }
  };
  
  const testStep5_RegisterToken = async (token) => {
    try {
      console.log('5. Registering token...');
      const registered = await registerDeviceToken(token);
      updateResult('registered', registered ? 'HA ✅' : 'YO\'Q ❌');
      console.log('5. Registration result:', registered);
      
      if (!registered) {
        Alert.alert('Xatolik', 'Token register qilishda xatolik!\n\nBackend loglarini tekshiring.');
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('Step 5 error:', e);
      updateResult('registered', 'ERROR: ' + e.message);
      Alert.alert('Xatolik', 'Register qilishda xatolik: ' + e.message);
      return false;
    }
  };
  
  const runFullTest = async () => {
    setLoading(true);
    setResults({});
    
    try {
      console.log('=== FULL PUSH TOKEN TEST START ===');
      
      const hasCustomerId = await testStep1_CheckCustomerId();
      if (!hasCustomerId) {
        setLoading(false);
        return;
      }
      
      const hasPermission = await testStep2_CheckPermissions();
      if (!hasPermission) {
        setLoading(false);
        return;
      }
      
      await testStep3_CheckProjectId();
      
      const token = await testStep4_GetToken();
      if (!token) {
        setLoading(false);
        return;
      }
      
      const registered = await testStep5_RegisterToken(token);
      
      if (registered) {
        Alert.alert(
          'Muvaffaqiyat! ✅', 
          'Push token muvaffaqiyatli ro\'yxatdan o\'tdi!\n\nEndi admin paneldan push xabar yuboring.'
        );
      }
      
      console.log('=== FULL PUSH TOKEN TEST END ===');
    } catch (e) {
      console.error('Full test error:', e);
      Alert.alert('Xatolik', 'Test davomida xatolik: ' + e.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={advDebugStyles.container}>
      <Text style={advDebugStyles.title}>🔔 Push Token Testi</Text>
      
      <ScrollView style={advDebugStyles.resultsContainer}>
        {Object.keys(results).length > 0 && (
          <>
            <Text style={advDebugStyles.resultsTitle}>Natijalar:</Text>
            {Object.entries(results).map(([key, value]) => (
              <View key={key} style={advDebugStyles.resultRow}>
                <Text style={advDebugStyles.resultKey}>{key}:</Text>
                <Text style={advDebugStyles.resultValue}>{value}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      
      <TouchableOpacity 
        onPress={runFullTest} 
        style={[advDebugStyles.button, loading && advDebugStyles.buttonDisabled]}
        disabled={loading}
      >
        <Text style={advDebugStyles.buttonText}>
          {loading ? 'Testing...' : 'TO\'LIQ TEST BOSHLASH'}
        </Text>
      </TouchableOpacity>
      
      <Text style={advDebugStyles.hint}>
        Console loglarini tekshiring (adb logcat)
      </Text>
    </View>
  );
}

const advDebugStyles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  resultsContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  resultKey: {
    fontWeight: '600',
    width: 100,
  },
  resultValue: {
    flex: 1,
    fontSize: 12,
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  changePasswordButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  changePasswordButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  modalClose: {
    fontSize: 24,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  modalBody: {
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  picker: {
    color: Colors.textDark,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  settingButton: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    marginTop: 2,
  },
  paymentHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  paymentHistoryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
});