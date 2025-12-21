/**
 * Sales Service
 */
import api from './api';
import { API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOnline } from './api';

/**
 * Get sales list for current seller
 */
export const getSales = async (params = {}) => {
  try {
    const online = await isOnline();
    const sellerId = await AsyncStorage.getItem('seller_id');
    
    if (!sellerId) {
      return { sales: [], hasMore: false };
    }

    if (online) {
      const queryParams = new URLSearchParams();
      if (params.seller_id) queryParams.append('seller_id', params.seller_id);
      if (params.customer_id) queryParams.append('customer_id', params.customer_id);
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.skip) queryParams.append('skip', params.skip);
      if (params.limit) queryParams.append('limit', params.limit || 50);

      // If no seller_id in params, use current seller
      if (!params.seller_id) {
        queryParams.append('seller_id', sellerId);
      }

      const endpoint = `${API_ENDPOINTS.SALES.LIST}?${queryParams.toString()}`;
      console.log('Fetching sales from:', endpoint);
      const sales = await api.get(endpoint);
      console.log('Sales received (raw):', sales);
      
      // Handle different response formats - seller panel returns array directly
      let salesArray = [];
      if (Array.isArray(sales)) {
        salesArray = sales;
      } else if (sales && typeof sales === 'object') {
        // Check if it's an object with a sales property
        if (Array.isArray(sales.sales)) {
          salesArray = sales.sales;
        } else if (Array.isArray(sales.data)) {
          salesArray = sales.data;
        }
      }
      
      console.log('Sales array:', salesArray.length, 'sales');
      
      return {
        sales: salesArray,
        hasMore: salesArray.length === (params.limit || 50),
      };
    } else {
      // Return empty for offline (sales can't be created offline)
      return {
        sales: [],
        hasMore: false,
      };
    }
  } catch (error) {
    console.error('Error getting sales:', error);
    return {
      sales: [],
      hasMore: false,
    };
  }
};

/**
 * Get seller's sales history
 */
export const getSellerSalesHistory = async (sellerId) => {
  try {
    const online = await isOnline();
    
    if (online) {
      const sales = await api.get(API_ENDPOINTS.SALES.SELLER_HISTORY(sellerId));
      return sales || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting seller sales history:', error);
    return [];
  }
};

/**
 * Get single sale
 */
export const getSale = async (saleId) => {
  try {
    const online = await isOnline();
    
    if (online) {
      return await api.get(API_ENDPOINTS.SALES.GET(saleId));
    }
    
    return null;
  } catch (error) {
    console.error('Error getting sale:', error);
    return null;
  }
};

/**
 * Create a new sale
 */
export const createSale = async (saleData) => {
  try {
    const online = await isOnline();
    
    if (!online) {
      return {
        success: false,
        error: 'Sotuv yaratish uchun internet kerak',
      };
    }

    const sellerId = await AsyncStorage.getItem('seller_id');
    if (!sellerId) {
      return {
        success: false,
        error: 'Sotuvchi ID topilmadi',
      };
    }

    const salePayload = {
      seller_id: parseInt(sellerId, 10),
      customer_id: saleData.customer_id,
      items: saleData.items.map(item => ({
        product_id: item.product_id,
        requested_quantity: item.requested_quantity || item.quantity || 1,
      })),
      payment_method: saleData.payment_method || 'cash',
      payment_amount: saleData.payment_amount || null,
      excess_action: saleData.excess_action || null,
      requires_admin_approval: saleData.requires_admin_approval || false,
    };

    console.log('Creating sale with payload:', JSON.stringify(salePayload, null, 2));
    
    try {
      const sale = await api.post(API_ENDPOINTS.SALES.CREATE, salePayload);
      console.log('Sale created successfully:', sale);
      
      return {
        success: true,
        sale,
        offline: false,
      };
    } catch (error) {
      console.error('Sale creation error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  } catch (error) {
    console.error('Error creating sale:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Sotuv yaratishda xatolik',
    };
  }
};

/**
 * Get sale receipt URL
 */
export const getSaleReceiptUrl = (saleId) => {
  const API_CONFIG = require('../config/api').default;
  const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
  return `${baseUrl}${API_ENDPOINTS.SALES.RECEIPT(saleId)}`;
};

export default {
  getSales,
  getSellerSalesHistory,
  getSale,
  createSale,
  getSaleReceiptUrl,
};

