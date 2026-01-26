/**
 * Home Screen for Customer App
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import BannerCarousel from '../components/BannerCarousel';
import api from '../services/api';
import API_CONFIG from '../config/api';
import Footer, { FooterAwareView } from '../components/Footer';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { getTotalItems } = useCart();
  const { colors } = useTheme();
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const response = await api.get('/banners?is_active=true');
      const activeBanners = Array.isArray(response) ? response : [];
      console.log('Loaded banners:', activeBanners.length, activeBanners);
      
      if (activeBanners.length === 0) {
        console.log('No active banners found');
        setBanners([]);
        return;
      }
      
      // Sort by display_order
      activeBanners.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      // Convert relative URLs to absolute URLs if needed
      const bannersWithUrls = activeBanners.map(banner => {
        let imageUrl = banner.image_url;
        
        // If image_url doesn't start with http, make it absolute
        if (imageUrl && !imageUrl.startsWith('http')) {
          // Static files are served from root, not /api
          // Remove /api from BASE_URL for static file URLs
          const baseUrl = API_CONFIG.BASE_URL.replace('/api', '').replace(/\/$/, '');
          
          // Ensure imageUrl starts with /
          if (!imageUrl.startsWith('/')) {
            imageUrl = '/' + imageUrl;
          }
          
          imageUrl = `${baseUrl}${imageUrl}`;
        }
        
        return {
          ...banner,
          image_url: imageUrl
        };
      });
      
      console.log('Processed banners with URLs:', bannersWithUrls);
      setBanners(bannersWithUrls);
    } catch (error) {
      console.error('Error loading banners:', error);
      // If banners fail to load, just use empty array
      setBanners([]);
    }
  };

  const handleBannerPress = (banner) => {
    // Handle banner click - can navigate to product or external URL
    console.log('Banner pressed:', banner);
    if (banner.link_url) {
      // Check if it's a product URL (format: /product/{id})
      const productUrlMatch = banner.link_url.match(/\/product\/(\d+)/);
      if (productUrlMatch) {
        const productId = parseInt(productUrlMatch[1], 10);
        console.log('Navigating to product:', productId);
        navigation.navigate('ProductDetail', { productId });
        return;
      }
      
      // Check if it's an external URL
      if (banner.link_url.startsWith('http')) {
        // In web: window.open, in native: Linking.openURL
        if (typeof window !== 'undefined' && window.open) {
          window.open(banner.link_url, '_blank');
        } else {
          // For native, use Linking
          const { Linking } = require('react-native');
          Linking.openURL(banner.link_url).catch(err => {
            console.error('Failed to open URL:', err);
          });
        }
        return;
      }
      
      // If it's a relative URL starting with /product/, try to extract product ID
      if (banner.link_url.startsWith('/product/')) {
        const productId = parseInt(banner.link_url.split('/product/')[1], 10);
        if (!isNaN(productId)) {
          console.log('Navigating to product from relative URL:', productId);
          navigation.navigate('ProductDetail', { productId });
          return;
        }
      }
    }
  };

  return (
    <FooterAwareView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Salom, {user?.name || 'Mijoz'}! 👋
          </Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>Xush kelibsiz</Text>
        </View>

        {/* Advertisement Banners */}
        {banners.length > 0 && (
          <BannerCarousel 
            banners={banners} 
            onBannerPress={handleBannerPress}
            rotationInterval={banners.length > 0 ? banners[0].rotation_interval : undefined}
          />
        )}

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Products')}
          >
            <Ionicons name="cube-outline" size={32} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Mahsulotlar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Cart')}
          >
            <Ionicons name="cart-outline" size={32} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Savatcha</Text>
            {getTotalItems() > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text style={[styles.badgeText, { color: Colors.surface }]}>{getTotalItems()}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Orders')}
          >
            <Ionicons name="list-outline" size={32} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Buyurtmalar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tezkor kirish</Text>
          <TouchableOpacity
            style={[styles.linkButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Products')}
          >
            <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.text }]}>Barcha mahsulotlarni ko'rish</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Footer currentScreen="home" />
    </FooterAwareView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 24,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
    // backgroundColor and borderColor set inline
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
});
