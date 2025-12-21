/**
 * Statistics Service
 */
import api from './api';
import { API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOnline } from './api';

/**
 * Get statistics for dashboard
 */
export const getStatistics = async (startDate, endDate) => {
  try {
    const online = await isOnline();
    const sellerId = await AsyncStorage.getItem('seller_id');
    
    if (!online) {
      return {
        total_profit: 0,
        total_sales: 0,
        total_amount: 0,
      };
    }
    
    let url = API_ENDPOINTS.STATISTICS.GET;
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (sellerId) params.push(`seller_id=${sellerId}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    return await api.get(url);
  } catch (error) {
    console.error('Error getting statistics:', error);
    return {
      total_profit: 0,
      total_sales: 0,
      total_amount: 0,
    };
  }
};

/**
 * Get products count
 */
export const getProductsCount = async () => {
  try {
    const online = await isOnline();
    
    if (!online) {
      return 0;
    }
    
    const data = await api.get(API_ENDPOINTS.PRODUCTS_COUNT);
    return data.count || 0;
  } catch (error) {
    console.error('Error getting products count:', error);
    return 0;
  }
};

/**
 * Get dashboard data (all stats combined)
 * Same logic as seller panel dashboard
 */
export const getDashboardData = async () => {
  try {
    const online = await isOnline();
    if (!online) {
      // Return cached data if offline
      try {
        const { getCachedProducts } = require('./database');
        const cachedProducts = await getCachedProducts();
        const productsCount = Array.isArray(cachedProducts) ? cachedProducts.length : 0;
        return {
          productsCount,
          todaySalesCount: 0,
          todayRevenue: 0,
          pendingOrdersCount: 0,
          statistics: {
            total_profit: 0,
            total_sales: 0,
            total_amount: 0,
          },
        };
      } catch (cacheError) {
        return {
          productsCount: 0,
          todaySalesCount: 0,
          todayRevenue: 0,
          pendingOrdersCount: 0,
          statistics: {
            total_profit: 0,
            total_sales: 0,
            total_amount: 0,
          },
        };
      }
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const sellerId = await AsyncStorage.getItem('seller_id');
    console.log('Dashboard sellerId:', sellerId);
    
    // Initialize default values
    let stats = { total_profit: 0, total_sales: 0, total_amount: 0 };
    let productsCount = 0;
    let todaySales = [];
    let pendingOrders = [];
    
    // Get statistics with seller_id filter (same as seller panel)
    try {
      let statsUrl = `${API_ENDPOINTS.STATISTICS.GET}?start_date=${todayStr}&end_date=${tomorrowStr}`;
      if (sellerId) {
        statsUrl += `&seller_id=${sellerId}`;
      }
      console.log('Fetching statistics from:', statsUrl);
      stats = await api.get(statsUrl);
      console.log('Statistics loaded:', stats);
    } catch (e) {
      console.error('Error fetching statistics:', e);
    }
    
    // Get products count (same as seller panel)
    try {
      productsCount = await getProductsCount();
      console.log('Products count:', productsCount);
    } catch (e) {
      console.error('Error fetching products count:', e);
    }
    
    // Get today's sales with seller_id filter (same as seller panel)
    try {
      const salesParams = {
        start_date: todayStr,
        end_date: tomorrowStr,
        limit: 1000,
      };
      if (sellerId) {
        salesParams.seller_id = parseInt(sellerId, 10);
      }
      
      const { getSales } = require('./sales');
      const salesResult = await getSales(salesParams);
      // getSales returns { sales: [], hasMore: boolean }
      todaySales = salesResult.sales || (Array.isArray(salesResult) ? salesResult : []);
      
      // Double-check seller_id filter (same as seller panel)
      // Even if we pass seller_id in params, filter again to be safe
      const todaySalesForSeller = sellerId 
        ? todaySales.filter(s => s && String(s.seller_id) === String(sellerId))
        : todaySales;
      
      console.log('Today sales fetched:', {
        totalFromAPI: todaySales.length,
        forSeller: todaySalesForSeller.length,
        sellerId: sellerId
      });
      
      // Calculate revenue from filtered sales
      const todayRevenue = todaySalesForSeller.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0);
      
      // Get pending orders (same as seller panel)
      try {
        const { getOrders } = require('./orders');
        const ordersParams = {
          status: 'pending',
        };
        // Seller panel doesn't filter orders by seller_id, it gets all pending orders
        // But if sellerId is provided, we can filter
        const ordersResult = await getOrders(ordersParams);
        // getOrders returns { orders: [], hasMore: boolean }
        pendingOrders = ordersResult.orders || [];
        
        // Filter by seller_id if provided (seller panel doesn't do this, but for consistency)
        if (sellerId) {
          pendingOrders = pendingOrders.filter(o => o && String(o.seller_id) === String(sellerId));
        }
        
        console.log('Pending orders:', pendingOrders.length);
      } catch (e) {
        console.error('Error fetching pending orders:', e);
      }
      
      return {
        productsCount,
        todaySalesCount: todaySalesForSeller.length, // Use filtered count
        todayRevenue,
        pendingOrdersCount: pendingOrders.length,
        statistics: stats,
      };
    } catch (e) {
      console.error('Error fetching sales:', e);
      return {
        productsCount,
        todaySalesCount: 0,
        todayRevenue: 0,
        pendingOrdersCount: pendingOrders.length,
        statistics: stats,
      };
    }
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    // Try to get cached data
    try {
      const { getCachedProducts } = require('./database');
      const cachedProducts = await getCachedProducts();
      const productsCount = Array.isArray(cachedProducts) ? cachedProducts.length : 0;
      
      return {
        productsCount,
        todaySalesCount: 0,
        todayRevenue: 0,
        pendingOrdersCount: 0,
        statistics: {
          total_profit: 0,
          total_sales: 0,
          total_amount: 0,
        },
      };
    } catch (cacheError) {
      return {
        productsCount: 0,
        todaySalesCount: 0,
        todayRevenue: 0,
        pendingOrdersCount: 0,
        statistics: {
          total_profit: 0,
          total_sales: 0,
          total_amount: 0,
        },
      };
    }
  }
};

export default {
  getStatistics,
  getProductsCount,
  getDashboardData,
};

