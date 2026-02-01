/**
 * Push Notification Service for Customer App
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Warn if running on web (Expo push notifications not supported)
if (Platform.OS === 'web') {
  console.warn('[NOTIFICATIONS] Push notifications are not supported on web platform. Please use Android/iOS device or emulator for full functionality.');
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions() {
  try {
    console.log('[NOTIFICATIONS] 🔔 Checking notification permissions...');
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[NOTIFICATIONS] Current permission status:', existingStatus);
    
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      console.log('[NOTIFICATIONS] 📱 Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[NOTIFICATIONS] Permission request result:', finalStatus);
    }
    
    if (finalStatus !== 'granted') {
      console.warn('[NOTIFICATIONS] ⚠️ Notification permissions NOT granted. Status:', finalStatus);
      return false;
    }
    
    console.log('[NOTIFICATIONS] ✅ Notification permissions granted');
    return true;
  } catch (error) {
    console.error('[NOTIFICATIONS] ❌ Error requesting notification permissions:', error);
    console.error('[NOTIFICATIONS] Error details:', error.message, error.stack);
    return false;
  }
}

/**
 * Get Expo push token
 * ✅ TUZATILDI - projectId hardcoded va error handling yaxshilandi
 */
export async function getExpoPushToken() {
  try {
    console.log('[NOTIFICATIONS] 🚀 Starting getExpoPushToken...');
    
    // Check platform
    if (Platform.OS === 'web') {
      console.warn('[NOTIFICATIONS] ⚠️ Cannot get push token on web platform');
      return null;
    }
    
    console.log('[NOTIFICATIONS] Platform:', Platform.OS);
    
    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('[NOTIFICATIONS] ⚠️ Push permission not granted');
      return null;
    }

    // ✅ TUZATILDI - projectId hardcoded
    const projectId = '3cd8a367-c38b-4e0c-ac1e-dac56c10d779';
    console.log('[NOTIFICATIONS] Using projectId:', projectId);

    // Try to get token
    console.log('[NOTIFICATIONS] 🎫 Requesting Expo push token...');
    
    const tokenData = await Notifications.getExpoPushTokenAsync({ 
      projectId: projectId 
    });
    
    if (!tokenData || !tokenData.data) {
      console.error('[NOTIFICATIONS] ❌ No token data received');
      return null;
    }
    
    console.log('[NOTIFICATIONS] ✅ Expo push token obtained successfully!');
    console.log('[NOTIFICATIONS] Token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('[NOTIFICATIONS] ❌ Error in getExpoPushToken:', error);
    console.error('[NOTIFICATIONS] Error message:', error.message);
    console.error('[NOTIFICATIONS] Error stack:', error.stack);
    // ✅ TUZATILDI - return null instead of throwing
    return null;
  }
}

/**
 * Register device token with backend
 */
export async function registerDeviceToken(token, deviceId = null, platform = null) {
  try {
    const customerId = await AsyncStorage.getItem('customer_id');
    if (!customerId) {
      console.warn('[NOTIFICATIONS] ⚠️ Cannot register token: customer not logged in');
      return false;
    }

    // Device ID olish
    let finalDeviceId = deviceId;
    if (!finalDeviceId) {
      try {
        finalDeviceId = Constants.deviceId || 
                       Constants.sessionId || 
                       Constants.installationId ||
                       `device_${Date.now()}`;
      } catch (e) {
        finalDeviceId = `device_${Date.now()}`;
      }
    }
    
    const platformName = platform || Platform.OS;
    
    console.log('[NOTIFICATIONS] 📱 Registering token with backend:');
    console.log('[NOTIFICATIONS]   - Token:', token.substring(0, 20) + '...');
    console.log('[NOTIFICATIONS]   - Customer ID:', customerId);
    console.log('[NOTIFICATIONS]   - Device ID:', finalDeviceId);
    console.log('[NOTIFICATIONS]   - Platform:', platformName);

    try {
      const response = await api.post('/notifications/register-token', {
        token,
        device_id: finalDeviceId,
        platform: platformName,
      }, {
        headers: {
          'X-Customer-ID': customerId,
        },
      });
      
      await AsyncStorage.setItem('expo_push_token', token);
      console.log('[NOTIFICATIONS] ✅ Device token registered successfully!');
      console.log('[NOTIFICATIONS] Server response:', response);
      return true;
    } catch (error) {
      console.error('[NOTIFICATIONS] ❌ Error registering device token:');
      console.error('[NOTIFICATIONS] Error response:', error?.response?.data);
      console.error('[NOTIFICATIONS] Error message:', error.message);
      console.error('[NOTIFICATIONS] Error status:', error?.response?.status);
      return false;
    }
  } catch (error) {
    console.error('[NOTIFICATIONS] ❌ Error in registerDeviceToken:', error);
    console.error('[NOTIFICATIONS] Error message:', error.message);
    return false;
  }
}

