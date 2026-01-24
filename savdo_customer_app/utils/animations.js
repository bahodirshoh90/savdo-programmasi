/**
 * Animation utilities for smooth transitions
 */
import { Animated } from 'react-native';

export const fadeIn = (value, duration = 300, delay = 0) => {
  return Animated.timing(value, {
    toValue: 1,
    duration,
    delay,
    useNativeDriver: true,
  });
};

export const fadeOut = (value, duration = 300) => {
  return Animated.timing(value, {
    toValue: 0,
    duration,
    useNativeDriver: true,
  });
};

export const slideUp = (value, from = 50, duration = 300, delay = 0) => {
  value.setValue(from);
  return Animated.timing(value, {
    toValue: 0,
    duration,
    delay,
    useNativeDriver: true,
  });
};

export const slideDown = (value, from = -50, duration = 300, delay = 0) => {
  value.setValue(from);
  return Animated.timing(value, {
    toValue: 0,
    duration,
    delay,
    useNativeDriver: true,
  });
};

export const scale = (value, from = 0.8, to = 1, duration = 300, delay = 0) => {
  value.setValue(from);
  return Animated.spring(value, {
    toValue: to,
    tension: 50,
    friction: 7,
    delay,
    useNativeDriver: true,
  });
};

export const pressScale = (value, to = 0.95) => {
  return Animated.spring(value, {
    toValue: to,
    tension: 300,
    friction: 10,
    useNativeDriver: true,
  });
};

export const releaseScale = (value) => {
  return Animated.spring(value, {
    toValue: 1,
    tension: 300,
    friction: 10,
    useNativeDriver: true,
  });
};
