/**
 * Date utility functions for consistent date formatting
 */
import { format } from 'date-fns';

/**
 * Parse a date string or Date object and ensure it's a valid Date
 * Handles timezone issues by ensuring proper conversion to local time
 */
export const parseDate = (dateInput) => {
  if (!dateInput) return null;
  
  // If already a Date object, return it
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  
  // If string, parse it
  if (typeof dateInput === 'string') {
    // Handle ISO format strings (with or without timezone)
    let date = new Date(dateInput);
    
    // If parsing failed, try alternative formats
    if (isNaN(date.getTime())) {
      // Try removing timezone info and parsing as local
      const cleanDate = dateInput.replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '');
      date = new Date(cleanDate);
    }
    
    // Final validation
    if (isNaN(date.getTime())) {
      console.warn('Failed to parse date:', dateInput);
      return null;
    }
    
    return date;
  }
  
  return null;
};

/**
 * Format date to 'dd.MM.yyyy HH:mm' format in local timezone
 */
export const formatDateTime = (dateInput) => {
  const date = parseDate(dateInput);
  if (!date) return '-';
  
  try {
    return format(date, 'dd.MM.yyyy HH:mm');
  } catch (error) {
    console.warn('Error formatting date:', error);
    return dateInput?.toString() || '-';
  }
};

/**
 * Format date to 'dd.MM.yyyy' format
 */
export const formatDate = (dateInput) => {
  const date = parseDate(dateInput);
  if (!date) return '-';
  
  try {
    return format(date, 'dd.MM.yyyy');
  } catch (error) {
    console.warn('Error formatting date:', error);
    return dateInput?.toString() || '-';
  }
};

/**
 * Format time to 'HH:mm' format
 */
export const formatTime = (dateInput) => {
  const date = parseDate(dateInput);
  if (!date) return '-';
  
  try {
    return format(date, 'HH:mm');
  } catch (error) {
    console.warn('Error formatting time:', error);
    return '-';
  }
};

export default {
  parseDate,
  formatDateTime,
  formatDate,
  formatTime,
};

