/**
 * App Settings Context - customer app feature toggles
 */
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config/api';

const SETTINGS_STORAGE_KEY = 'app_settings';

const DEFAULT_SETTINGS = {
  enable_referals: true,
  enable_loyalty: true,
  enable_price_alerts: true,
  enable_favorites: true,
  enable_tags: true,
  enable_reviews: true,
  enable_location_selection: true,
  enable_offline_orders: true,
  referal_bonus_points: 100,
  referal_bonus_percent: 5,
  loyalty_points_per_sum: 0.01,
  loyalty_point_value: 1.0,
};

const AppSettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  refreshSettings: async () => {},
});

const normalizeSettings = (settings = {}) => ({
  ...DEFAULT_SETTINGS,
  ...settings,
});

const getSettingsUrl = () => {
  const baseUrl = API_CONFIG.BASE_URL.endsWith('/api')
    ? API_CONFIG.BASE_URL
    : `${API_CONFIG.BASE_URL}/api`;
  return `${baseUrl}/settings`;
};

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const loadCachedSettings = async () => {
    try {
      const cached = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setSettings(normalizeSettings(parsed));
        return true;
      }
    } catch (error) {
      console.warn('[SETTINGS] Error loading cached settings:', error);
    }
    return false;
  };

  const refreshSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(getSettingsUrl());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const normalized = normalizeSettings(data);
      setSettings(normalized);
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.warn('[SETTINGS] Failed to load settings from API:', error?.message || error);
      await loadCachedSettings();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const value = useMemo(
    () => ({
      settings,
      isLoading,
      refreshSettings,
    }),
    [settings, isLoading]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
