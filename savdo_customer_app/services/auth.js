/**
 * Authentication Service for Customer App
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import api from './api';
import { API_ENDPOINTS } from '../config/api';

const isWeb = Platform.OS === 'web';

let SecureStore = null;
if (!isWeb) {
  try {
    SecureStore = require('expo-secure-store').default;
  } catch (e) {
    console.warn('SecureStore not available');
  }
}

const tokenStorage = {
  getItem: async (key) => {
    if (isWeb) return localStorage.getItem(key);
    if (SecureStore) return await SecureStore.getItemAsync(key);
    return await AsyncStorage.getItem(key);
  },
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

export const login = async (username, password) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
      username,
      password,
    });

    const { token, user } = response;

    // Store token
    await tokenStorage.setItem('customer_token', token);

    // Store user data (customer info)
    if (user && user.customer_id) {
      await AsyncStorage.setItem('customer_id', user.customer_id.toString());
      await AsyncStorage.setItem('customer_data', JSON.stringify(user));
    }

    return { success: true, user, token };
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error.response?.data?.detail || error.message || 'Login failed';
    return { success: false, error: errorMessage };
  }
};

export const logout = async () => {
  try {
    await tokenStorage.removeItem('customer_token');
    await AsyncStorage.multiRemove(['customer_id', 'customer_data']);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

export const isLoggedIn = async () => {
  try {
    const token = await tokenStorage.getItem('customer_token');
    const customerId = await AsyncStorage.getItem('customer_id');
    return !!(token && customerId);
  } catch (error) {
    return false;
  }
};

export const getCurrentUser = async () => {
  try {
    const userData = await AsyncStorage.getItem('customer_data');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

export const verifyToken = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.AUTH.ME);
    return { success: true, user: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
