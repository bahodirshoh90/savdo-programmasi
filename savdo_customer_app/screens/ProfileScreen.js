/**
 * Profile Screen for Customer App
 * UPDATED: Improved styles and responsive design
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
  Dimensions,
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

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

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

      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
      };
      
      const response = await api.put(API_ENDPOINTS.CUSTOMERS.UPDATE(customerId), updateData);
      
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
    console.log('[LOGOUT] Starting logout process...');
    let logoutSuccess = false;
    
    const Platform = require('react-native').Platform;
    const isWeb = Platform.OS === 'web';
    
    try {
      await logout();
      logoutSuccess = true;
      console.log('[LOGOUT] Logout completed successfully');
    } catch (error) {
      console.error('[LOGOUT] Logout error:', error);
      
      if (isWeb) {
        alert(`Chiqishda xatolik: ${error.message || 'Noma\'lum xatolik'}`);
      } else {
        Alert.alert('Xatolik', `Chiqishda xatolik: ${error.message || 'Noma\'lum xatolik'}`);
      }
    }
    
    setTimeout(() => {
      try {
        if (navigation) {
          let rootNav = navigation;
          try {
            const parent1 = navigation.getParent?.();
            if (parent1) {
              const parent2 = parent1.getParent?.();
              rootNav = parent2 || parent1 || navigation;
            }
          } catch (e) {
            console.log('[LOGOUT] Using current navigation');
          }
          
          if (rootNav && typeof rootNav.reset === 'function') {
            rootNav.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } else {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            );
          }
        }
      } catch (e) {
        console.error('[LOGOUT] Navigation error:', e);
        
        if (logoutSuccess && isWeb) {
          window.location.href = '/';
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
    const Platform = require('react-native').Platform;
    const isWeb = Platform.OS === 'web';
    
    if (isWeb) {
      const confirmed = window.confirm('Tizimdan chiqmoqchimisiz?');
      if (!confirmed) return;
      performLogout();
    } else {
      Alert.alert(
        'Chiqish',
        'Tizimdan chiqmoqchimisiz?',
        [
          { text: 'Bekor qilish', style: 'cancel' },
          {
            text: 'Chiqish',
            style: 'destructive',
            onPress: performLogout,
          },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FooterAwareView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.title}>Profil</Text>
        </View>

        {/* Personal Information */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Shaxsiy ma'lumotlar</Text>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Ism:</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Ism"
                placeholderTextColor={colors.textLight}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.text }]}>{customerData?.name || '-'}</Text>
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
                style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
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
                style={[styles.button, styles.saveButton, isSaving && styles.buttonDisabled]} 
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
              <Ionicons name="create-outline" size={20} color={Colors.surface} style={{ marginRight: 8 }} />
              <Text style={styles.editButtonText}>Tahrirlash</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sozlamalar</Text>
          
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

        {/* Security */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Xavfsizlik</Text>
          <TouchableOpacity
            style={styles.changePasswordButton}
            onPress={() => setShowPasswordModal(true)}
          >
            <Text style={styles.changePasswordButtonText}>Parolni o'zgartirish</Text>
          </TouchableOpacity>
        </View>

        {/* Help and Favorites Section */}
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

        {/* Debt Balance */}
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

        {/* Logout */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: colors.danger }]} 
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Chiqish</Text>
          </TouchableOpacity>
        </View>

        {/* Password Change Modal */}
        <Modal
          visible={showPasswordModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPasswordModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Parolni o'zgartirish</Text>
                <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Joriy parol:</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={passwordData.currentPassword}
                    onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
                    placeholder="Joriy parolni kiriting"
                    placeholderTextColor={colors.textLight}
                    secureTextEntry
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Yangi parol:</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={passwordData.newPassword}
                    onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                    placeholder="Yangi parol (min. 4 belgi)"
                    placeholderTextColor={colors.textLight}
                    secureTextEntry
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Yangi parolni tasdiqlash:</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={passwordData.confirmPassword}
                    onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                    placeholder="Yangi parolni qayta kiriting"
                    placeholderTextColor={colors.textLight}
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
                    <Text style={styles.cancelButtonText}>Bekor</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton, isChangingPassword && styles.buttonDisabled]}
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
  header: {
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  section: {
    padding: 20,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: isSmallDevice ? 12 : 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '500',
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: isSmallDevice ? 14 : 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  editButtonText: {
    color: Colors.surface,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.success,
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textDark,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
  },
  settingButton: {
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: isSmallDevice ? 12 : 14,
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
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
  },
  debtAmount: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paymentHistoryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  paymentHistoryButtonText: {
    color: Colors.surface,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemText: {
    flex: 1,
    fontSize: isSmallDevice ? 14 : 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: Colors.danger,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: Colors.surface,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: isSmallDevice ? 16 : 20,
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
    fontSize: isSmallDevice ? 18 : 20,
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
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});