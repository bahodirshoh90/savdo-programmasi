/**
 * Login Screen for Customer App
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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { login as authLogin, signup as authSignup } from '../services/auth';
import Colors from '../constants/colors';
import api from '../services/api';
import { Picker } from '@react-native-picker/picker';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Help request state
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpIssueType, setHelpIssueType] = useState('login');
  const [isSendingHelp, setIsSendingHelp] = useState(false);

  const handleLogin = async () => {
    // Clear previous error
    setErrorMessage('');
    
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Foydalanuvchi nomi va parolni kiriting');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[LOGIN] Attempting login for username:', username.trim());
      const result = await authLogin(username.trim(), password);
      console.log('[LOGIN] Login result:', { success: result.success, hasError: !!result.error });
      
      if (result.success) {
        console.log('[LOGIN] Login successful, user:', result.user);
        setErrorMessage(''); // Clear error on success
        login(result.user);
        // Navigation will be handled by App.js based on auth state
      } else {
        // Show error message on screen
        const errorMsg = result.error || 'Noto\'g\'ri login yoki parol';
        console.log('[LOGIN] Login failed, showing error:', errorMsg);
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error('[LOGIN] Login exception:', error);
      console.error('[LOGIN] Error response:', error.response?.data);
      console.error('[LOGIN] Error status:', error.response?.status);
      
      // Extract error message
      let errorMsg = 'Noto\'g\'ri login yoki parol';
      
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (data.error) {
          errorMsg = data.error;
        } else if (data.message) {
          errorMsg = data.message;
        }
      } else if (error.message) {
        if (error.message.includes('Network') || error.message.includes('timeout')) {
          errorMsg = 'Internetga ulanib bo\'lmadi. Internetni tekshiring.';
        } else {
          errorMsg = error.message;
        }
      }
      
      console.log('[LOGIN] Showing error on screen:', errorMsg);
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupName.trim()) {
      Alert.alert('Xatolik', 'Ismni kiriting');
      return;
    }

    if (!signupPhone.trim()) {
      Alert.alert('Xatolik', 'Telefon raqamini kiriting');
      return;
    }

    if (!signupUsername.trim()) {
      Alert.alert('Xatolik', 'Login nomini kiriting');
      return;
    }

    if (!signupPassword.trim() || signupPassword.length < 4) {
      Alert.alert('Xatolik', 'Parolni kiriting (kamida 4 ta belgi)');
      return;
    }

    setIsSigningUp(true);
    try {
      const result = await authSignup({
        name: signupName.trim(),
        phone: signupPhone.trim(),
        address: signupAddress.trim() || '',
        username: signupUsername.trim(),
        password: signupPassword,
      });

      if (result.success) {
        // Auto-login after successful signup
        try {
          const loginResult = await authLogin(signupUsername.trim(), signupPassword);
          
          if (loginResult.success) {
            login(loginResult.user);
            // Reset form and close modal
            setShowSignup(false);
            setSignupName('');
            setSignupPhone('');
            setSignupAddress('');
            setSignupUsername('');
            setSignupPassword('');
            // Navigation will be handled by App.js based on auth state
          } else {
            Alert.alert(
              'Muvaffaqiyatli',
              'Ro\'yxatdan o\'tdingiz! Endi login qilishingiz mumkin.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setShowSignup(false);
                    // Reset form
                    setSignupName('');
                    setSignupPhone('');
                    setSignupAddress('');
                    setSignupUsername('');
                    setSignupPassword('');
                    // Set username and password in login form
                    setUsername(signupUsername.trim());
                    setPassword('');
                  },
                },
              ]
            );
          }
        } catch (loginError) {
          console.error('Auto-login error:', loginError);
          Alert.alert(
            'Muvaffaqiyatli',
            'Ro\'yxatdan o\'tdingiz! Endi login qilishingiz mumkin.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setShowSignup(false);
                  // Reset form
                  setSignupName('');
                  setSignupPhone('');
                  setSignupAddress('');
                  setSignupUsername('');
                  setSignupPassword('');
                  // Set username in login form
                  setUsername(signupUsername.trim());
                },
              },
            ]
          );
        }
      } else {
        Alert.alert('Xatolik', result.error || 'Ro\'yxatdan o\'tishda xatolik');
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Xatolik', 'Ro\'yxatdan o\'tishda xatolik yuz berdi');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleSendHelp = async () => {
    if (!helpMessage.trim()) {
      Alert.alert('Xatolik', 'Muammoingizni yozib yuboring');
      return;
    }

    setIsSendingHelp(true);
    try {
      const response = await api.post('/help-request', {
        username: username.trim() || 'Noma\'lum',
        phone: '',
        message: helpMessage.trim(),
        issue_type: helpIssueType,
      });

      if (response.success) {
        Alert.alert(
          'Muvaffaqiyatli',
          response.message || 'Yordam so\'rovi yuborildi. Admin tez orada siz bilan bog\'lanadi.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowHelpModal(false);
                setHelpMessage('');
                setHelpIssueType('login');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Send help error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Yordam so\'rovini yuborishda xatolik';
      Alert.alert('Xatolik', errorMessage);
    } finally {
      setIsSendingHelp(false);
    }
  };

  const handleResetPassword = async () => {
    if (!forgotUsername.trim()) {
      Alert.alert('Xatolik', 'Foydalanuvchi nomi yoki telefon raqamni kiriting');
      return;
    }

    if (!forgotNewPassword.trim() || forgotNewPassword.length < 4) {
      Alert.alert('Xatolik', 'Yangi parol kamida 4 belgi bo\'lishi kerak');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      Alert.alert('Xatolik', 'Parollar mos kelmayapti');
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await api.post('/auth/reset-password', {
        username_or_phone: forgotUsername.trim(),
        new_password: forgotNewPassword,
      });

      if (response.success) {
        Alert.alert(
          'Muvaffaqiyatli',
          'Parol muvaffaqiyatli o\'zgartirildi. Endi yangi parol bilan login qiling.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowForgotPassword(false);
                setForgotUsername('');
                setForgotNewPassword('');
                setForgotConfirmPassword('');
                // Set username in login form
                setUsername(forgotUsername.trim());
                setPassword('');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Parolni tiklashda xatolik';
      Alert.alert('Xatolik', errorMessage);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mijozlar Ilovasi</Text>
          <Text style={styles.subtitle}>Tizimga kirish</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, errorMessage && styles.inputError]}
            placeholder="Foydalanuvchi nomi yoki telefon"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              // Clear error when user starts typing
              if (errorMessage) setErrorMessage('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
          />

          <TextInput
            style={[styles.input, errorMessage && styles.inputError]}
            placeholder="Parol"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              // Clear error when user starts typing
              if (errorMessage) setErrorMessage('');
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={() => setShowForgotPassword(true)}
            style={styles.forgotPasswordLink}
          >
            <Text style={styles.forgotPasswordText}>Parolni unutdingizmi?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.loginButtonText}>Kirish</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => setShowSignup(true)}
          >
            <Text style={styles.signupLinkText}>
              Ro'yxatdan o'tmaganmisiz? Ro'yxatdan o'tish
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpLink}
            onPress={() => setShowHelpModal(true)}
          >
            <Text style={styles.helpLinkText}>
              💬 Yordam kerakmi? Admin bilan bog'laning
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Signup Modal */}
      <Modal
        visible={showSignup}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSignup(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ro'yxatdan o'tish</Text>
                <TouchableOpacity
                  onPress={() => setShowSignup(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.signupForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Ism *"
                  value={signupName}
                  onChangeText={setSignupName}
                  autoCapitalize="words"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Telefon raqami *"
                  value={signupPhone}
                  onChangeText={setSignupPhone}
                  keyboardType="phone-pad"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Login nomi *"
                  value={signupUsername}
                  onChangeText={setSignupUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Parol * (kamida 4 ta belgi)"
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Manzil (ixtiyoriy)"
                  value={signupAddress}
                  onChangeText={setSignupAddress}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[styles.signupButton, isSigningUp && styles.signupButtonDisabled]}
                  onPress={handleSignup}
                  disabled={isSigningUp}
                >
                  {isSigningUp ? (
                    <ActivityIndicator color={Colors.surface} />
                  ) : (
                    <Text style={styles.signupButtonText}>Ro'yxatdan o'tish</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Parolni tiklash</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowForgotPassword(false);
                    setForgotUsername('');
                    setForgotNewPassword('');
                    setForgotConfirmPassword('');
                  }}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.signupForm}>
                <Text style={styles.infoText}>
                  Foydalanuvchi nomi yoki telefon raqamingizni kiriting va yangi parol o'rnating.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Foydalanuvchi nomi yoki telefon *"
                  value={forgotUsername}
                  onChangeText={setForgotUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="default"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Yangi parol * (kamida 4 ta belgi)"
                  value={forgotNewPassword}
                  onChangeText={setForgotNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Yangi parolni tasdiqlash *"
                  value={forgotConfirmPassword}
                  onChangeText={setForgotConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={[styles.signupButton, isResettingPassword && styles.signupButtonDisabled]}
                  onPress={handleResetPassword}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? (
                    <ActivityIndicator color={Colors.surface} />
                  ) : (
                    <Text style={styles.signupButtonText}>Parolni tiklash</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Help Request Modal */}
      <Modal
        visible={showHelpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHelpModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Yordam so'rash</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowHelpModal(false);
                    setHelpMessage('');
                    setHelpIssueType('login');
                  }}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.signupForm}>
                <Text style={styles.infoText}>
                  Muammoingizni yozib yuboring va admin tez orada siz bilan bog'lanadi.
                </Text>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Muammo turi:</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={helpIssueType}
                      onValueChange={(value) => setHelpIssueType(value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Login muammosi" value="login" />
                      <Picker.Item label="Parol muammosi" value="password" />
                      <Picker.Item label="Boshqa muammo" value="other" />
                    </Picker>
                  </View>
                </View>

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Muammoingizni batafsil yozing..."
                  value={helpMessage}
                  onChangeText={setHelpMessage}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Username (ixtiyoriy)"
                  value={username}
                  editable={false}
                  placeholderTextColor={Colors.textLight}
                />

                <TouchableOpacity
                  style={[styles.signupButton, isSendingHelp && styles.signupButtonDisabled]}
                  onPress={handleSendHelp}
                  disabled={isSendingHelp}
                >
                  {isSendingHelp ? (
                    <ActivityIndicator color={Colors.surface} />
                  ) : (
                    <Text style={styles.signupButtonText}>Yuborish</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textDark,
  },
  inputError: {
    borderColor: '#ff3b30',
    borderWidth: 2,
  },
  errorContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  signupLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  signupLinkText: {
    color: Colors.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.textLight,
  },
  signupForm: {
    gap: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  signupButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordLink: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  infoText: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
    lineHeight: 20,
  },
  helpLink: {
    marginTop: 12,
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
  },
  helpLinkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  picker: {
    height: 50,
    color: Colors.textDark,
  },
});
