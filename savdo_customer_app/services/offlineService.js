/**
 * Offline Service - Offline mode uchun cache va sync
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const OFFLINE_CACHE_KEYS = {
  PRODUCTS: 'offline_products',
  ORDERS: 'offline_orders',
  CART: 'offline_cart',
  FAVORITES: 'offline_favorites',
  PROFILE: 'offline_profile',
  LAST_SYNC: 'last_sync_timestamp',
};

class OfflineService {
  constructor() {
    this.isOnline = true;
    this.syncQueue = [];
    this.isSyncing = false;
    this.init();
  }

  async init() {
    // Check network status
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected;
      if (this.isOnline) {
        this.syncAll();
      }
    });

    // Initial network check
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected;
  }

  // Check if online
  isConnected() {
    return this.isOnline;
  }

  // Cache data
  async cacheData(key, data) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error(`Error caching ${key}:`, error);
    }
  }

  // Get cached data
  async getCachedData(key, maxAge = 24 * 60 * 60 * 1000) {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;

      if (age > maxAge) {
        // Cache expired
        await AsyncStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error(`Error getting cached ${key}:`, error);
      return null;
    }
  }

  // Cache products
  async cacheProducts(products) {
    await this.cacheData(OFFLINE_CACHE_KEYS.PRODUCTS, products);
  }

  // Get cached products
  async getCachedProducts() {
    return await this.getCachedData(OFFLINE_CACHE_KEYS.PRODUCTS, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  // Cache orders
  async cacheOrders(orders) {
    await this.cacheData(OFFLINE_CACHE_KEYS.ORDERS, orders);
  }

  // Get cached orders
  async getCachedOrders() {
    return await this.getCachedData(OFFLINE_CACHE_KEYS.ORDERS, 30 * 24 * 60 * 60 * 1000); // 30 days
  }

  // Add to sync queue
  async addToSyncQueue(action, data) {
    const queueItem = {
      id: Date.now().toString(),
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.syncQueue.push(queueItem);
    await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncAll();
    }
  }

  // Load sync queue
  async loadSyncQueue() {
    try {
      const queue = await AsyncStorage.getItem('sync_queue');
      if (queue) {
        this.syncQueue = JSON.parse(queue);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  // Sync all pending actions
  async syncAll() {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    await this.loadSyncQueue();

    const failedItems = [];

    for (const item of this.syncQueue) {
      try {
        const success = await this.syncItem(item);
        if (!success) {
          item.retries++;
          if (item.retries < 3) {
            failedItems.push(item);
          }
        }
      } catch (error) {
        console.error('Error syncing item:', error);
        item.retries++;
        if (item.retries < 3) {
          failedItems.push(item);
        }
      }
    }

    this.syncQueue = failedItems;
    await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    this.isSyncing = false;

    // Update last sync timestamp
    await AsyncStorage.setItem(OFFLINE_CACHE_KEYS.LAST_SYNC, Date.now().toString());
  }

  // Sync single item
  async syncItem(item) {
    const { API_ENDPOINTS } = require('../config/api');
    const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
      ? API_ENDPOINTS.BASE_URL 
      : `${API_ENDPOINTS.BASE_URL}/api`;

    const customerId = await AsyncStorage.getItem('customer_id');
    if (!customerId) return false;

    try {
      switch (item.action) {
        case 'create_order':
          const orderResponse = await fetch(`${baseUrl}/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Customer-ID': customerId,
            },
            body: JSON.stringify(item.data),
          });
          return orderResponse.ok;

        case 'update_profile':
          const profileResponse = await fetch(`${baseUrl}/customers/${customerId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Customer-ID': customerId,
            },
            body: JSON.stringify(item.data),
          });
          return profileResponse.ok;

        case 'add_favorite':
          const favoriteResponse = await fetch(`${baseUrl}/favorites`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Customer-ID': customerId,
            },
            body: JSON.stringify(item.data),
          });
          return favoriteResponse.ok;

        case 'remove_favorite':
          const removeFavoriteResponse = await fetch(`${baseUrl}/favorites/${item.data.product_id}`, {
            method: 'DELETE',
            headers: {
              'X-Customer-ID': customerId,
            },
          });
          return removeFavoriteResponse.ok;

        default:
          return false;
      }
    } catch (error) {
      console.error('Error syncing item:', error);
      return false;
    }
  }

  // Get last sync time
  async getLastSyncTime() {
    try {
      const timestamp = await AsyncStorage.getItem(OFFLINE_CACHE_KEYS.LAST_SYNC);
      return timestamp ? parseInt(timestamp) : null;
    } catch (error) {
      return null;
    }
  }

  // Clear all cache
  async clearCache() {
    try {
      await AsyncStorage.multiRemove(Object.values(OFFLINE_CACHE_KEYS));
      this.syncQueue = [];
      await AsyncStorage.removeItem('sync_queue');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export default new OfflineService();
