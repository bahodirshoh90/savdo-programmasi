/**
 * Orders Service
 */
import api from './api';
import { API_ENDPOINTS } from '../config/api';
import {
  saveOrderOffline,
  getUnsyncedOrders,
  markOrderSynced,
  updateOrderStatusOffline,
} from './database';
import { isOnline } from './api';

/**
 * Get orders list
 */
export const getOrders = async (params = {}) => {
  try {
    const online = await isOnline();
    
    if (online) {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.seller_id) queryParams.append('seller_id', params.seller_id);
      if (params.skip) queryParams.append('skip', params.skip);
      if (params.limit) queryParams.append('limit', params.limit || 50);

      const endpoint = `${API_ENDPOINTS.ORDERS.LIST}?${queryParams.toString()}`;
      const orders = await api.get(endpoint);
      
      // Handle different response formats - seller panel returns array directly
      let ordersArray = [];
      if (Array.isArray(orders)) {
        ordersArray = orders;
      } else if (orders && typeof orders === 'object') {
        // Check if it's an object with an orders property
        if (Array.isArray(orders.orders)) {
          ordersArray = orders.orders;
        } else if (Array.isArray(orders.data)) {
          ordersArray = orders.data;
        }
      }
      
      console.log('Orders received:', ordersArray.length, 'orders');
      
      // Also get offline orders and merge
      const offlineOrders = await getUnsyncedOrders();
      
      return {
        orders: [...ordersArray, ...offlineOrders],
        hasMore: ordersArray.length === (params.limit || 50),
      };
    } else {
      // Return offline orders only
      const offlineOrders = await getUnsyncedOrders();
      return {
        orders: offlineOrders,
        hasMore: false,
      };
    }
  } catch (error) {
    console.error('Error getting orders:', error);
    // Return offline orders as fallback
    const offlineOrders = await getUnsyncedOrders();
    return {
      orders: offlineOrders,
      hasMore: false,
    };
  }
};

/**
 * Create new order
 */
export const createOrder = async (orderData) => {
  try {
    const online = await isOnline();

    if (online) {
      // Try to create online
      try {
        const order = await api.post(API_ENDPOINTS.ORDERS.CREATE, orderData);
        return {
          success: true,
          order,
          offline: false,
        };
      } catch (error) {
        // If online creation fails, save offline
        console.warn('Online order creation failed, saving offline:', error);
      }
    }

    // Save offline
    const localId = await saveOrderOffline(orderData);
    return {
      success: true,
      order: { id: localId, ...orderData, synced: false },
      offline: true,
    };
  } catch (error) {
    console.error('Error creating order:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (orderId, status, isLocalId = false) => {
  try {
    const online = await isOnline();
    console.log('updateOrderStatus called:', { orderId, status, isLocalId, online });

    if (isLocalId || !online) {
      // Update offline order status in local database
      console.log('Updating order status offline:', orderId);
      const updated = await updateOrderStatusOffline(orderId, status);
      if (updated) {
        return { success: true, offline: true, message: 'Status offline ma\'lumotlar bazasida yangilandi' };
      } else {
        return { success: false, error: 'Buyurtma topilmadi yoki yangilanmadi' };
      }
    }

    // Update online
    try {
      console.log('Updating order status online:', API_ENDPOINTS.ORDERS.UPDATE_STATUS(orderId));
      const response = await api.put(API_ENDPOINTS.ORDERS.UPDATE_STATUS(orderId), { status });
      console.log('Update response:', response);
      return { success: true, offline: false };
    } catch (apiError) {
      console.error('Online update failed, trying offline:', apiError);
      // If online update fails, try to update offline if we have the order locally
      // For now, just return the error
      const errorMessage = apiError.response?.data?.detail || apiError.message || 'Noma\'lum xatolik';
      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    const errorMessage = error.response?.data?.detail || error.message || 'Noma\'lum xatolik';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Get single order
 */
export const getOrder = async (orderId, isLocalId = false) => {
  try {
    if (isLocalId) {
      // Get from offline database
      const offlineOrders = await getUnsyncedOrders();
      const order = offlineOrders.find(o => o.id === orderId || o.server_id === orderId);
      return order || null;
    }

    const online = await isOnline();
    if (online) {
      return await api.get(API_ENDPOINTS.ORDERS.GET(orderId));
    }

    // Fallback to offline
    const offlineOrders = await getUnsyncedOrders();
    const order = offlineOrders.find(o => o.id === orderId || o.server_id === orderId);
    return order || null;
  } catch (error) {
    console.error('Error getting order:', error);
    // Fallback to offline
    try {
      const offlineOrders = await getUnsyncedOrders();
      const order = offlineOrders.find(o => o.id === orderId || o.server_id === orderId);
      return order || null;
    } catch (fallbackError) {
      return null;
    }
  }
};

/**
 * Update order
 */
export const updateOrder = async (orderId, orderData, isLocalId = false) => {
  try {
    const online = await isOnline();

    if (isLocalId || !online) {
      // Update offline order in local database
      // TODO: Implement offline update
      return {
        success: false,
        error: 'Offline buyurtmalarni tahrirlash hozircha qo\'llab-quvvatlanmaydi',
      };
    }

    // Update online
    try {
      const response = await api.put(API_ENDPOINTS.ORDERS.UPDATE(orderId), orderData);
      return { success: true, order: response, offline: false };
    } catch (apiError) {
      const errorMessage = apiError.response?.data?.detail || apiError.message || 'Noma\'lum xatolik';
      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error) {
    console.error('Error updating order:', error);
    const errorMessage = error.response?.data?.detail || error.message || 'Noma\'lum xatolik';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Sync unsynced orders
 */
export const syncOrders = async () => {
  try {
    const online = await isOnline();
    if (!online) return 0;

    const unsynced = await getUnsyncedOrders();
    let synced = 0;

    for (const order of unsynced) {
      try {
        // Create order on server
        const { items, ...orderData } = order;
        const serverOrder = await api.post(API_ENDPOINTS.ORDERS.CREATE, {
          ...orderData,
          items: items.map(item => ({
            product_id: item.product_id,
            requested_quantity: item.requested_quantity,
          })),
        });

        // Mark as synced
        await markOrderSynced(order.id, serverOrder.id);
        synced++;
      } catch (error) {
        console.error('Error syncing order:', error);
      }
    }

    return synced;
  } catch (error) {
    console.error('Error syncing orders:', error);
    return 0;
  }
};

export default {
  getOrders,
  createOrder,
  updateOrderStatus,
  getOrder,
  updateOrder,
  syncOrders,
};

