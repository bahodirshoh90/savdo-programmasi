/**
 * Banners Screen - Show active banners
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import API_CONFIG from '../config/api';
import Colors from '../constants/colors';
import Footer, { FooterAwareView } from '../components/Footer';

export default function BannersScreen({ navigation }) {
  const { colors } = useTheme();
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      if (!isRefreshing) {
        setIsLoading(true);
      }
      const response = await api.get('/banners?is_active=true');
      const items = Array.isArray(response) ? response : [];
      items.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      const normalized = items.map((banner) => {
        let imageUrl = banner.image_url;
        if (imageUrl && !imageUrl.startsWith('http')) {
          const baseUrl = API_CONFIG.BASE_URL.replace('/api', '').replace(/\/$/, '');
          if (!imageUrl.startsWith('/')) {
            imageUrl = `/${imageUrl}`;
          }
          imageUrl = `${baseUrl}${imageUrl}`;
        }
        return { ...banner, image_url: imageUrl };
      });

      setBanners(normalized);
    } catch (error) {
      console.error('Error loading banners:', error);
      setBanners([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadBanners();
  }, []);

  const handleBannerPress = (banner) => {
    if (!banner?.link_url) return;

    const productUrlMatch = banner.link_url.match(/\/product\/(\d+)/);
    if (productUrlMatch) {
      const productId = parseInt(productUrlMatch[1], 10);
      if (!Number.isNaN(productId)) {
        navigation.navigate('ProductDetail', { productId });
        return;
      }
    }

    if (banner.link_url.startsWith('http')) {
      if (typeof window !== 'undefined' && window.open) {
        window.open(banner.link_url, '_blank');
      } else {
        const { Linking } = require('react-native');
        Linking.openURL(banner.link_url).catch((err) => {
          console.error('Failed to open URL:', err);
        });
      }
    }
  };

  const renderBanner = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => handleBannerPress(item)}
      activeOpacity={0.8}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.background }]}>
          <Ionicons name="image-outline" size={40} color={colors.textLight} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title || 'Banner'}
        </Text>
        {item.link_url ? (
          <Text style={[styles.linkText, { color: colors.primary }]}>Havolani ochish</Text>
        ) : (
          <Text style={[styles.linkText, { color: colors.textLight }]}>Havola yo'q</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <FooterAwareView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Footer currentScreen="home" />
      </FooterAwareView>
    );
  }

  return (
    <FooterAwareView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Bannerlar</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>
          {banners.length} ta banner
        </Text>
      </View>

      <FlatList
        data={banners}
        renderItem={renderBanner}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              Hozircha bannerlar yo'q
            </Text>
          </View>
        }
      />

      <Footer currentScreen="home" />
    </FooterAwareView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.background,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
});
