/**
 * Profile Screen
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/colors';
import {
  isLocationTrackingEnabled,
  startLocationTracking,
  stopLocationTracking,
} from '../services/location';
import { syncOfflineQueue } from '../services/api';
import { syncOrders } from '../services/orders';
import { syncAllLocations } from '../services/location';
import { getSellerProfile, updateSellerProfile, uploadSellerImage } from '../services/seller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config/api';

export default function ProfileScreen() {
  const { user, logout: authLogout, login: authLogin } = useAuth();
  const [locationTracking, setLocationTracking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    loadSettings();
    loadProfile();
  }, []);

  const loadSettings = async () => {
    const enabled = await isLocationTrackingEnabled();
    setLocationTracking(enabled);
  };

  const loadProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const sellerId = await AsyncStorage.getItem('seller_id');
      if (sellerId) {
        const profile = await getSellerProfile(parseInt(sellerId));
        setSellerProfile(profile);
        setEditForm({
          name: profile.name || '',
          phone: profile.phone || '',
          email: profile.email || '',
          username: profile.username || '',
          password: '',
          confirmPassword: '',
        });
        if (profile.image_url) {
          const imageUrl = profile.image_url.startsWith('http') 
            ? profile.image_url 
            : `${API_CONFIG.BASE_URL.replace('/api', '')}${profile.image_url}`;
          setImageUri(imageUrl);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Xatolik', 'Profil ma\'lumotlarini yuklashda xatolik');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleLocationTrackingToggle = async (value) => {
    try {
      if (value) {
        const result = await startLocationTracking();
        if (result.success) {
          setLocationTracking(true);
          Alert.alert('Muvaffaqiyatli', 'GPS kuzatuv yoqildi');
        } else {
          Alert.alert('Xatolik', result.message || 'GPS kuzatuvni yoqishda xatolik');
        }
      } else {
        const result = await stopLocationTracking();
        if (result.success) {
          setLocationTracking(false);
          Alert.alert('Muvaffaqiyatli', 'GPS kuzatuv o\'chirildi');
        } else {
          Alert.alert('Xatolik', result.message || 'GPS kuzatuvni o\'chirishda xatolik');
        }
      }
    } catch (error) {
      Alert.alert('Xatolik', error.message);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([
        syncOfflineQueue(),
        syncOrders(),
        syncAllLocations(),
      ]);
      Alert.alert('Muvaffaqiyatli', 'Barcha ma\'lumotlar sinxronlashtirildi');
    } catch (error) {
      Alert.alert('Xatolik', 'Sinxronlashda xatolik yuz berdi');
    } finally {
      setIsSyncing(false);
    }
  };

  const performLogout = async () => {
    console.log('ProfileScreen: User confirmed logout - starting logout process');
    
    try {
      console.log('ProfileScreen: Logout button pressed');
      
      // Stop location tracking before logout (don't block logout if it fails)
      if (locationTracking) {
        try {
          console.log('ProfileScreen: Stopping location tracking...');
          await stopLocationTracking();
          console.log('ProfileScreen: Location tracking stopped');
        } catch (locationError) {
          console.warn('ProfileScreen: Error stopping location tracking:', locationError);
          // Continue with logout even if location stop fails
        }
      }
      
      // Logout - AuthContext will handle navigation automatically
      console.log('ProfileScreen: Calling authLogout from AuthContext...');
      await authLogout();
      
      console.log('ProfileScreen: Logout call completed successfully');
      // Navigation to login will be handled automatically by App.js
      // when isAuthenticated becomes false
      
      // Note: No need for manual navigation here, App.js useEffect
      // will detect isAuthenticated change and navigate to Login
    } catch (error) {
      console.error('ProfileScreen: Logout error:', error);
      // Try to logout anyway to clear local state
      try {
        console.log('ProfileScreen: Attempting secondary logout...');
        await authLogout();
        console.log('ProfileScreen: Secondary logout successful');
      } catch (logoutError) {
        console.error('ProfileScreen: Secondary logout attempt failed:', logoutError);
      }
      // Show error but don't block - logout should still proceed
      if (Platform.OS === 'web') {
        alert('Ogohlantirish: Chiqishda kichik xatolik yuz berdi, lekin tizimdan chiqildi.');
      } else {
        Alert.alert(
          'Ogohlantirish', 
          'Chiqishda kichik xatolik yuz berdi, lekin tizimdan chiqildi.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleImagePicker = async () => {
    if (Platform.OS === 'web') {
      // For web, use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setImageUri(event.target.result);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      // For native, try to use expo-image-picker
      try {
        const { launchImageLibraryAsync, MediaTypeOptions } = require('expo-image-picker');
        const result = await launchImageLibraryAsync({
          mediaTypes: MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        
        if (!result.canceled && result.assets[0]) {
          setImageUri(result.assets[0].uri);
        }
      } catch (error) {
        console.error('Image picker not available:', error);
        Alert.alert('Xatolik', 'Rasm yuklash funksiyasi mavjud emas');
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (editForm.password && editForm.password !== editForm.confirmPassword) {
        Alert.alert('Xatolik', 'Parollar mos kelmaydi');
        return;
      }

      if (!editForm.name || editForm.name.trim().length === 0) {
        Alert.alert('Xatolik', 'Ism Familiya to\'ldirilishi shart');
        return;
      }

      setIsLoadingProfile(true);
      const sellerId = await AsyncStorage.getItem('seller_id');
      
      // Update profile
      const updateData = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        username: editForm.username.trim() || null,
      };

      if (editForm.password && editForm.password.length > 0) {
        updateData.password = editForm.password;
      }

      await updateSellerProfile(parseInt(sellerId), updateData);

      // Upload image if changed (newly selected image)
      if (imageUri && (imageUri.startsWith('file://') || imageUri.startsWith('data:') || imageUri.startsWith('ph://'))) {
        await uploadSellerImage(parseInt(sellerId), imageUri);
      }

      // Reload profile
      await loadProfile();
      
      // Update user context
      const updatedUser = {
        seller_id: sellerId,
        seller_name: editForm.name.trim(),
      };
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      authLogin(updatedUser);

      setIsEditing(false);
      Alert.alert('Muvaffaqiyatli', 'Profil yangilandi');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Xatolik', error.message || 'Profilni saqlashda xatolik');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    loadProfile(); // Reset form
  };

  const handleLogout = async () => {
    console.log('ProfileScreen: handleLogout function called');
    
    // For web, use window.confirm which is more reliable
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Tizimdan chiqmoqchimisiz?');
      if (confirmed) {
        console.log('ProfileScreen: User confirmed logout via window.confirm');
        await performLogout();
      } else {
        console.log('ProfileScreen: Logout cancelled by user');
      }
    } else {
      // For native platforms, use Alert.alert
      Alert.alert(
        'Chiqish',
        'Tizimdan chiqmoqchimisiz?',
        [
          {
            text: 'Bekor qilish',
            style: 'cancel',
            onPress: () => {
              console.log('ProfileScreen: Logout cancelled by user');
            },
          },
          {
            text: 'Chiqish',
            style: 'destructive',
            onPress: () => {
              console.log('ProfileScreen: User confirmed logout via Alert.alert');
              performLogout();
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Info */}
      <View style={styles.userSection}>
        <TouchableOpacity
          onPress={() => isEditing && handleImagePicker()}
          disabled={!isEditing}
          style={[styles.avatar, imageUri && styles.avatarWithImage]}
        >
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.avatarImage} />
              {isEditing && (
                <View style={styles.imageEditOverlay}>
                  <Text style={styles.imageEditText}>Rasm</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.avatarText}>
                {sellerProfile?.name?.charAt(0).toUpperCase() || user?.seller_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
              {isEditing && (
                <View style={styles.imageEditOverlay}>
                  <Text style={styles.imageEditText}>Rasm</Text>
                </View>
              )}
            </>
          )}
        </TouchableOpacity>
        {isEditing ? (
          <>
            <TextInput
              style={styles.editInput}
              value={editForm.name}
              onChangeText={(text) => setEditForm({ ...editForm, name: text })}
              placeholder="Ism Familiya"
              placeholderTextColor={Colors.textLight}
            />
            <Text style={styles.userId}>ID: {sellerProfile?.id || user?.seller_id || '-'}</Text>
          </>
        ) : (
          <>
            <Text style={styles.userName}>
              {sellerProfile?.name || user?.seller_name || 'Foydalanuvchi'}
            </Text>
            <Text style={styles.userId}>ID: {sellerProfile?.id || user?.seller_id || '-'}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>Tahrirlash</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Edit Form Modal */}
      {isEditing && (
        <View style={styles.editForm}>
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Ma'lumotlar</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefon</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                placeholder="+998 90 123 45 67"
                placeholderTextColor={Colors.textLight}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.email}
                onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                placeholder="email@example.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.username}
                onChangeText={(text) => setEditForm({ ...editForm, username: text })}
                placeholder="username"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Yangi parol (ixtiyoriy)</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.password}
                onChangeText={(text) => setEditForm({ ...editForm, password: text })}
                placeholder="Parolni o'zgartirmaslik uchun bo'sh qoldiring"
                placeholderTextColor={Colors.textLight}
                secureTextEntry
              />
            </View>

            {editForm.password && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Parolni tasdiqlang</Text>
                <TextInput
                  style={styles.editInput}
                  value={editForm.confirmPassword}
                  onChangeText={(text) => setEditForm({ ...editForm, confirmPassword: text })}
                  placeholder="Parolni takrorlang"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry
                />
              </View>
            )}

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formButton, styles.cancelButton]}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={isLoadingProfile}
              >
                {isLoadingProfile ? (
                  <ActivityIndicator color={Colors.surface} />
                ) : (
                  <Text style={styles.saveButtonText}>Saqlash</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sozlamalar</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>GPS kuzatuv</Text>
            <Text style={styles.settingDescription}>
              Ish vaqtida joylashuvingizni avtomatik yuborish
            </Text>
          </View>
          <Switch
            value={locationTracking}
            onValueChange={handleLocationTrackingToggle}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.surface}
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amallar</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSync}
          disabled={isSyncing}
        >
          <Text style={styles.actionButtonText}>
            {isSyncing ? 'Sinxronlanmoqda...' : 'Ma\'lumotlarni sinxronlash'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Versiya haqida</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            console.log('ProfileScreen: Logout TouchableOpacity pressed');
            handleLogout();
          }}
          activeOpacity={0.7}
        >
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
  userSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: Colors.textLight,
  },
  section: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.textLight,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutSection: {
    padding: 16,
    marginTop: 12,
  },
  logoutButton: {
    backgroundColor: Colors.danger,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  editButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  editForm: {
    backgroundColor: Colors.surface,
    marginTop: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  formSection: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  formButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  avatarWithImage: {
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  imageEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: '100%',
    paddingVertical: 4,
    alignItems: 'center',
  },
  imageEditText: {
    color: Colors.surface,
    fontSize: 16,
  },
});

