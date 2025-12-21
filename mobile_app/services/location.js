/**
 * Location Tracking Service
 */
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { saveLocation, getUnsyncedLocations, markLocationSynced } from './database';
import api from './api';
import { API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_STORAGE_KEY = 'location_tracking_enabled';

// Web location tracking interval (for periodic updates)
let webLocationWatchSubscription = null;
let webLocationIntervalId = null;

// Background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location) {
      // Save to local database
      await saveLocation(location.coords.latitude, location.coords.longitude);
      
      // Try to sync immediately if online
      await syncLocation(location.coords.latitude, location.coords.longitude);
    }
  }
});

/**
 * Request location permissions
 */
export const requestLocationPermissions = async () => {
  try {
    // Web uses browser geolocation API
    if (isWeb) {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ success: false, message: 'Geolocation is not supported by your browser' });
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          () => {
            resolve({ success: true });
          },
          (error) => {
            let message = 'Location permission denied';
            if (error.code === error.PERMISSION_DENIED) {
              message = 'Location permission denied by user';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              message = 'Location information is unavailable';
            } else if (error.code === error.TIMEOUT) {
              message = 'Location request timed out';
            }
            resolve({ success: false, message });
          },
          { timeout: 5000 }
        );
      });
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, message: 'Location permission denied' };
    }

    // Background permissions only for native platforms
    try {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission not granted, using foreground only');
      }
    } catch (bgError) {
      console.warn('Background permissions not available:', bgError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Start location tracking
 */
export const startLocationTracking = async () => {
  try {
    // Get seller ID
    const sellerId = await AsyncStorage.getItem('seller_id');
    if (!sellerId) {
      return { success: false, message: 'Seller ID not found' };
    }

    // Check permissions
    const permissionResult = await requestLocationPermissions();
    if (!permissionResult.success) {
      return permissionResult;
    }

    // Web platform - use browser geolocation with interval
    if (isWeb) {
      // Check if already running
      if (webLocationIntervalId) {
        return { success: true, message: 'Location tracking already running' };
      }

      // Function to get and sync location
      const updateLocation = async () => {
        try {
          if (!navigator.geolocation) {
            console.error('Geolocation not supported');
            return;
          }

          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const latitude = position.coords.latitude;
              const longitude = position.coords.longitude;
              
              console.log('Web: Location updated:', { latitude, longitude });
              
              // Save to local database
              await saveLocation(latitude, longitude);
              
              // Sync to server
              await syncLocation(latitude, longitude);
            },
            (error) => {
              console.error('Web: Error getting location:', error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        } catch (error) {
          console.error('Web: Error in updateLocation:', error);
        }
      };

      // Initial location update
      await updateLocation();

      // Set up periodic updates (every 5 minutes)
      webLocationIntervalId = setInterval(updateLocation, 300000); // 5 minutes

      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, 'true');
      
      console.log('Web: Location tracking started');
      return { success: true, message: 'Location tracking started (web)' };
    }

    // Native platform - use Expo Location with background task
    // Check if tracking is already running
    const isTaskRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTaskRunning) {
      return { success: true, message: 'Location tracking already running' };
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 300000, // 5 minutes
      distanceInterval: 100, // 100 meters
      foregroundService: {
        notificationTitle: 'Joylashuv kuzatilmoqda',
        notificationBody: 'Sizning joylashuvingiz kuzatilmoqda',
      },
    });

    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, 'true');

    return { success: true, message: 'Location tracking started' };
  } catch (error) {
    console.error('Error starting location tracking:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Stop location tracking
 */
export const stopLocationTracking = async () => {
  try {
    // Web platform - clear interval
    if (isWeb) {
      if (webLocationIntervalId) {
        clearInterval(webLocationIntervalId);
        webLocationIntervalId = null;
        console.log('Web: Location tracking interval cleared');
      }
      
      if (webLocationWatchSubscription) {
        // Clear watch if exists
        navigator.geolocation.clearWatch(webLocationWatchSubscription);
        webLocationWatchSubscription = null;
      }
      
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, 'false');
      return { success: true, message: 'Location tracking stopped' };
    }

    // Native platform - stop background task
    const isTaskRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTaskRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, 'false');

    return { success: true, message: 'Location tracking stopped' };
  } catch (error) {
    console.error('Error stopping location tracking:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Check if location tracking is enabled
 */
export const isLocationTrackingEnabled = async () => {
  try {
    const enabled = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    return enabled === 'true';
  } catch (error) {
    return false;
  }
};

/**
 * Get current location
 */
export const getCurrentLocation = async () => {
  try {
    // Web platform - use browser geolocation
    if (isWeb) {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ success: false, message: 'Geolocation is not supported by your browser' });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              success: true,
              location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy || 0,
              },
            });
          },
          (error) => {
            let message = 'Location permission denied';
            if (error.code === error.PERMISSION_DENIED) {
              message = 'Location permission denied by user';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              message = 'Location information is unavailable';
            } else if (error.code === error.TIMEOUT) {
              message = 'Location request timed out';
            }
            resolve({ success: false, message });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });
    }

    // Native platform - use Expo Location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, message: 'Location permission denied' };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      success: true,
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      },
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Sync location to server
 */
export const syncLocation = async (latitude, longitude) => {
  try {
    const sellerId = await AsyncStorage.getItem('seller_id');
    if (!sellerId) return;

    const online = await api.isOnline();
    if (!online) return;

    await api.post(API_ENDPOINTS.LOCATION.UPDATE(parseInt(sellerId)), {
      latitude,
      longitude,
    });
  } catch (error) {
    console.error('Error syncing location:', error);
  }
};

/**
 * Sync all unsynced locations
 */
export const syncAllLocations = async () => {
  try {
    const online = await api.isOnline();
    if (!online) return 0;

    const unsynced = await getUnsyncedLocations();
    const sellerId = await AsyncStorage.getItem('seller_id');
    if (!sellerId) return 0;

    let synced = 0;
    for (const location of unsynced) {
      try {
        await api.post(API_ENDPOINTS.LOCATION.UPDATE(parseInt(sellerId)), {
          latitude: location.latitude,
          longitude: location.longitude,
        });

        await markLocationSynced(location.id);
        synced++;
      } catch (error) {
        console.error('Error syncing location:', error);
      }
    }

    return synced;
  } catch (error) {
    console.error('Error syncing all locations:', error);
    return 0;
  }
};

/**
 * Check if within work hours
 */
export const isWithinWorkHours = async () => {
  try {
    // This should be fetched from server
    // For now, default to always true
    // TODO: Implement work schedule checking
    return true;
  } catch (error) {
    return true;
  }
};

export default {
  requestLocationPermissions,
  startLocationTracking,
  stopLocationTracking,
  isLocationTrackingEnabled,
  getCurrentLocation,
  syncLocation,
  syncAllLocations,
  isWithinWorkHours,
};

