/**
 * Footer Component - Reusable footer for all screens
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import Colors from '../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Footer({ currentScreen = 'home' }) {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { cartItems } = useCart();
  const insets = useSafeAreaInsets();

  if (!isAuthenticated) {
    return null;
  }

  // Calculate total cart quantity
  const totalCartQuantity = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const navItems = [
    { id: 'home', icon: 'home-outline', activeIcon: 'home', label: 'Bosh sahifa', screen: 'Home' },
    { id: 'products', icon: 'cube-outline', activeIcon: 'cube', label: 'Mahsulotlar', screen: 'Products' },
    { id: 'cart', icon: 'cart-outline', activeIcon: 'cart', label: 'Savatcha', screen: 'Cart', badge: totalCartQuantity },
    { id: 'orders', icon: 'receipt-outline', activeIcon: 'receipt', label: 'Buyurtmalar', screen: 'Orders' },
    { id: 'reports', icon: 'bar-chart-outline', activeIcon: 'bar-chart', label: 'Hisobotlar', screen: 'Dashboard' },
    { id: 'profile', icon: 'person-outline', activeIcon: 'person', label: 'Profil', screen: 'Profile' },
  ];

  const handleNavigate = (screen) => {
    const currentScreenLower = currentScreen.toLowerCase();
    const screenLower = screen.toLowerCase();
    
    // If already on the same screen, don't navigate
    if (currentScreenLower === screenLower || 
        (currentScreenLower === 'products' && screenLower === 'productslist') ||
        (currentScreenLower === 'productslist' && screenLower === 'products')) {
      return;
    }
    
    try {
      // Direct navigation to MainTabs screens
      if (screen === 'Home' || screen === 'Products' || screen === 'Cart' || screen === 'Orders' || screen === 'Profile') {
        // Navigate to MainTabs with specific screen
        navigation.navigate('MainTabs', { screen });
      } else if (screen === 'Dashboard') {
        // Navigate to Dashboard screen (it's in root Stack)
        navigation.navigate('Dashboard');
      } else {
        // Fallback: try MainTabs
        navigation.navigate('MainTabs', { screen });
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Try alternative navigation methods
      try {
        // Try simple navigate first
        if (screen === 'Home' || screen === 'Products' || screen === 'Cart' || screen === 'Orders' || screen === 'Profile') {
          navigation.navigate('MainTabs', { screen });
        } else {
          navigation.navigate(screen);
        }
      } catch (e2) {
        console.error('Alternative navigation also failed:', e2);
      }
    }
  };

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {navItems.map((item) => {
        const isActive = currentScreen.toLowerCase() === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.footerItem, isActive && { backgroundColor: colors.primary + '10' }]}
            onPress={() => handleNavigate(item.screen)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={24}
                color={isActive ? colors.primary : colors.textLight}
              />
              {item.badge && item.badge > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.footerLabel,
                { color: isActive ? colors.primary : colors.textLight },
                isActive && styles.footerLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  footerItemActive: {
    opacity: 0.1,
  },
  footerLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  footerLabelActive: {
    fontWeight: '600',
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