/**
 * Unregister device token
 */
export async function unregisterDeviceToken(token) {
  try {
    await api.delete('/notifications/unregister-token', {
      params: { token },
    });
    
    await AsyncStorage.removeItem('expo_push_token');
    console.log('[NOTIFICATIONS] ✅ Device token unregistered');
    return true;
  } catch (error) {
    console.error('[NOTIFICATIONS] ❌ Error unregistering device token:', error);
    return false;
  }
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(navigation) {
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('[NOTIFICATIONS] 📬 Notification received (foreground):', notification);
    }
  );
  
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('[NOTIFICATIONS] 👆 Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      if (data?.type === 'order_status' && data?.order_id) {
        navigation?.navigate('OrderDetail', { orderId: data.order_id });
      } else if (data?.type === 'new_product' && data?.product_id) {
        navigation?.navigate('ProductDetail', { productId: data.product_id });
      } else if (data?.type === 'price_alert' && data?.product_id) {
        navigation?.navigate('ProductDetail', { productId: data.product_id });
      }
    }
  );
  
  console.log('[NOTIFICATIONS] ✅ Notification listeners setup complete');
  
  return {
    foregroundSubscription,
    responseSubscription,
  };
}

/**
 * Remove notification listeners
 */
export function removeNotificationListeners(subscriptions) {
  if (subscriptions?.foregroundSubscription) {
    Notifications.removeNotificationSubscription(subscriptions.foregroundSubscription);
  }
  if (subscriptions?.responseSubscription) {
    Notifications.removeNotificationSubscription(subscriptions.responseSubscription);
  }
  console.log('[NOTIFICATIONS] 🧹 Notification listeners removed');
}

/**
 * Initialize notifications (call on app start)
 */
export async function initializeNotifications(navigation) {
  try {
    console.log('[NOTIFICATIONS] 🚀 Initializing notifications...');
    console.log('[NOTIFICATIONS] Platform:', Platform.OS);
    
    if (Platform.OS === 'web') {
      console.warn('[NOTIFICATIONS] ⚠️ Skipping initialization on web platform');
      return null;
    }
    
    if (Platform.OS === 'android') {
      console.log('[NOTIFICATIONS] 📱 Setting up Android notification channel...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4f46e5',
        sound: 'default',
      });
      console.log('[NOTIFICATIONS] ✅ Android notification channel created');
    }

    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('[NOTIFICATIONS] ⚠️ Notification permissions not granted');
      return null;
    }
    
    // Get push token
    const token = await getExpoPushToken();
    if (!token) {
      console.warn('[NOTIFICATIONS] ⚠️ Could not get Expo push token');
      return null;
    }
    
    // Check if customer is logged in before registering
    const customerId = await AsyncStorage.getItem('customer_id');
    if (customerId) {
      const registered = await registerDeviceToken(token);
      if (registered) {
        console.log('[NOTIFICATIONS] ✅ Token registered with backend');
      } else {
        console.warn('[NOTIFICATIONS] ⚠️ Failed to register token with backend');
      }
    } else {
      console.log('[NOTIFICATIONS] ℹ️ Customer not logged in, skipping token registration');
    }
    
    // Setup listeners
    const subscriptions = setupNotificationListeners(navigation);
    
    console.log('[NOTIFICATIONS] ✅ Notifications initialized successfully!');
    
    return {
      token,
      subscriptions,
    };
  } catch (error) {
    console.error('[NOTIFICATIONS] ❌ Error initializing notifications:', error);
    console.error('[NOTIFICATIONS] Error message:', error.message);
    console.error('[NOTIFICATIONS] Error stack:', error.stack);
    return null;
  }
}