/**
 * API Configuration
 * 
 * ⚠️ MUAMMO: Agar "Network error" chiqsa:
 * 
 * 1. IP MANZILNI TOPING:
 *    Windows: cmd > ipconfig (IPv4 Address ni toping)
 *    Mac/Linux: ifconfig | grep "inet "
 *    Masalan: 192.168.1.100
 * 
 * 2. IP MANZILNI O'ZGARTIRING:
 *    Quyidagi '192.168.1.102' ni o'zingizning IP manzilingizga o'zgartiring
 * 
 * 3. TEKSHIRING:
 *    - Backend server ishlab turganini (port 8000)
 *    - Telefon va kompyuter bir xil Wi-Fi tarmog'ida
 *    - Firewall backend portini bloklamasligi kerak
 * 
 * Batafsil: mobile_app/API_SETUP.md faylini o'qing
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Detect if running on web
const isWeb = Platform.OS === 'web';

// Get API URL from app.json extra config or use default
const getApiUrlFromConfig = () => {
  try {
    // Try to get from expo constants (app.json extra.apiUrl)
    const apiUrl = Constants.expoConfig?.extra?.apiUrl;
    if (apiUrl) {
      // Ensure it ends with /api
      return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
    }
  } catch (e) {
    console.warn('Could not read API URL from config:', e);
  }
  return null;
};

// ⚠️ O'ZINGIZNING IP MANZILINGIZNI KIRITING (Development uchun)
// Windows: cmd > ipconfig | findstr "IPv4"
// Mac/Linux: ifconfig | grep "inet "
const YOUR_LOCAL_IP = '161.97.184.217'; // ← Development uchun IP manzil

// ⚠️ PRODUCTION URL (APK build uchun)
// Contabo VPS ning domain yoki IP manzilini kiriting
// Masalan: https://savdo.uztoysshop.uz yoki http://161.97.184.217:8000
const PRODUCTION_URL = 'http://161.97.184.217/api'; // ← Production URL (HTTPS yoki HTTP)

// Determine BASE_URL based on platform and environment
let BASE_URL;

// First try to get from app.json config (works for both dev and production)
const configUrl = getApiUrlFromConfig();
if (configUrl) {
  BASE_URL = configUrl;
} else if (__DEV__) {
  // Development mode - only if no config URL found
  if (isWeb) {
    BASE_URL = 'http://161.97.184.217:8000/api'; // Web versiyasi uchun
  } else {
    BASE_URL = `http://${YOUR_LOCAL_IP}/api`; // Native (telefon) uchun IP manzil
  }
} else {
  // Production mode (APK build) - fallback to hardcoded production URL
  BASE_URL = PRODUCTION_URL;
}

// Debug log - always show for troubleshooting
console.log('📱 API Config:', {
  platform: Platform.OS,
  isWeb,
  YOUR_LOCAL_IP,
  BASE_URL,
  __DEV__,
  configUrl: getApiUrlFromConfig(),
  productionUrl: PRODUCTION_URL,
  'isProduction': !__DEV__,
  'Constants.expoConfig?.extra?.apiUrl': Constants.expoConfig?.extra?.apiUrl
});

const API_CONFIG = {
  // Backend API base URL
  // Web versiyasida localhost ishlatish tavsiya etiladi
  // Native (telefon) versiyasida IP manzil ishlatilishi kerak
  BASE_URL,
  
  // Timeout settings
  TIMEOUT: 30000, // 30 seconds
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
  },
  
  // Orders
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    GET: (id) => `/orders/${id}`,
    UPDATE: (id) => `/orders/${id}`,
    UPDATE_STATUS: (id) => `/orders/${id}/status`,
    DELETE: (id) => `/orders/${id}`,
  },
  
  // Sales
  SALES: {
    LIST: '/sales',
    CREATE: '/sales',
    GET: (id) => `/sales/${id}`,
    UPDATE: (id) => `/sales/${id}`,
    DELETE: (id) => `/sales/${id}`,
    PENDING: '/sales/pending',
    APPROVE: (id) => `/sales/${id}/approve`,
    RECEIPT: (id) => `/sales/${id}/receipt`,
    SELLER_HISTORY: (sellerId) => `/sellers/${sellerId}/sales-history`,
    CUSTOMER_HISTORY: (customerId) => `/customers/${customerId}/sales-history`,
  },
  
  // Products
  PRODUCTS: {
    LIST: '/products',
    GET: (id) => `/products/${id}`,
    SEARCH: '/products?search=',
    COUNT: '/products/count',
  },
  
  // Customers
  CUSTOMERS: {
    LIST: '/customers',
    GET: (id) => `/customers/${id}`,
    CREATE: '/customers',
    UPDATE: (id) => `/customers/${id}`,
    COUNT: '/customers/count',
  },
  
  // Sellers
  SELLERS: {
    LIST: '/sellers',
    GET: (id) => `/sellers/${id}`,
    UPDATE: (id) => `/sellers/${id}`,
    UPLOAD_IMAGE: (id) => `/sellers/${id}/upload-image`,
  },
  
  // Settings
  SETTINGS: {
    GET: '/settings',
    UPDATE: '/settings',
  },
  
  // Location
  LOCATION: {
    UPDATE: (sellerId) => `/sellers/${sellerId}/location`,
  },
  
  // Work Schedule
  SCHEDULE: {
    GET: (sellerId) => `/sellers/${sellerId}/schedule`,
    UPDATE: (sellerId) => `/sellers/${sellerId}/schedule`,
  },
  
  // Statistics
  STATISTICS: {
    GET: '/statistics',
  },
  
  // Products Count
  PRODUCTS_COUNT: '/products/count',
};

export default API_CONFIG;

