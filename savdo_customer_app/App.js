/**
 * Main App Component for Customer App
 */
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initializeNotifications, removeNotificationListeners } from './services/notifications';
import { useAuth } from './context/AuthContext';

// Import screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ProductsScreen from './screens/ProductsScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import CartScreen from './screens/CartScreen';
import OrdersScreen from './screens/OrdersScreen';
import OrderDetailScreen from './screens/OrderDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import CompareProductsScreen from './screens/CompareProductsScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';
import NewChatScreen from './screens/NewChatScreen';
import PriceAlertsScreen from './screens/PriceAlertsScreen';
import DashboardScreen from './screens/DashboardScreen';
import PaymentHistoryScreen from './screens/PaymentHistoryScreen';
import ReferalScreen from './screens/ReferalScreen';
import LoyaltyScreen from './screens/LoyaltyScreen';

// Import context
import { AuthProvider} from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import Colors from './constants/colors';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Cart Icon with Badge Component
function CartIconWithBadge({ color, size }) {
  const { getTotalItems } = useCart();
  const count = getTotalItems();
  
  return (
    <View style={{ position: 'relative' }}>
      <Ionicons name="cart" size={size} color={color} />
      {count > 0 && (
        <View style={{
          position: 'absolute',
          right: -6,
          top: -6,
          backgroundColor: '#ff3b30',
          borderRadius: 10,
          width: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: 'white',
        }}>
          <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </View>
  );
}

// Products Stack Navigator (includes ProductsScreen and ProductDetailScreen)
function ProductsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.surface,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="ProductsList"
        component={ProductsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Mahsulot detallari' }}
      />
      <Stack.Screen
        name="CompareProducts"
        component={CompareProductsScreen}
        options={{ title: 'Mahsulotlarni Taqqoslash' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        headerShown: false,
        tabBarStyle: {
          display: 'none', // Hide Tab Navigator's tabBar, use Footer component instead
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Bosh sahifa',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsStack}
        options={{
          tabBarLabel: 'Mahsulotlar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: 'Savatcha',
          tabBarIcon: ({ color, size }) => (
            <CartIconWithBadge color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: 'Buyurtmalar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const navigationRef = useRef(null);
  const notificationSubscriptionsRef = useRef(null);

  useEffect(() => {
    // Initialize notifications when user is authenticated
    if (isAuthenticated && !isLoading) {
      initializeNotifications(navigationRef.current).then((result) => {
        if (result) {
          notificationSubscriptionsRef.current = result.subscriptions;
        }
      });
    }
    
    // Cleanup on unmount
    return () => {
      if (notificationSubscriptionsRef.current) {
        removeNotificationListeners(notificationSubscriptionsRef.current);
      }
    };
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.surface,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OrderDetail"
              component={OrderDetailScreen}
              options={{ title: 'Buyurtma detallari' }}
            />
            <Stack.Screen
              name="QRScanner"
              component={QRScannerScreen}
              options={{ title: 'QR Kod Skaner', headerShown: false }}
            />
            <Stack.Screen
              name="ChatList"
              component={ChatListScreen}
              options={{ title: t('support') || 'Yordam', headerShown: false }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ title: t('chat') || 'Suhbat', headerShown: false }}
            />
            <Stack.Screen
              name="NewChat"
              component={NewChatScreen}
              options={{ title: t('new_chat') || 'Yangi suhbat', headerShown: false }}
            />
            <Stack.Screen
              name="PriceAlerts"
              component={PriceAlertsScreen}
              options={{ title: 'Narx Eslatmalari' }}
            />
            <Stack.Screen
              name="PriceAlertCreate"
              component={PriceAlertsScreen}
              options={{ title: 'Narx Eslatmasi Qo\'shish' }}
            />
            <Stack.Screen
              name="PaymentHistory"
              component={PaymentHistoryScreen}
              options={{ title: 'To\'lov Tarixi' }}
            />
            <Stack.Screen
              name="Favorites"
              component={FavoritesScreen}
              options={{ title: 'Sevimli Mahsulotlar' }}
            />
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ title: 'Statistika' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <AppNavigator />
              <StatusBar style="auto" />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
