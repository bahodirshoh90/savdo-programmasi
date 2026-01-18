/**
 * API Configuration for Customer App
 */
import { Platform } from 'react-native';

// Detect if running on web
const isWeb = Platform.OS === 'web';

// Production API URL
const PRODUCTION_API_URL = 'https://uztoysavdo.uz/api';

// Determine BASE_URL
const BASE_URL = PRODUCTION_API_URL;

console.log('📱 Customer App API Config:', {
  platform: Platform.OS,
  isWeb,
  BASE_URL,
});

const API_CONFIG = {
  BASE_URL,
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// API Endpoints
export const API_ENDPOINTS = {
  BASE_URL,
  
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
  },
  
  // Products
  PRODUCTS: {
    LIST: '/products',
    GET: (id) => `/products/${id}`,
    SEARCH: '/products?search=',
  },
  
  // Orders (Customer can create and view their own orders)
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    GET: (id) => `/orders/${id}`,
  },
  
  // Customers
  CUSTOMERS: {
    GET: (id) => `/customers/${id}`,
    UPDATE: (id) => `/customers/${id}`,
  },
};

export default API_CONFIG;
