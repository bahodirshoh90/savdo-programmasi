/**
 * Theme Context for Dark/Light Mode
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/colors';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const THEME_STORAGE_KEY = '@theme_preference';

// Light theme colors
const lightColors = {
  ...Colors,
  // Override with light theme specific colors
};

// Dark theme colors
const darkColors = {
  primary: '#6366f1', // Keep primary color
  secondary: '#64748b',
  background: '#0f172a', // Dark background
  surface: '#1e293b', // Dark surface
  text: '#f1f5f9', // Light text
  textDark: '#ffffff',
  textLight: '#94a3b8',
  border: '#334155',
  borderLight: '#1e293b',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  cardBg: '#1e293b',
  // Add any other colors
};

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState('system'); // 'light', 'dark', 'system'
  const [isDark, setIsDark] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update isDark when theme or systemTheme changes
  useEffect(() => {
    if (theme === 'system') {
      setIsDark(systemTheme === 'dark');
    } else {
      setIsDark(theme === 'dark');
    }
  }, [theme, systemTheme]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleTheme = async (newTheme) => {
    try {
      setTheme(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  const value = {
    theme,
    isDark,
    colors,
    toggleTheme,
    setTheme: toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
