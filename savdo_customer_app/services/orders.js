/**
 * Orders Service for Customer App
 */
import api, { apiCall } from './api';
import { API_ENDPOINTS } from '../config/api';
import API_CONFIG from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get customer's orders
 */
export const getOrders = async (status = null, skip = 0, limit = 100) => {
  try {
    const customerId = await AsyncStorage.getItem('customer_id');
    console.log('[ORDERS] Getting orders with:', { customerId, status, skip, limit });
    
    if (!customerId) {
      console.warn('[ORDERS] Customer ID not found - returning empty orders list');
      return []; // Return empty array instead of throwing error
    }

    let url = `${API_ENDPOINTS.ORDERS.LIST}?customer_id=${customerId}&skip=${skip}&limit=${limit}`;
    // Only add status if it's provided and not 'all' or null
    // Backend expects None/null for "all orders", not the string "all"
    if (status && status !== 'all' && status !== null && status !== '') {
      url += `&status=${status}`;
      console.log('[ORDERS SERVICE] Adding status filter:', status);
    } else {
      console.log('[ORDERS SERVICE] No status filter - loading all orders');
    }

    console.log('[ORDERS] Request URL:', url);
    const response = await api.get(url);
    console.log('[ORDERS] Response received:', response);
    console.log('[ORDERS] Response type:', typeof response);
    console.log('[ORDERS] Is array:', Array.isArray(response));
    console.log('[ORDERS] Response length:', Array.isArray(response) ? response.length : 'N/A');
    
    const orders = Array.isArray(response) ? response : (response?.orders || []);
    console.log('[ORDERS] Final orders array length:', orders.length);
    return orders;
  } catch (error) {
    console.error('[ORDERS] Error getting orders:', error);
    console.error('[ORDERS] Error message:', error.message);
    console.error('[ORDERS] Error response:', error.response?.data);
    console.error('[ORDERS] Error status:', error.response?.status);
    // Return empty array on error instead of throwing
    return [];
  }
};

/**
 * Get order by ID
 */
export const getOrder = async (orderId) => {
  try {
    const response = await api.get(API_ENDPOINTS.ORDERS.GET(orderId));
    return response;
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
};

/**
 * Create order
 */
export const createOrder = async (orderData) => {
  try {
    const customerId = await AsyncStorage.getItem('customer_id');
    if (!customerId) {
      throw new Error('Customer ID not found. Please login again.');
    }
    
    const sellerId = await AsyncStorage.getItem('default_seller_id') || '1'; // Default seller ID

    // Ensure items are properly formatted
    const items = (orderData.items || []).map(item => ({
      product_id: parseInt(item.product_id, 10),
      requested_quantity: parseInt(item.requested_quantity, 10),
    })).filter(item => item.product_id > 0 && item.requested_quantity > 0);

    if (items.length === 0) {
      throw new Error('Buyurtma uchun mahsulot topilmadi.');
    }

    const orderPayload = {
      customer_id: parseInt(customerId, 10),
      seller_id: parseInt(sellerId, 10),
      items: items,
      is_offline: false,
      payment_method: orderData.payment_method || 'cash', // cash, card, debt
    };

    console.log('[ORDERS] ===== CREATING ORDER =====');
    console.log('[ORDERS] Payload:', JSON.stringify(orderPayload, null, 2));
    console.log('[ORDERS] API endpoint:', API_ENDPOINTS.ORDERS.CREATE);
    console.log('[ORDERS] Full URL:', API_CONFIG.BASE_URL + API_ENDPOINTS.ORDERS.CREATE);
    console.log('[ORDERS] Making POST request...');
    
    try {
      // Use api.post directly (it's already exported from api.js)
      // api.post returns response.data directly (see api.js apiCall function)
      console.log('[ORDERS] Making POST request to:', API_CONFIG.BASE_URL + API_ENDPOINTS.ORDERS.CREATE);
      const response = await api.post(API_ENDPOINTS.ORDERS.CREATE, orderPayload);
      console.log('[ORDERS] ===== ORDER CREATED SUCCESSFULLY =====');
      console.log('[ORDERS] Response received:', response);
      console.log('[ORDERS] Response type:', typeof response);
      console.log('[ORDERS] Response keys:', Object.keys(response || {}));
      console.log('[ORDERS] Response data:', JSON.stringify(response, null, 2));
      
      // api.post already returns response.data, so return directly
      return response;
    } catch (apiError) {
      console.error('[ORDERS] ===== API CALL FAILED =====');
      console.error('[ORDERS] API Error:', apiError);
      console.error('[ORDERS] Error message:', apiError.message);
      console.error('[ORDERS] Error response data:', apiError.response?.data);
      console.error('[ORDERS] Error response status:', apiError.response?.status);
      throw apiError;
    }
  } catch (error) {
    console.error('[ORDERS] Error creating order:', error);
    console.error('[ORDERS] Error message:', error.message);
    console.error('[ORDERS] Error response:', error.response?.data);
    console.error('[ORDERS] Error status:', error.response?.status);
    console.error('[ORDERS] Error config:', error.config?.url);
    throw error;
  }
};
