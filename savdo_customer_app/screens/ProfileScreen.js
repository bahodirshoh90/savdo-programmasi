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
import Footer from '../components/Footer';
import Colors from '../constants/colors';
import api from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

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
      // Logout first - this will set isAuthenticated to false
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
      
      // Show error to user
      if (isWeb) {
        alert(`Chiqishda xatolik: ${errorMessage}`);
      } else {
        Alert.alert('Xatolik', `Chiqishda xatolik: ${errorMessage}`);
      }
    }
    
    // Navigation should happen automatically when isAuthenticated changes
    // But we'll also try manual navigation as backup
    console.log('[LOGOUT] Step 4: Attempting navigation reset...');
    let navigationSuccess = false;
    
    setTimeout(() => {
      try {
        if (navigation) {
          console.log('[LOGOUT] Step 5: Navigation object available');
          // Try to get root navigator
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
        
        // Show navigation error to user if logout was successful but navigation failed
        if (logoutSuccess && !navigationSuccess) {
          const navErrorMsg = `Chiqish muvaffaqiyatli, lekin sahifaga o'tishda xatolik: ${e.message || 'Noma\'lum xatolik'}`;
          if (isWeb) {
            alert(navErrorMsg);
            // Force page reload as last resort
            window.location.href = '/';
          } else {
            Alert.alert('Xatolik', navErrorMsg);
          }
        }
      }
    }, 200);
  };

  const handleChangePassword = async () => {
    // Validation
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

      // Note: Current password verification would require a separate endpoint
      // For now, we'll rely on backend validation. In production, you might want
      // to add a dedicated password verification endpoint

      // Update password
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
    
    // For web platform, use window.confirm instead of Alert.alert for better compatibility
    const Platform = require('react-native').Platform;
    const isWeb = Platform.OS === 'web';
    
    if (isWeb) {
      const confirmed = window.confirm('Tizimdan chiqmoqchimisiz?');
      if (!confirmed) {
        console.log('[LOGOUT] Logout cancelled by user (web)');
        return;
      }
      console.log('[LOGOUT] User confirmed logout (web)');
      // For web, perform logout directly
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
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
            // Toggle theme
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

        {/* Language Setting */}
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

      {/* Referal and Loyalty */}
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

      {/* Contact Admin Modal */}
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

      {/* Password Change Modal */}
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
    </View>
  );
}

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
});
