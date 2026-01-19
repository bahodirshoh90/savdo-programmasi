/**
 * Products Service for Customer App
 */
import api from './api';
import { API_ENDPOINTS } from '../config/api';

/**
 * Get products list
 */
export const getProducts = async (
  search = '',
  skip = 0,
  limit = 100,
  brand = '',
  supplier = '',
  sort = ''
) => {
  try {
    let url = `${API_ENDPOINTS.PRODUCTS.LIST}?skip=${skip}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (brand) url += `&brand=${encodeURIComponent(brand)}`;
    if (supplier) url += `&supplier=${encodeURIComponent(supplier)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;

    const response = await api.get(url);
    return Array.isArray(response) ? response : (response?.products || []);
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
};

/**
 * Get product by ID
 */
export const getProduct = async (productId) => {
  try {
    const response = await api.get(API_ENDPOINTS.PRODUCTS.GET(productId));
    return response;
  } catch (error) {
    console.error('Error getting product:', error);
    throw error;
  }
};
