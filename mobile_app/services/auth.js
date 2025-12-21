/**
 * Authentication Service
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { API_ENDPOINTS } from '../config/api';

const isWeb = Platform.OS === 'web';

// Platform-specific SecureStore
let SecureStore = null;
if (!isWeb) {
  try {
    SecureStore = require('expo-secure-store').default;
  } catch (e) {
    console.warn('SecureStore not available');
  }
}

// Web-compatible storage for tokens
const tokenStorage = {
  setItem: async (key, value) => {
    if (isWeb) {
      localStorage.setItem(key, value);
      return;
    }
    if (SecureStore) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  getItem: async (key) => {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    if (SecureStore) {
      return await SecureStore.getItemAsync(key);
    }
    return await AsyncStorage.getItem(key);
  },
  removeItem: async (key) => {
    if (isWeb) {
      localStorage.removeItem(key);
      return;
    }
    if (SecureStore) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  SELLER_ID: 'seller_id',
};

/**
 * Login with username and password
 */
export const login = async (username, password) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
      username,
      password,
    });

    if (response.success && response.token) {
      // Store tokens securely (platform-agnostic)
      await tokenStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
      
      if (response.refresh_token) {
        await tokenStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token);
      }

      // Store user data
      const userData = {
        id: response.seller_id,
        seller_id: response.seller_id,
        seller_name: response.seller_name,
        name: response.seller_name,
        permissions: response.permissions || [],
        role_name: response.role_name,
      };

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      await AsyncStorage.setItem(STORAGE_KEYS.SELLER_ID, response.seller_id.toString());

      return {
        success: true,
        user: userData,
        message: response.message || 'Login successful',
      };
    }

    return {
      success: false,
      message: response.message || 'Login failed',
    };
  } catch (error) {
    console.error('Login error:', error);
    
    // Better error messages for network issues
    let errorMessage = 'Login qilishda xatolik';
    if (error.message && (error.message.includes('Network') || error.message.includes('ERR_NETWORK') || error.code === 'ERR_NETWORK')) {
      // Import API config to show current URL in console
      import('../config/api').then((module) => {
        const API_CONFIG = module.default;
        console.log('⚠️ Current API URL:', API_CONFIG.BASE_URL);
        console.log('⚠️ IP manzilni o\'zgartirish uchun: mobile_app/config/api.js faylida YOUR_LOCAL_IP o\'zgaruvchisini o\'zgartiring');
      }).catch(() => {});
      
      errorMessage = 'Network xatosi: Backend serverni ulashib bo\'lmadi.\n\n' +
        'TEKSHIRING:\n' +
        '1. Backend server ishlab turganini tekshiring (port 8000)\n' +
        '2. Telefon va kompyuter bir xil Wi-Fi tarmog\'ida\n' +
        '3. IP manzilni to\'g\'rilang:\n' +
        '   - Windows: cmd > ipconfig (IPv4 Address ni toping)\n' +
        '   - Mac/Linux: ifconfig | grep "inet "\n' +
        '   - mobile_app/config/api.js faylida YOUR_LOCAL_IP o\'zgaruvchisini o\'zgartiring\n\n' +
        'Batafsil: mobile_app/API_SETUP.md';
    } else if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      message: errorMessage,
    };
  }
};

/**
 * Logout
 */
export const logout = async () => {
  try {
    // Call logout API
    try {
      await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Ignore logout API errors (might be offline)
      console.warn('Logout API error:', error);
    }

    // Clear local storage (platform-agnostic)
    await tokenStorage.removeItem(STORAGE_KEYS.TOKEN);
    await tokenStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.SELLER_ID,
    ]);

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current user data
 */
export const getCurrentUser = async () => {
  try {
    // Try to get fresh data from API first
    try {
      const response = await api.get(API_ENDPOINTS.AUTH.ME);
      if (response && response.id) {
        // Update stored user data
        const userData = {
          id: response.id,
          seller_id: response.id,
          seller_name: response.name,
          name: response.name,
          permissions: response.permissions || [],
          role_name: response.role_name,
        };
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        return userData;
      }
    } catch (error) {
      console.warn('Could not fetch fresh user data, using cache:', error);
    }
    
    // Fallback to cached data
    const userDataStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (userDataStr) {
      return JSON.parse(userDataStr);
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Check if user is logged in
 */
export const isLoggedIn = async () => {
  try {
    const token = await tokenStorage.getItem(STORAGE_KEYS.TOKEN);
    return !!token;
  } catch (error) {
    return false;
  }
};

/**
 * Get auth token
 */
export const getToken = async () => {
  try {
    return await tokenStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    return null;
  }
};

/**
 * Verify token with server
 */
export const verifyToken = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.AUTH.ME);
    return {
      success: true,
      user: response,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  login,
  logout,
  getCurrentUser,
  isLoggedIn,
  getToken,
  verifyToken,
};

