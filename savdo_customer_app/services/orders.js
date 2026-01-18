/**
 * Orders Service for Customer App
 */
import api from './api';
import { API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get customer's orders
 */
export const getOrders = async (status = null, skip = 0, limit = 100) => {
  try {
    const customerId = await AsyncStorage.getItem('customer_id');
    if (!customerId) {
      console.warn('Customer ID not found - returning empty orders list');
      return []; // Return empty array instead of throwing error
    }

    let url = `${API_ENDPOINTS.ORDERS.LIST}?customer_id=${customerId}&skip=${skip}&limit=${limit}`;
    if (status) url += `&status=${status}`;

    const response = await api.get(url);
    return Array.isArray(response) ? response : (response?.orders || []);
  } catch (error) {
    console.error('Error getting orders:', error);
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
    };

    console.log('[ORDERS] Creating order with payload:', JSON.stringify(orderPayload, null, 2));
    console.log('[ORDERS] API endpoint:', API_ENDPOINTS.ORDERS.CREATE);
    
    const response = await api.post(API_ENDPOINTS.ORDERS.CREATE, orderPayload);
    console.log('[ORDERS] Order creation response:', response);
    
    return response;
  } catch (error) {
    console.error('[ORDERS] Error creating order:', error);
    console.error('[ORDERS] Error message:', error.message);
    console.error('[ORDERS] Error response:', error.response?.data);
    console.error('[ORDERS] Error status:', error.response?.status);
    console.error('[ORDERS] Error config:', error.config?.url);
    throw error;
  }
};
