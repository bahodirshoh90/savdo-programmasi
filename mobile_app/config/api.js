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

// Detect if running on web
const isWeb = Platform.OS === 'web';

// ⚠️ O'ZINGIZNING IP MANZILINGIZNI KIRITING
// Windows: cmd > ipconfig | findstr "IPv4"
// Mac/Linux: ifconfig | grep "inet "
const YOUR_LOCAL_IP = '192.168.0.102'; // ← BU YERNI O'ZGARTIRING!

// Determine BASE_URL based on platform
const BASE_URL = __DEV__ 
  ? (isWeb 
      ? 'http://localhost:8000/api' // Web versiyasi uchun backend port 8000
      : `http://${YOUR_LOCAL_IP}:8000/api`) // Native (telefon) uchun IP manzil - BU YERNI O'ZGARTIRING!
  : 'https://savdo.uztoysshop.uz/api'; // Production URL

// Debug log
console.log('📱 API Config:', {
  platform: Platform.OS,
  isWeb,
  YOUR_LOCAL_IP,
  BASE_URL,
  __DEV__
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

