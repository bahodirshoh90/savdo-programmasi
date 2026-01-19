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
import BannerCarousel from '../components/BannerCarousel';
import api from '../services/api';
import API_CONFIG from '../config/api';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { getTotalItems } = useCart();
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const response = await api.get('/banners?is_active=true');
      const activeBanners = Array.isArray(response) ? response : [];
      // Sort by display_order
      activeBanners.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      // Convert relative URLs to absolute URLs if needed
      const bannersWithUrls = activeBanners.map(banner => ({
        ...banner,
        image_url: banner.image_url?.startsWith('http') 
          ? banner.image_url 
          : `${API_CONFIG.BASE_URL}${banner.image_url}`
      }));
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
      // Open external URL if provided
      if (banner.link_url.startsWith('http')) {
        // In web: window.open, in native: Linking.openURL
        if (typeof window !== 'undefined' && window.open) {
          window.open(banner.link_url, '_blank');
        }
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Salom, {user?.name || 'Mijoz'}! 👋
        </Text>
        <Text style={styles.subtitle}>Xush kelibsiz</Text>
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
          style={styles.actionCard}
          onPress={() => navigation.navigate('Products')}
        >
          <Ionicons name="cube-outline" size={32} color={Colors.primary} />
          <Text style={styles.actionText}>Mahsulotlar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Cart')}
        >
          <Ionicons name="cart-outline" size={32} color={Colors.primary} />
          <Text style={styles.actionText}>Savatcha</Text>
          {getTotalItems() > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getTotalItems()}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Orders')}
        >
          <Ionicons name="list-outline" size={32} color={Colors.primary} />
          <Text style={styles.actionText}>Buyurtmalar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-outline" size={32} color={Colors.primary} />
          <Text style={styles.actionText}>Profil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tezkor kirish</Text>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Products')}
        >
          <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
          <Text style={styles.linkText}>Barcha mahsulotlarni ko'rish</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: 24,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.surface,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textDark,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.danger,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 12,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkText: {
    marginLeft: 8,
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
});
