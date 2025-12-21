/**
 * Customers Service
 */
import api, { isOnline } from './api';
import { API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOMERS_CACHE_KEY = 'customers_cache';

/**
 * Cache customers
 */
const cacheCustomers = async (customers) => {
  try {
    await AsyncStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(customers));
  } catch (error) {
    console.error('Error caching customers:', error);
  }
};

/**
 * Get cached customers
 */
export const getCachedCustomers = async () => {
  try {
    const cached = await AsyncStorage.getItem(CUSTOMERS_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Error getting cached customers:', error);
    return [];
  }
};

/**
 * Get customers list
 */
export const getCustomers = async (search = '') => {
  try {
    const online = await isOnline();

    if (online) {
      const endpoint = search
        ? `${API_ENDPOINTS.CUSTOMERS.LIST}?search=${encodeURIComponent(search)}`
        : API_ENDPOINTS.CUSTOMERS.LIST;

      const response = await api.get(endpoint);
      
      // apiCall already checks for HTML, so if we get here, response should be valid
      // But double-check just in case
      if (typeof response === 'string' && (response.trim().startsWith('<!DOCTYPE') || response.trim().startsWith('<html'))) {
        console.error('Customers API returned HTML instead of JSON. Backend server may not be running or endpoint is incorrect.');
        // Fall through to catch block to use cached data
        throw { message: 'API returned HTML instead of JSON. Check if backend server is running.', useCache: true };
      }
      
      // Handle different response formats
      let customers = response;
      if (response && typeof response === 'object') {
        // Check if response has customers array
        if (Array.isArray(response.customers)) {
          customers = response.customers;
        } else if (Array.isArray(response.data)) {
          customers = response.data;
        } else if (Array.isArray(response)) {
          customers = response;
        } else {
          console.warn('Unexpected customers response format:', response);
          customers = [];
        }
      } else if (!Array.isArray(response)) {
        console.warn('Customers response is not an array:', response);
        customers = [];
      }
      
      // Ensure customers is an array
      if (!Array.isArray(customers)) {
        customers = [];
      }
      
      // Cache customers
      if (customers.length > 0) {
        await cacheCustomers(customers);
      }

      return customers;
    } else {
      // Return cached customers
      const cached = await getCachedCustomers();
      const cachedArray = Array.isArray(cached) ? cached : [];
      
      // Filter by search if provided
      if (search) {
        const searchLower = search.toLowerCase();
        return cachedArray.filter(
          c =>
            c && c.name && c.name.toLowerCase().includes(searchLower) ||
            (c && c.phone && c.phone.includes(search))
        );
      }

      return cachedArray;
    }
  } catch (error) {
    console.error('Error getting customers:', error);
    // Always try to return cached customers as fallback
    try {
      const cached = await getCachedCustomers();
      const cachedArray = Array.isArray(cached) ? cached : [];
      
      if (cachedArray.length > 0) {
        if (search) {
          const searchLower = search.toLowerCase();
          return cachedArray.filter(
            c =>
              c && c.name && c.name.toLowerCase().includes(searchLower) ||
              (c && c.phone && c.phone.includes(search))
          );
        }
        return cachedArray;
      }
      return [];
    } catch (cacheError) {
      console.error('Error getting cached customers:', cacheError);
      return [];
    }
  }
};

/**
 * Get single customer
 */
export const getCustomer = async (customerId) => {
  try {
    const online = await isOnline();

    if (online) {
      return await api.get(API_ENDPOINTS.CUSTOMERS.GET(customerId));
    } else {
      // Get from cache
      const cached = await getCachedCustomers();
      return cached.find(c => c.id === customerId) || null;
    }
  } catch (error) {
    console.error('Error getting customer:', error);
    // Try cache
    const cached = await getCachedCustomers();
    return cached.find(c => c.id === customerId) || null;
  }
};

/**
 * Create a new customer
 */
export const createCustomer = async (customerData) => {
  try {
    const online = await isOnline();

    if (online) {
      const response = await api.post(API_ENDPOINTS.CUSTOMERS.LIST, customerData);
      
      // Cache the new customer
      const cached = await getCachedCustomers();
      cached.push(response);
      await cacheCustomers(cached);
      
      return response;
    } else {
      throw new Error('Internetga ulanmagan. Mijoz yaratish uchun internet kerak.');
    }
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

/**
 * Get customer sales history
 */
export const getCustomerSalesHistory = async (customerId, limit = 1000) => {
  try {
    const online = await isOnline();
    
    if (online) {
      const endpoint = `${API_ENDPOINTS.SALES.CUSTOMER_HISTORY(customerId)}?limit=${limit}`;
      console.log('Fetching customer sales history from:', endpoint);
      const sales = await api.get(endpoint);
      console.log('Customer sales history response:', sales);
      return Array.isArray(sales) ? sales : [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting customer sales history:', error);
    throw error; // Re-throw to let caller handle it
  }
};

/**
 * Get customer debt history
 */
export const getCustomerDebtHistory = async (customerId, limit = 1000) => {
  try {
    const online = await isOnline();
    
    if (online) {
      const endpoint = `${API_ENDPOINTS.CUSTOMERS.GET(customerId)}/debt-history?limit=${limit}`;
      console.log('Fetching customer debt history from:', endpoint);
      const history = await api.get(endpoint);
      console.log('Customer debt history response:', history);
      return Array.isArray(history) ? history : [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting customer debt history:', error);
    throw error; // Re-throw to let caller handle it
  }
};

export default {
  getCustomers,
  getCustomer,
  getCachedCustomers,
  createCustomer,
  getCustomerSalesHistory,
  getCustomerDebtHistory,
};

