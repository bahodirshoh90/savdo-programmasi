/**
 * Products Service
 */
import api from './api';
import { isOnline } from './api';
import { API_ENDPOINTS } from '../config/api';
import { cacheProducts, getCachedProducts } from './database';

/**
 * Get products list with pagination
 * @param {string} search - Search query (if provided, returns all matching results without pagination)
 * @param {number} skip - Number of items to skip (for pagination)
 * @param {number} limit - Number of items to return (default: 20)
 */
export const getProducts = async (search = '', skip = 0, limit = 20, brand = '', supplier = '', location = '') => {
  try {
    const online = await isOnline();

    if (online) {
      // If search or filters are provided, get all results without pagination limit
      const hasFilters = search || brand || supplier || location;
      const actualLimit = hasFilters ? 1000 : limit;
      
      let endpoint = API_ENDPOINTS.PRODUCTS.LIST;
      const params = [];
      
      if (search) {
        params.push(`search=${encodeURIComponent(search)}`);
      }
      
      if (brand) {
        params.push(`brand=${encodeURIComponent(brand)}`);
      }
      
      if (supplier) {
        params.push(`supplier=${encodeURIComponent(supplier)}`);
      }
      
      if (location) {
        params.push(`location=${encodeURIComponent(location)}`);
      }
      
      // Only apply pagination if not searching/filtering (search returns all results)
      if (!hasFilters && skip > 0) {
        params.push(`skip=${skip}`);
      }
      
      if (actualLimit !== 100) { // Default is 100, only add if different
        params.push(`limit=${actualLimit}`);
      }
      
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }

      console.log('Fetching products from:', endpoint);
      const response = await api.get(endpoint);
      console.log('Products API response received:', {
        type: typeof response,
        isArray: Array.isArray(response),
        hasProducts: response?.products !== undefined,
        hasData: response?.data !== undefined,
        length: Array.isArray(response) ? response.length : (response?.products?.length || response?.data?.length || 0)
      });
      
      // apiCall already checks for HTML, so if we get here, response should be valid
      // But double-check just in case
      if (typeof response === 'string' && (response.trim().startsWith('<!DOCTYPE') || response.trim().startsWith('<html'))) {
        console.error('Products API returned HTML instead of JSON. Backend server may not be running or endpoint is incorrect.');
        // Fall through to catch block to use cached data
        throw { message: 'API returned HTML instead of JSON. Check if backend server is running.', useCache: true };
      }
      
      // Handle different response formats
      let products = response;
      if (response && typeof response === 'object') {
        // Check if response has products array
        if (Array.isArray(response.products)) {
          products = response.products;
        } else if (Array.isArray(response.data)) {
          products = response.data;
        } else if (Array.isArray(response)) {
          products = response;
        } else {
          console.warn('Unexpected products response format:', response);
          products = [];
        }
      } else if (!Array.isArray(response)) {
        console.warn('Products response is not an array:', response);
        products = [];
      }
      
      // Ensure products is an array
      if (!Array.isArray(products)) {
        products = [];
      }
      
      // Cache products
      if (products.length > 0) {
        await cacheProducts(products);
      }

      return products;
    } else {
      // Return cached products
      const cached = await getCachedProducts();
      
      // Ensure cached is an array
      const cachedArray = Array.isArray(cached) ? cached : [];
      
      // Filter by search and other filters if provided
      let filtered = cachedArray;
      
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          p =>
            p && p.name && p.name.toLowerCase().includes(searchLower) ||
            (p && p.barcode && p.barcode.includes(search))
        );
      }
      
      if (brand) {
        const brandLower = brand.toLowerCase();
        filtered = filtered.filter(
          p => p && p.brand && p.brand.toLowerCase().includes(brandLower)
        );
      }
      
      if (supplier) {
        const supplierLower = supplier.toLowerCase();
        filtered = filtered.filter(
          p => p && p.supplier && p.supplier.toLowerCase().includes(supplierLower)
        );
      }
      
      if (location) {
        const locationLower = location.toLowerCase();
        filtered = filtered.filter(
          p => p && p.location && p.location.toLowerCase().includes(locationLower)
        );
      }

      // Apply pagination to cached products
      const hasFilters = search || brand || supplier || location;
      if (hasFilters) {
        return filtered; // Return all filtered results
      }
      return filtered.slice(skip, skip + limit);
    }
    } catch (error) {
      console.error('Error getting products:', error);
      // Always try to return cached products as fallback
      try {
        const cached = await getCachedProducts();
        const cachedArray = Array.isArray(cached) ? cached : [];
        
        if (cachedArray.length > 0) {
          let filtered = cachedArray;
          
          if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(
              p =>
                p && p.name && p.name.toLowerCase().includes(searchLower) ||
                (p && p.barcode && p.barcode.includes(search))
            );
          }
          
          if (brand) {
            const brandLower = brand.toLowerCase();
            filtered = filtered.filter(
              p => p && p.brand && p.brand.toLowerCase().includes(brandLower)
            );
          }
          
          if (supplier) {
            const supplierLower = supplier.toLowerCase();
            filtered = filtered.filter(
              p => p && p.supplier && p.supplier.toLowerCase().includes(supplierLower)
            );
          }
          
          if (location) {
            const locationLower = location.toLowerCase();
            filtered = filtered.filter(
              p => p && p.location && p.location.toLowerCase().includes(locationLower)
            );
          }
          
          const hasFilters = search || brand || supplier || location;
          if (hasFilters) {
            return filtered;
          }
          return filtered.slice(skip, skip + limit) || [];
        }
        return [];
      } catch (cacheError) {
        console.error('Error getting cached products:', cacheError);
        return [];
      }
    }
};

/**
 * Get single product
 */
export const getProduct = async (productId) => {
  try {
    const online = await isOnline();

    if (online) {
      const product = await api.get(API_ENDPOINTS.PRODUCTS.GET(productId));
      
      // Cache product
      await cacheProducts([product]);

      return product;
    } else {
      // Get from cache
      const cached = await getCachedProducts();
      return cached.find(p => p.id === productId) || null;
    }
  } catch (error) {
    console.error('Error getting product:', error);
    // Try cache
    const cached = await getCachedProducts();
    return cached.find(p => p.id === productId) || null;
  }
};

export default {
  getProducts,
  getProduct,
};

