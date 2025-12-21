/**
 * Seller Service
 */
import api from './api';
import { API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get seller profile
 */
export const getSellerProfile = async (sellerId) => {
  try {
    const response = await api.get(API_ENDPOINTS.SELLERS.GET(sellerId));
    return response;
  } catch (error) {
    console.error('Error getting seller profile:', error);
    throw error;
  }
};

/**
 * Update seller profile
 */
export const updateSellerProfile = async (sellerId, profileData) => {
  try {
    const response = await api.put(API_ENDPOINTS.SELLERS.UPDATE(sellerId), profileData);
    return response;
  } catch (error) {
    console.error('Error updating seller profile:', error);
    throw error;
  }
};

/**
 * Upload seller profile image
 */
export const uploadSellerImage = async (sellerId, imageUri) => {
  try {
    const { Platform } = require('react-native');
    const axios = require('axios');
    const { default: API_CONFIG } = require('../config/api');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Use React Native's FormData
    const formData = new FormData();
    
    // Extract filename from URI
    let filename = 'photo.jpg';
    let type = 'image/jpeg';
    
    if (imageUri.includes('.')) {
      const match = /\.(\w+)$/.exec(imageUri);
      if (match) {
        type = `image/${match[1]}`;
        filename = `photo.${match[1]}`;
      }
    }
    
    if (Platform.OS === 'web') {
      // For web, if it's a data URI, convert to blob
      if (imageUri.startsWith('data:')) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
      } else {
        formData.append('file', imageUri);
      }
    } else {
      // For native platforms
      formData.append('file', {
        uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
        name: filename,
        type: type,
      });
    }
    
    const token = await AsyncStorage.getItem('auth_token');
    const headers = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const sellerIdHeader = await AsyncStorage.getItem('seller_id');
    if (sellerIdHeader) {
      headers['X-Seller-ID'] = sellerIdHeader;
    }
    
    // Don't set Content-Type - let axios/browser set it with boundary
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.SELLERS.UPLOAD_IMAGE(sellerId)}`,
      formData,
      { 
        headers,
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error uploading seller image:', error);
    throw error;
  }
};

/**
 * Get current seller from storage
 */
export const getCurrentSeller = async () => {
  try {
    const userDataStr = await AsyncStorage.getItem('user_data');
    if (userDataStr) {
      return JSON.parse(userDataStr);
    }
    return null;
  } catch (error) {
    console.error('Error getting current seller:', error);
    return null;
  }
};

export default {
  getSellerProfile,
  updateSellerProfile,
  uploadSellerImage,
  getCurrentSeller,
};

