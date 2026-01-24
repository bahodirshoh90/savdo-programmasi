/**
 * Custom hook for offline mode
 */
import { useState, useEffect, useCallback } from 'react';
import offlineService from '../services/offlineService';
import { useToast } from '../context/ToastContext';

export default function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const checkNetwork = async () => {
      const online = offlineService.isConnected();
      setIsOnline(online);
      
      if (online && !isSyncing) {
        setIsSyncing(true);
        try {
          await offlineService.syncAll();
        } catch (error) {
          console.error('Error syncing:', error);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isSyncing]);

  const loadWithCache = useCallback(async (key, fetchFn, maxAge) => {
    try {
      // Try to fetch fresh data
      if (isOnline) {
        try {
          const data = await fetchFn();
          await offlineService.cacheData(key, data);
          return { data, fromCache: false };
        } catch (error) {
          console.error('Error fetching fresh data:', error);
          // Fall back to cache
        }
      }

      // Load from cache
      const cachedData = await offlineService.getCachedData(key, maxAge);
      if (cachedData) {
        return { data: cachedData, fromCache: true };
      }

      return { data: null, fromCache: false };
    } catch (error) {
      console.error('Error loading with cache:', error);
      return { data: null, fromCache: false };
    }
  }, [isOnline]);

  const queueAction = useCallback(async (action, data) => {
    await offlineService.addToSyncQueue(action, data);
    if (!isOnline) {
      showToast('Offline rejimda. Internetga ulanilganda sinxronlashtiriladi', 'info');
    }
  }, [isOnline, showToast]);

  return {
    isOnline,
    isSyncing,
    loadWithCache,
    queueAction,
    cacheData: offlineService.cacheData.bind(offlineService),
    getCachedData: offlineService.getCachedData.bind(offlineService),
  };
}
