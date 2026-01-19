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
const BANNER_HEIGHT = 220;
const DEFAULT_ROTATION_INTERVAL = 3000; // 3 seconds default

export default function BannerCarousel({ banners = [], onBannerPress, rotationInterval }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const intervalRef = useRef(null);

  // Use rotation_interval from first banner or prop, or default
  const interval = rotationInterval || (banners.length > 0 && banners[0].rotation_interval) || DEFAULT_ROTATION_INTERVAL;

  useEffect(() => {
    if (banners.length <= 1) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

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
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [banners.length, interval]);

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
    <View style={styles.wrapper}>
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
              activeOpacity={0.95}
            >
              <View style={styles.bannerImageWrapper}>
                <Image
                  source={{ uri: banner.image_url || banner.image }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                  onError={(error) => {
                    console.warn('Banner image failed to load:', {
                      bannerId: banner.id,
                      imageUrl: banner.image_url,
                      error: error.nativeEvent?.error || error
                    });
                  }}
                  onLoad={() => {
                    console.log('Banner image loaded successfully:', {
                      bannerId: banner.id,
                      imageUrl: banner.image_url
                    });
                  }}
                />
                {/* Gradient overlay for better text visibility if needed */}
                <View style={styles.gradientOverlay} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Dots indicator - Enhanced */}
        {banners.length > 1 && (
          <View style={styles.dotsContainer}>
            {banners.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  setCurrentIndex(index);
                  if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({
                      x: index * SCREEN_WIDTH,
                      animated: true,
                    });
                  }
                }}
                style={styles.dotWrapper}
              >
                <View
                  style={[
                    styles.dot,
                    index === currentIndex && styles.activeDot,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  container: {
    width: SCREEN_WIDTH - 32,
    height: BANNER_HEIGHT,
    backgroundColor: Colors.borderLight,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  bannerContainer: {
    width: SCREEN_WIDTH - 32,
    height: BANNER_HEIGHT,
  },
  bannerImageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)',
      },
      default: {
        // For native, we can't use gradient easily, so we'll use a semi-transparent overlay
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignSelf: 'center',
    maxWidth: 'auto',
  },
  dotWrapper: {
    padding: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    transition: 'all 0.3s ease',
  },
  activeDot: {
    backgroundColor: Colors.surface || '#fff',
    width: 28,
    height: 8,
    borderRadius: 4,
  },
});
