/**
 * API Service for Customer App
 */
import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG, { API_ENDPOINTS } from '../config/api';

const isWeb = Platform.OS === 'web';

// Platform-specific storage for tokens
let SecureStore = null;
if (!isWeb) {
  try {
    SecureStore = require('expo-secure-store').default;
  } catch (e) {
    console.warn('SecureStore not available');
  }
}

// Token storage
const tokenStorage = {
  getItem: async (key) => {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    if (SecureStore) {
      return await SecureStore.getItemAsync(key);
    }
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

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token and customer ID
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await tokenStorage.getItem('customer_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      const customerId = await AsyncStorage.getItem('customer_id');
      if (customerId) {
        config.headers['X-Customer-ID'] = customerId;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired - clear auth
      await tokenStorage.removeItem('customer_token');
      await AsyncStorage.removeItem('customer_id');
      await AsyncStorage.removeItem('customer_data');
    }
    return Promise.reject(error);
  }
);

/**
 * Generic API call
 */
export const apiCall = async (method, endpoint, data = null, options = {}) => {
  try {
    const requestConfig = {
      method,
      url: endpoint,
      data,
      ...options,
    };

    // For FormData, don't set Content-Type manually
    if (data instanceof FormData && options.headers) {
      const { 'Content-Type': _, ...otherHeaders } = options.headers;
      requestConfig.headers = otherHeaders;
    }

    const response = await apiClient(requestConfig);
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
};

// Export API methods
export default {
  get: (endpoint, options) => apiCall('GET', endpoint, null, options),
  post: (endpoint, data, options) => apiCall('POST', endpoint, data, options),
  put: (endpoint, data, options) => apiCall('PUT', endpoint, data, options),
  delete: (endpoint, options) => apiCall('DELETE', endpoint, null, options),
};
