/**
 * Responsive Design Utilities
 */
import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Breakpoints
export const BREAKPOINTS = {
  small: 360,   // Small phones
  medium: 414,  // Medium phones / small tablets
  large: 768,   // Tablets
  xlarge: 1024, // Large tablets / small desktops
};

// Check if device is tablet
export const isTablet = () => {
  return SCREEN_WIDTH >= BREAKPOINTS.large;
};

// Check if device is small phone
export const isSmallPhone = () => {
  return SCREEN_WIDTH < BREAKPOINTS.small;
};

// Responsive font sizes
export const getFontSize = (baseSize) => {
  if (isTablet()) {
    return baseSize * 1.2;
  }
  if (isSmallPhone()) {
    return baseSize * 0.9;
  }
  return baseSize;
};

// Responsive spacing
export const getSpacing = (baseSpacing) => {
  if (isTablet()) {
    return baseSpacing * 1.5;
  }
  if (isSmallPhone()) {
    return baseSpacing * 0.8;
  }
  return baseSpacing;
};

// Responsive width percentage
export const getWidth = (percentage) => {
  return (SCREEN_WIDTH * percentage) / 100;
};

// Responsive height percentage
export const getHeight = (percentage) => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

// Number of columns for grid layouts
export const getColumns = (baseColumns = 2) => {
  if (isTablet()) {
    return baseColumns + 1;
  }
  return baseColumns;
};

export default {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  BREAKPOINTS,
  isTablet,
  isSmallPhone,
  getFontSize,
  getSpacing,
  getWidth,
  getHeight,
  getColumns,
};
