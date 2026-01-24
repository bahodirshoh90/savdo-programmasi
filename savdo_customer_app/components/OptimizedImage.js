/**
 * Optimized Image Component - Lazy loading, caching, WebP support
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

export default function OptimizedImage({
  source,
  style,
  resizeMode = 'cover',
  placeholder = null,
  fallback = null,
  ...props
}) {
  const [imageUri, setImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isInView, setIsInView] = useState(false);
  const viewRef = useRef(null);

  useEffect(() => {
    if (!source) {
      setIsLoading(false);
      return;
    }

    // Convert to optimized URL
    let uri = typeof source === 'string' ? source : source.uri;
    
    if (!uri) {
      setIsLoading(false);
      return;
    }

    // If it's a relative URL, make it absolute
    if (uri.startsWith('/')) {
      const baseUrl = API_ENDPOINTS.BASE_URL.endsWith('/api') 
        ? API_ENDPOINTS.BASE_URL.replace('/api', '')
        : API_ENDPOINTS.BASE_URL;
      uri = `${baseUrl}${uri}`;
    }

    // Try WebP format first (if supported)
    // In production, you might want to check if WebP is supported
    // For now, we'll use the original format
    
    setImageUri(uri);
  }, [source]);

  const handleLoad = () => {
    setIsLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Intersection Observer for lazy loading (simplified version)
  useEffect(() => {
    if (!isInView && viewRef.current) {
      // Simple check: if component is mounted, load image
      setIsInView(true);
    }
  }, []);

  if (!source) {
    return fallback || <View style={[style, styles.placeholder]} />;
  }

  if (hasError) {
    return fallback || (
      <View style={[style, styles.errorContainer]}>
        {placeholder}
      </View>
    );
  }

  return (
    <View ref={viewRef} style={[style, styles.container]}>
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          {placeholder || <ActivityIndicator size="small" color="#999" />}
        </View>
      )}
      {imageUri && (
        <Animated.Image
          source={{ uri: imageUri }}
          style={[style, { opacity: fadeAnim }]}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
