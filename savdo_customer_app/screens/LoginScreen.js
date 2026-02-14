/**
 * Login Screen for Customer App
 * Supports: Username/Password, OTP, and Social Login
 * UPDATED: Added password visibility toggle with eye icon + responsive design
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { login as authLogin, signup, storeAuthData } from '../services/auth';
import api from '../services/api';
import Colors from '../constants/colors';
import { API_ENDPOINTS } from '../config/api';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function LoginScreen() {
  const { login } = useAuth();
  const [loginMethod, setLoginMethod] = useState('password'); // 'password', 'otp', 'social'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  
  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  
  // Reset Password Modal
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    username_or_phone: '',
    new_password: '',
    confirm_password: '',
  });
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Registration Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: '',
    phone: '',
    username: '',
    password: '',
    confirm_password: '',
    address: '',
  });
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Help Request Modal
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpData, setHelpData] = useState({
    phone: '',
    issue_type: 'other',
    message: '',
  });
  const [isSendingHelp, setIsSendingHelp] = useState(false);

  // Helper function to close reset password modal and reset states
  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setResetPasswordData({
      username_or_phone: '',
      new_password: '',
      confirm_password: '',
    });
    setShowResetNewPassword(false);
    setShowResetConfirmPassword(false);
  };

  // Helper function to close registration modal and reset states
  const closeRegisterModal = () => {
    setShowRegisterModal(false);
    setRegisterData({
      name: '',
      phone: '',
      username: '',
      password: '',
      confirm_password: '',
      address: '',
    });
    setShowRegPassword(false);
    setShowRegConfirmPassword(false);
  };

  const handlePasswordLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Xatolik', 'Login va parolni kiriting');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authLogin(username.trim(), password);
      if (result.success) {
        await login(result.user, result.token);
      } else {
        Alert.alert('Xatolik', result.error || 'Kirishda xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Xatolik', 'Kirishda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      Alert.alert('Xatolik', 'Telefon raqamni kiriting');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^\+?[0-9]{9,15}$/;
    const cleanPhone = phone.trim().replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      Alert.alert('Xatolik', 'Noto\'g\'ri telefon raqam formati');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/send-otp', {
        phone: cleanPhone,
      });

      if (response.success) {
        setOtpSent(true);
        setShowOtpModal(true);
        Alert.alert('Muvaffaqiyatli', response.message || 'OTP kodi yuborildi');
      } else {
        Alert.alert('Xatolik', response.error || 'OTP yuborishda xatolik');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'OTP yuborishda xatolik';
      Alert.alert('Xatolik', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!phone.trim() || !otpCode.trim()) {
      Alert.alert('Xatolik', 'Telefon raqam va OTP kodni kiriting');
      return;
    }

    const cleanPhone = phone.trim().replace(/\s/g, '');
    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        phone: cleanPhone,
        code: otpCode.trim(),
      });

      if (response.success && response.token && response.user) {
        const storedUser = await storeAuthData({
          token: response.token,
          user: response.user,
          customer_id: response.customer_id,
          customer_name: response.customer_name,
        });
        await login(storedUser);
        setShowOtpModal(false);
        setOtpCode('');
        setOtpSent(false);
        setPhone('');
      } else {
        Alert.alert('Xatolik', response.error || 'OTP tasdiqlashda xatolik');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'OTP tasdiqlashda xatolik';
      Alert.alert('Xatolik', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    if (!phone.trim()) {
      Alert.alert('Xatolik', 'Ijtimoiy tarmoq orqali kirish uchun telefon raqamni kiriting');
      return;
    }

    const cleanPhone = phone.trim().replace(/\s/g, '');
    const phoneRegex = /^\+?[0-9]{9,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      Alert.alert('Xatolik', 'Noto\'g\'ri telefon raqam formati');
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post('/auth/social-login', {
        provider: provider,
        phone: cleanPhone,
        name: `Social User ${cleanPhone}`,
      });

      if (response.token && response.user) {
        const { token, user } = response;
        const storedUser = await storeAuthData({
          token,
          user,
          customer_id: response.customer_id,
          customer_name: response.customer_name,
        });
        await login(storedUser);
        Alert.alert('Muvaffaqiyatli', `${provider === 'google' ? 'Google' : 'Facebook'} orqali kirildi`);
      } else {
        Alert.alert('Xatolik', 'Ijtimoiy tarmoq orqali kirishda xatolik');
      }
    } catch (error) {
      console.error('Social login error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Ijtimoiy tarmoq orqali kirishda xatolik';
      Alert.alert('Xatolik', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordData.username_or_phone.trim()) {
      Alert.alert('Xatolik', 'Login yoki telefon raqamni kiriting');
      return;
    }
    if (!resetPasswordData.new_password.trim() || resetPasswordData.new_password.length < 4) {
      Alert.alert('Xatolik', 'Yangi parol kamida 4 belgi bo\'lishi kerak');
      return;
    }
    if (resetPasswordData.new_password !== resetPasswordData.confirm_password) {
      Alert.alert('Xatolik', 'Parollar mos kelmayapti');
      return;
    }

    setIsResettingPassword(true);
    try {
      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL 
        : `${API_ENDPOINTS.BASE_URL}/api`;
      
      const response = await fetch(`${baseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username_or_phone: resetPasswordData.username_or_phone.trim(),
          new_password: resetPasswordData.new_password,
        }),
      });

      if (response.ok) {
        Alert.alert('Muvaffaqiyatli', 'Parol muvaffaqiyatli o\'zgartirildi', [
          {
            text: 'OK',
            onPress: () => {
              closeResetPasswordModal();
            },
          },
        ]);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Parolni o\'zgartirishda xatolik');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Xatolik', error.message || 'Parolni o\'zgartirishda xatolik');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleRegister = async () => {
    if (!registerData.name.trim()) {
      Alert.alert('Xatolik', 'Ismni kiriting');
      return;
    }
    if (!registerData.phone.trim()) {
      Alert.alert('Xatolik', 'Telefon raqamni kiriting');
      return;
    }
    if (!registerData.username.trim()) {
      Alert.alert('Xatolik', 'Login kiriting');
      return;
    }
    if (!registerData.password.trim() || registerData.password.length < 4) {
      Alert.alert('Xatolik', 'Parol kamida 4 belgi bo\'lishi kerak');
      return;
    }
    if (registerData.password !== registerData.confirm_password) {
      Alert.alert('Xatolik', 'Parollar mos kelmayapti');
      return;
    }

    setIsRegistering(true);
    try {
      const result = await signup({
        name: registerData.name.trim(),
        phone: registerData.phone.trim(),
        username: registerData.username.trim(),
        password: registerData.password,
        address: registerData.address.trim() || '',
      });

      if (result.success) {
        Alert.alert('Muvaffaqiyatli', result.message || 'Ro\'yxatdan o\'tdingiz!', [
          {
            text: 'OK',
            onPress: () => {
              closeRegisterModal();
            },
          },
        ]);
      } else {
        Alert.alert('Xatolik', result.error || 'Ro\'yxatdan o\'tishda xatolik');
      }
    } catch (error) {
      console.error('Register error:', error);
      Alert.alert('Xatolik', 'Ro\'yxatdan o\'tishda xatolik');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSendHelpRequest = async () => {
    if (!helpData.phone.trim()) {
      Alert.alert('Xatolik', 'Telefon raqamni kiriting');
      return;
    }
    if (!helpData.message.trim()) {
      Alert.alert('Xatolik', 'Xabarni kiriting');
      return;
    }

    setIsSendingHelp(true);
    try {
      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL 
        : `${API_ENDPOINTS.BASE_URL}/api`;
      
      const response = await fetch(`${baseUrl}/help-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: helpData.phone.trim(),
          issue_type: helpData.issue_type,
          message: helpData.message.trim(),
        }),
      });

      if (response.ok) {
        Alert.alert('Muvaffaqiyatli', 'Xabaringiz yuborildi. Tez orada admin siz bilan bog\'lanadi', [
          {
            text: 'OK',
            onPress: () => {
              setShowHelpModal(false);
              setHelpData({
                phone: '',
                issue_type: 'other',
                message: '',
              });
            },
          },
        ]);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Xabar yuborishda xatolik');
      }
    } catch (error) {
      console.error('Help request error:', error);
      Alert.alert('Xatolik', error.message || 'Xabar yuborishda xatolik');
    } finally {
      setIsSendingHelp(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <Ionicons name="log-in" size={isSmallDevice ? 48 : 64} color={Colors.primary} />
            <Text style={styles.title}>Kirish</Text>
            <Text style={styles.subtitle}>Hisobingizga kiring</Text>
          </View>

          {/* Login Method Selector */}
          <View style={styles.methodSelector}>
            <TouchableOpacity
              style={[styles.methodButton, loginMethod === 'password' && styles.methodButtonActive]}
              onPress={() => setLoginMethod('password')}
            >
              <Text style={[styles.methodButtonText, loginMethod === 'password' && styles.methodButtonTextActive]}>
                Parol
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodButton, loginMethod === 'otp' && styles.methodButtonActive]}
              onPress={() => setLoginMethod('otp')}
            >
              <Text style={[styles.methodButtonText, loginMethod === 'otp' && styles.methodButtonTextActive]}>
                OTP
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodButton, loginMethod === 'social' && styles.methodButtonActive]}
              onPress={() => setLoginMethod('social')}
            >
              <Text style={[styles.methodButtonText, loginMethod === 'social' && styles.methodButtonTextActive]}>
                Ijtimoiy
              </Text>
            </TouchableOpacity>
          </View>

          {/* Password Login Form */}
          {loginMethod === 'password' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Login"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Parol"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showLoginPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowLoginPassword(!showLoginPassword)}
                  style={styles.visibilityButton}
                >
                  <Ionicons 
                    name={showLoginPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={Colors.textLight} 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handlePasswordLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.surface} />
                ) : (
                  <Text style={styles.buttonText}>Kirish</Text>
                )}
              </TouchableOpacity>

              <View style={styles.helpLinks}>
                <TouchableOpacity onPress={() => setShowResetPasswordModal(true)}>
                  <Text style={styles.helpLinkText}>Parolni unutdingizmi?</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowRegisterModal(true)}>
                  <Text style={styles.helpLinkText}>Ro'yxatdan o'tmaganmisiz? Ro'yxatdan o'tish</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowHelpModal(true)}>
                  <Text style={styles.helpLinkText}>Yordam kerakmi? Admin bilan bog'lanish</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* OTP Login Form */}
          {loginMethod === 'otp' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="call" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Telefon raqam"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSendOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.surface} />
                ) : (
                  <Text style={styles.buttonText}>OTP Kod Yuborish</Text>
                )}
              </TouchableOpacity>

              <View style={styles.helpLinks}>
                <TouchableOpacity onPress={() => setShowRegisterModal(true)}>
                  <Text style={styles.helpLinkText}>Ro'yxatdan o'tish</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowHelpModal(true)}>
                  <Text style={styles.helpLinkText}>Admin bilan bog'lanish</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Social Login Form */}
          {loginMethod === 'social' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="call" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Telefon raqam"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton, isLoading && styles.buttonDisabled]}
                onPress={() => handleSocialLogin('google')}
                disabled={isLoading}
              >
                <Ionicons name="logo-google" size={24} color={Colors.surface} />
                <Text style={styles.socialButtonText}>Google orqali kirish</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.facebookButton, isLoading && styles.buttonDisabled]}
                onPress={() => handleSocialLogin('facebook')}
                disabled={isLoading}
              >
                <Ionicons name="logo-facebook" size={24} color={Colors.surface} />
                <Text style={styles.socialButtonText}>Facebook orqali kirish</Text>
              </TouchableOpacity>

              <View style={styles.helpLinks}>
                <TouchableOpacity onPress={() => setShowRegisterModal(true)}>
                  <Text style={styles.helpLinkText}>Ro'yxatdan o'tish</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowHelpModal(true)}>
                  <Text style={styles.helpLinkText}>Admin bilan bog'lanish</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </ScrollView>

      {/* Reset Password Modal */}
      <Modal
        visible={showResetPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={closeResetPasswordModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Parolni Tiklash</Text>
                <TouchableOpacity onPress={closeResetPasswordModal}>
                  <Ionicons name="close" size={24} color={Colors.textDark} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Login yoki telefon raqamingizni kiriting va yangi parol o'rnating
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Login yoki telefon raqam"
                  value={resetPasswordData.username_or_phone}
                  onChangeText={(text) => setResetPasswordData({ ...resetPasswordData, username_or_phone: text })}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Yangi parol"
                  value={resetPasswordData.new_password}
                  onChangeText={(text) => setResetPasswordData({ ...resetPasswordData, new_password: text })}
                  secureTextEntry={!showResetNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowResetNewPassword(!showResetNewPassword)}
                  style={styles.visibilityButton}
                >
                  <Ionicons 
                    name={showResetNewPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={Colors.textLight} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Parolni tasdiqlash"
                  value={resetPasswordData.confirm_password}
                  onChangeText={(text) => setResetPasswordData({ ...resetPasswordData, confirm_password: text })}
                  secureTextEntry={!showResetConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                  style={styles.visibilityButton}
                >
                  <Ionicons 
                    name={showResetConfirmPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={Colors.textLight} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary, styles.modalButton]}
                  onPress={closeResetPasswordModal}
                >
                  <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Bekor</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, isResettingPassword && styles.buttonDisabled, styles.modalButton]}
                  onPress={handleResetPassword}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? (
                    <ActivityIndicator color={Colors.surface} />
                  ) : (
                    <Text style={styles.buttonText}>O'zgartirish</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Registration Modal */}
      <Modal
        visible={showRegisterModal}
        transparent
        animationType="slide"
        onRequestClose={closeRegisterModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ro'yxatdan O'tish</Text>
                <TouchableOpacity onPress={closeRegisterModal}>
                  <Ionicons name="close" size={24} color={Colors.textDark} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Yangi hisob yaratish uchun ma'lumotlarni kiriting
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ism"
                  value={registerData.name}
                  onChangeText={(text) => setRegisterData({ ...registerData, name: text })}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="call" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Telefon raqam"
                  value={registerData.phone}
                  onChangeText={(text) => setRegisterData({ ...registerData, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="person-circle" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Login"
                  value={registerData.username}
                  onChangeText={(text) => setRegisterData({ ...registerData, username: text })}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Parol"
                  value={registerData.password}
                  onChangeText={(text) => setRegisterData({ ...registerData, password: text })}
                  secureTextEntry={!showRegPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowRegPassword(!showRegPassword)}
                  style={styles.visibilityButton}
                >
                  <Ionicons 
                    name={showRegPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={Colors.textLight} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Parolni tasdiqlash"
                  value={registerData.confirm_password}
                  onChangeText={(text) => setRegisterData({ ...registerData, confirm_password: text })}
                  secureTextEntry={!showRegConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  style={styles.visibilityButton}
                >
                  <Ionicons 
                    name={showRegConfirmPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={Colors.textLight} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="location" size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Manzil (ixtiyoriy)"
                  value={registerData.address}
                  onChangeText={(text) => setRegisterData({ ...registerData, address: text })}
                  multiline
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary, styles.modalButton]}
                  onPress={closeRegisterModal}
                >
                  <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Bekor</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, isRegistering && styles.buttonDisabled, styles.modalButton]}
                  onPress={handleRegister}
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <ActivityIndicator color={Colors.surface} />
                  ) : (
                    <Text style={styles.buttonText}>Ro'yxatdan o'tish</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Help Request Modal */}
      <Modal
        visible={showHelpModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowHelpModal(false);
          setHelpData({
            phone: '',
            issue_type: 'other',
            message: '',
          });
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Admin bilan Bog'lanish</Text>
                  <TouchableOpacity onPress={() => {
                    setShowHelpModal(false);
                    setHelpData({
                      phone: '',
                      issue_type: 'other',
                      message: '',
                    });
                  }}>
                    <Ionicons name="close" size={24} color={Colors.textDark} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>
                  Muammoingizni yozib qoldiring, admin siz bilan tez orada bog'lanadi
                </Text>

                <View style={styles.inputContainer}>
                  <Ionicons name="call" size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Telefon raqam"
                    value={helpData.phone}
                    onChangeText={(text) => setHelpData({ ...helpData, phone: text })}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="help-circle" size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Muammoingizni batafsil yozing..."
                    value={helpData.message}
                    onChangeText={(text) => setHelpData({ ...helpData, message: text })}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary, styles.modalButton]}
                    onPress={() => {
                      setShowHelpModal(false);
                      setHelpData({
                        phone: '',
                        issue_type: 'other',
                        message: '',
                      });
                    }}
                  >
                    <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Bekor</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, isSendingHelp && styles.buttonDisabled, styles.modalButton]}
                    onPress={handleSendHelpRequest}
                    disabled={isSendingHelp}
                  >
                    {isSendingHelp ? (
                      <ActivityIndicator color={Colors.surface} />
                    ) : (
                      <Text style={styles.buttonText}>Yuborish</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOtpModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowOtpModal(false);
          setOtpCode('');
          setOtpSent(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>OTP Kodni Kiriting</Text>
              <TouchableOpacity onPress={() => {
                setShowOtpModal(false);
                setOtpCode('');
                setOtpSent(false);
              }}>
                <Ionicons name="close" size={24} color={Colors.textDark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {phone} raqamiga yuborilgan kodni kiriting
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="keypad" size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="OTP Kod"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, styles.modalButton]}
                onPress={() => {
                  setShowOtpModal(false);
                  setOtpCode('');
                  setOtpSent(false);
                }}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Bekor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled, styles.modalButton]}
                onPress={handleVerifyOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.surface} />
                ) : (
                  <Text style={styles.buttonText}>Tasdiqlash</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleSendOTP}
              disabled={isLoading}
            >
              <Text style={styles.resendButtonText}>Kodni qayta yuborish</Text>
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    padding: isSmallDevice ? 16 : 20,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 24 : 40,
  },
  title: {
    fontSize: isSmallDevice ? 24 : 32,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: 16,
  },
  subtitle: {
    fontSize: isSmallDevice ? 14 : 16,
    color: Colors.textLight,
    marginTop: 8,
  },
  methodSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  methodButton: {
    flex: 1,
    paddingVertical: isSmallDevice ? 10 : 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  methodButtonActive: {
    backgroundColor: Colors.primary,
  },
  methodButtonText: {
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  methodButtonTextActive: {
    color: Colors.surface,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  visibilityButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    height: isSmallDevice ? 45 : 50,
    fontSize: isSmallDevice ? 14 : 16,
    color: Colors.textDark,
  },
  textArea: {
    height: isSmallDevice ? 80 : 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: isSmallDevice ? 14 : 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: Colors.textDark,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: isSmallDevice ? 14 : 16,
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  facebookButton: {
    backgroundColor: '#4267B2',
  },
  socialButtonText: {
    color: Colors.surface,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: isSmallDevice ? 16 : 24,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: 'bold',
    color: Colors.textDark,
    flex: 1,
  },
  modalSubtitle: {
    fontSize: isSmallDevice ? 12 : 14,
    color: Colors.textLight,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
  },
  helpLinks: {
    marginTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  helpLinkText: {
    color: Colors.primary,
    fontSize: isSmallDevice ? 12 : 14,
    textDecorationLine: 'underline',
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    color: Colors.primary,
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: '600',
  },
});