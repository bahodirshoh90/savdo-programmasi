/**
 * Animated View Component - Smooth animations
 */
import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

export default function AnimatedView({
  children,
  style,
  animationType = 'fadeIn',
  duration = 300,
  delay = 0,
  ...props
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation;

    switch (animationType) {
      case 'fadeIn':
        animation = Animated.timing(animatedValue, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        });
        break;

      case 'slideUp':
        animatedValue.setValue(50);
        animation = Animated.timing(animatedValue, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        });
        break;

      case 'slideDown':
        animatedValue.setValue(-50);
        animation = Animated.timing(animatedValue, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        });
        break;

      case 'scale':
        animatedValue.setValue(0.8);
        animation = Animated.spring(animatedValue, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay,
          useNativeDriver: true,
        });
        break;

      default:
        animation = Animated.timing(animatedValue, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        });
    }

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animationType, duration, delay]);

  const getAnimatedStyle = () => {
    switch (animationType) {
      case 'fadeIn':
        return {
          opacity: animatedValue,
        };

      case 'slideUp':
        return {
          opacity: animatedValue.interpolate({
            inputRange: [0, 50],
            outputRange: [1, 0],
          }),
          transform: [{ translateY: animatedValue }],
        };

      case 'slideDown':
        return {
          opacity: animatedValue.interpolate({
            inputRange: [-50, 0],
            outputRange: [0, 1],
          }),
          transform: [{ translateY: animatedValue }],
        };

      case 'scale':
        return {
          opacity: animatedValue,
          transform: [{ scale: animatedValue }],
        };

      default:
        return {
          opacity: animatedValue,
        };
    }
  };

  return (
    <Animated.View style={[style, getAnimatedStyle()]} {...props}>
      {children}
    </Animated.View>
  );
}
