/**
 * API Service - HTTP requests with offline support
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

// Platform-specific network check
let Network = null;
if (!isWeb) {
  try {
    Network = require('expo-network');
  } catch (e) {
    console.warn('expo-network not available');
  }
}

// Web-compatible storage for tokens
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

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get token from tokenStorage (platform-agnostic)
      const token = await tokenStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add seller ID if available (stored in AsyncStorage in auth.js)
      const sellerId = await AsyncStorage.getItem('seller_id');
      if (sellerId) {
        config.headers['X-Seller-ID'] = sellerId;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = await tokenStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(
            `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
            { refresh_token: refreshToken }
          );
          
          const { token } = response.data;
          // Store new token (platform-agnostic)
          await tokenStorage.setItem('auth_token', token);
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        await tokenStorage.removeItem('auth_token');
        await tokenStorage.removeItem('refresh_token');
        await AsyncStorage.multiRemove(['user_data', 'seller_id']);
        // Navigate to login (will be handled by app)
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Check network connectivity
 */
export const isOnline = async () => {
  try {
    if (isWeb) {
      // Web: Check navigator.onLine
      return navigator.onLine !== false;
    }
    if (Network) {
      const networkState = await Network.getNetworkStateAsync();
      return networkState?.isConnected === true && networkState?.isInternetReachable === true;
    }
    // Fallback: assume online if check fails
    return true;
  } catch (error) {
    console.warn('Network check error:', error);
    // Fallback: assume online if check fails
    return true;
  }
};

/**
 * Generic API call with offline support
 */
export const apiCall = async (method, endpoint, data = null) => {
  try {
    const online = await isOnline();
    
    if (!online) {
      // Queue request for offline sync
      await queueOfflineRequest(method, endpoint, data);
      throw new Error('OFFLINE');
    }

    const response = await apiClient({
      method,
      url: endpoint,
      data,
    });

    // Check if response.data is HTML (indicates server error or wrong endpoint)
    // Axios may parse HTML as string, so check both response.data type and content
    let dataToCheck = response.data;
    if (typeof dataToCheck === 'string') {
      if (dataToCheck.trim().startsWith('<!DOCTYPE') || dataToCheck.trim().startsWith('<html')) {
        console.error('API returned HTML instead of JSON:', {
          endpoint,
          method,
          url: `${API_CONFIG.BASE_URL}${endpoint}`,
          responsePreview: dataToCheck.substring(0, 200)
        });
        throw new Error('API returned HTML instead of JSON. Check if backend server is running and endpoint is correct.');
      }
    } else if (dataToCheck && typeof dataToCheck === 'object') {
      // If response is object but doesn't look like valid data, might be error
      const jsonString = JSON.stringify(dataToCheck);
      if (jsonString.trim().startsWith('<!DOCTYPE') || jsonString.trim().startsWith('<html')) {
        console.error('API returned HTML instead of JSON (in object):', {
          endpoint,
          method,
          url: `${API_CONFIG.BASE_URL}${endpoint}`
        });
        throw new Error('API returned HTML instead of JSON. Check if backend server is running and endpoint is correct.');
      }
    }

    return response.data;
  } catch (error) {
    if (error.message === 'OFFLINE') {
      throw error;
    }
    
    // Check if response is HTML
    if (error.response?.data) {
      const errorData = error.response.data;
      const errorString = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
      if (errorString && typeof errorString === 'string' && errorString.trim().startsWith('<!DOCTYPE')) {
        console.error('API Error - HTML response received:', {
          endpoint,
          method,
          status: error.response?.status,
          url: `${API_CONFIG.BASE_URL}${endpoint}`,
        });
        throw new Error(`Server returned HTML instead of JSON. Check if backend API is running at ${API_CONFIG.BASE_URL}`);
      }
    }
    
    // More detailed error logging for network issues
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
      console.error('API Network Error:', {
        message: error.message,
        code: error.code,
        baseURL: API_CONFIG.BASE_URL,
        endpoint: endpoint,
        method,
        hint: 'Check if backend server is running and IP address is correct in config/api.js'
      });
    } else {
      console.error('API Error:', error.response?.data || error.message);
    }
    throw error;
  }
};

/**
 * Queue request for offline sync
 */
const queueOfflineRequest = async (method, endpoint, data) => {
  try {
    const queue = await AsyncStorage.getItem('offline_queue');
    const requests = queue ? JSON.parse(queue) : [];
    
    requests.push({
      method,
      endpoint,
      data,
      timestamp: new Date().toISOString(),
      id: Date.now().toString(),
    });
    
    await AsyncStorage.setItem('offline_queue', JSON.stringify(requests));
  } catch (error) {
    console.error('Error queueing offline request:', error);
  }
};

/**
 * Process offline queue when online
 */
export const syncOfflineQueue = async () => {
  try {
    const online = await isOnline();
    if (!online) return;

    const queue = await AsyncStorage.getItem('offline_queue');
    if (!queue) return;

    const requests = JSON.parse(queue);
    const synced = [];
    
    for (const request of requests) {
      try {
        await apiCall(request.method, request.endpoint, request.data);
        synced.push(request.id);
      } catch (error) {
        console.error('Error syncing request:', error);
        // Keep failed requests in queue
      }
    }
    
    // Remove synced requests
    const remaining = requests.filter(r => !synced.includes(r.id));
    await AsyncStorage.setItem('offline_queue', remaining.length > 0 ? JSON.stringify(remaining) : '');
    
    return synced.length;
  } catch (error) {
    console.error('Error syncing offline queue:', error);
  }
};

// Export specific API methods
export default {
  get: (endpoint) => apiCall('GET', endpoint),
  post: (endpoint, data) => apiCall('POST', endpoint, data),
  put: (endpoint, data) => apiCall('PUT', endpoint, data),
  delete: (endpoint) => apiCall('DELETE', endpoint),
  isOnline,
  syncOfflineQueue,
};

