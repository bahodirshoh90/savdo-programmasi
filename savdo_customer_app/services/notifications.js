/**
 * Push Notification Service for Customer App
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Get Expo push token
 */
export async function getExpoPushToken() {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'ea4b267c-a627-404a-a062-2ed13042ef22', // From app.json
    });
    
    return tokenData.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
}

/**
 * Get native device push token (FCM for Android)
 */
export async function getDevicePushToken() {
  try {
    if (Platform.OS !== 'android') {
      return null;
    }

    const deviceToken = await Notifications.getDevicePushTokenAsync();
    if (deviceToken?.type === 'fcm') {
      return deviceToken.data;
    }

    return null;
  } catch (error) {
    console.error('Error getting device push token:', error);
    return null;
  }
}

/**
 * Register device token with backend
 */
export async function registerDeviceToken(token, deviceId = null, platform = null, storageKey = 'expo_push_token') {
  try {
    const customerId = await AsyncStorage.getItem('customer_id');
    if (!customerId) {
      console.warn('Cannot register token: customer not logged in');
      return false;
    }
    
    const platformName = platform || Platform.OS;
    
    await api.post('/api/notifications/register-token', {
      token,
      device_id: deviceId,
      platform: platformName,
    });
    
    // Save token locally
    await AsyncStorage.setItem(storageKey, token);
    
    console.log('Device token registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering device token:', error);
    return false;
  }
}

/**
 * Unregister device token
 */
export async function unregisterDeviceToken(token) {
  try {
    await api.delete('/api/notifications/unregister-token', {
      params: { token },
    });
    
    await AsyncStorage.removeItem('expo_push_token');
    console.log('Device token unregistered');
    return true;
  } catch (error) {
    console.error('Error unregistering device token:', error);
    return false;
  }
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(navigation) {
  // Handle notification received while app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received (foreground):', notification);
      // You can show a custom in-app notification here
    }
  );
  
  // Handle notification tapped/opened
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      // Handle navigation based on notification type
      if (data?.type === 'order_status' && data?.order_id) {
        navigation?.navigate('OrderDetail', { orderId: data.order_id });
      } else if (data?.type === 'new_product' && data?.product_id) {
        navigation?.navigate('ProductDetail', { productId: data.product_id });
      } else if (data?.type === 'price_alert' && data?.product_id) {
        navigation?.navigate('ProductDetail', { productId: data.product_id });
      }
    }
  );
  
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
}

/**
 * Initialize notifications (call on app start)
 */
export async function initializeNotifications(navigation) {
  try {
    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    // Get push token
    const expoToken = await getExpoPushToken();
    const deviceToken = await getDevicePushToken();

    if (!expoToken && !deviceToken) {
      console.warn('Could not get push token');
      return null;
    }

    // Register FCM token first (Android)
    if (deviceToken) {
      await registerDeviceToken(deviceToken, null, 'android', 'fcm_push_token');
    }

    // Register Expo token for iOS or as fallback
    if (expoToken && (Platform.OS !== 'android' || !deviceToken)) {
      await registerDeviceToken(expoToken, null, Platform.OS, 'expo_push_token');
    }
    
    // Setup listeners
    const subscriptions = setupNotificationListeners(navigation);
    
    return {
      token: expoToken || deviceToken,
      tokens: {
        expo: expoToken,
        device: deviceToken,
      },
      subscriptions,
    };
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return null;
  }
}
