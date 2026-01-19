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

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  
  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Xatolik', 'Foydalanuvchi nomi va parolni kiriting');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[LOGIN] Attempting login for username:', username.trim());
      const result = await authLogin(username.trim(), password);
      console.log('[LOGIN] Login result:', { success: result.success, hasError: !!result.error });
      
      if (result.success) {
        console.log('[LOGIN] Login successful, user:', result.user);
        login(result.user);
        // Navigation will be handled by App.js based on auth state
      } else {
        // Show error message to user
        const errorMessage = result.error || 'Noto\'g\'ri login yoki parol';
        console.log('[LOGIN] Login failed, showing error:', errorMessage);
        Alert.alert('Xatolik', errorMessage);
      }
    } catch (error) {
      console.error('[LOGIN] Login exception:', error);
      console.error('[LOGIN] Error response:', error.response?.data);
      console.error('[LOGIN] Error status:', error.response?.status);
      
      // Extract error message
      let errorMessage = 'Noto\'g\'ri login yoki parol';
      
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        }
      } else if (error.message) {
        if (error.message.includes('Network') || error.message.includes('timeout')) {
          errorMessage = 'Internetga ulanib bo\'lmadi. Internetni tekshiring.';
        } else {
          errorMessage = error.message;
        }
      }
      
      console.log('[LOGIN] Showing error alert:', errorMessage);
      Alert.alert('Xatolik', errorMessage);
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
            style={styles.input}
            placeholder="Foydalanuvchi nomi yoki telefon"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
          />

          <TextInput
            style={styles.input}
            placeholder="Parol"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

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
});
