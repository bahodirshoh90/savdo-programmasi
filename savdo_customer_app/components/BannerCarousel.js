/**
 * Banner Carousel Component for Customer App
 * Rotates through advertisement banners every 2 seconds
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Colors from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 200;
const ROTATION_INTERVAL = 2000; // 2 seconds

export default function BannerCarousel({ banners = [], onBannerPress }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (banners.length <= 1) return;

    // Auto-rotate banners
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % banners.length;
        
        // Scroll to next banner
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            x: nextIndex * SCREEN_WIDTH,
            animated: true,
          });
        }
        
        return nextIndex;
      });
    }, ROTATION_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [banners.length]);

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleBannerPress = (banner) => {
    if (onBannerPress) {
      onBannerPress(banner);
    }
  };

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="start"
      >
        {banners.map((banner, index) => (
          <TouchableOpacity
            key={banner.id || index}
            style={styles.bannerContainer}
            onPress={() => handleBannerPress(banner)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: banner.image_url || banner.image }}
              style={styles.bannerImage}
              resizeMode="cover"
              defaultSource={require('../assets/icon.png')}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dots indicator */}
      {banners.length > 1 && (
        <View style={styles.dotsContainer}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    backgroundColor: Colors.borderLight,
    position: 'relative',
  },
  bannerContainer: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
  },
  bannerImage: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    backgroundColor: Colors.surface,
    width: 24,
  },
});
