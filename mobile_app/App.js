/**
 * Main App Component
 */
import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import OrdersScreen from './screens/OrdersScreen';
import CreateOrderScreen from './screens/CreateOrderScreen';
import ProductsScreen from './screens/ProductsScreen';
import CustomersScreen from './screens/CustomersScreen';
import ProfileScreen from './screens/ProfileScreen';
import ReceiptScreen from './screens/ReceiptScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminProductsScreen from './screens/AdminProductsScreen';
import AdminCustomersScreen from './screens/AdminCustomersScreen';
import AdminSalesScreen from './screens/AdminSalesScreen';
import AdminOrdersScreen from './screens/AdminOrdersScreen';
import AdminSellersScreen from './screens/AdminSellersScreen';
import AdminSettingsScreen from './screens/AdminSettingsScreen';

// Import services and context
import { AuthProvider, useAuth } from './context/AuthContext';
import { initDatabase } from './services/database';
import { isLoggedIn, login as authLogin } from './services/auth';
import { startLocationTracking, isLocationTrackingEnabled } from './services/location';
import { syncOfflineQueue } from './services/api';
import Colors from './constants/colors';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { permissions } = useAuth();
  
  // Helper function to check if user has permission
  const hasPermission = (permissionCode) => {
    return permissions && permissions.includes(permissionCode);
  };
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Bosh sahifa',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      {hasPermission('orders.view') && (
        <Tab.Screen
          name="OrdersTab"
          component={OrdersScreen}
          options={{
            tabBarLabel: 'Buyurtmalar',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" size={size} color={color} />
            ),
          }}
        />
      )}
      {hasPermission('products.view') && (
        <Tab.Screen
          name="ProductsTab"
          component={ProductsScreen}
          options={{
            tabBarLabel: 'Mahsulotlar',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube" size={size} color={color} />
            ),
          }}
        />
      )}
      {hasPermission('customers.view') && (
        <Tab.Screen
          name="CustomersTab"
          component={CustomersScreen}
          options={{
            tabBarLabel: 'Mijozlar',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="ProfileTab"
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
  const { isAuthenticated, isLoading, login } = useAuth();
  const [appLoading, setAppLoading] = useState(true);
  const navigationRef = useRef(null);
  const isNavigatorReady = useRef(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await initDatabase();

      // Start location tracking if enabled and authenticated
      if (isAuthenticated) {
        const trackingEnabled = await isLocationTrackingEnabled();
        if (trackingEnabled) {
          await startLocationTracking();
        }
        // Sync offline queue
        await syncOfflineQueue();
      }
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (!appLoading) {
        initializeApp();
      }
    } else {
      // When logged out, reset navigation only if navigator is ready
      // The Stack.Navigator conditional rendering will show Login screen
      // but we need to clear navigation history
      if (isNavigatorReady.current && navigationRef.current) {
        const resetNavigation = () => {
          try {
            console.log('Resetting navigation to Login screen...');
            const navigator = navigationRef.current;
            
            if (navigator && navigator.dispatch) {
              navigator.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
              console.log('Navigation reset successful');
            }
          } catch (error) {
            console.warn('Navigation reset error:', error);
            // Retry once after a delay
            setTimeout(() => {
              if (navigationRef.current && navigationRef.current.dispatch) {
                try {
                  navigationRef.current.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: 'Login' }],
                    })
                  );
                  console.log('Navigation reset successful (retry)');
                } catch (retryError) {
                  console.warn('Navigation reset retry failed:', retryError);
                }
              }
            }, 300);
          }
        };
        
        // Reset navigation after Navigator re-renders with Login screen
        setTimeout(resetNavigation, 200);
      }
    }
  }, [isAuthenticated, isLoading, appLoading]);

  if (appLoading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer 
      ref={navigationRef}
      onReady={() => {
        isNavigatorReady.current = true;
        console.log('NavigationContainer is ready');
      }}
    >
      <StatusBar style="auto" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: '#fff',
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
              name="CreateOrder"
              component={CreateOrderScreen}
              options={{ title: 'Yangi buyurtma' }}
            />
            <Stack.Screen
              name="Receipt"
              component={ReceiptScreen}
              options={{ title: 'Chek' }}
            />
            <Stack.Screen
              name="AdminDashboard"
              component={AdminDashboardScreen}
              options={{ title: 'Admin Statistika' }}
            />
            <Stack.Screen
              name="AdminProducts"
              component={AdminProductsScreen}
              options={{ title: 'Mahsulotlar' }}
            />
            <Stack.Screen
              name="AdminCustomers"
              component={AdminCustomersScreen}
              options={{ title: 'Mijozlar' }}
            />
            <Stack.Screen
              name="AdminSales"
              component={AdminSalesScreen}
              options={{ title: 'Sotuvlar' }}
            />
            <Stack.Screen
              name="AdminOrders"
              component={AdminOrdersScreen}
              options={{ title: 'Buyurtmalar' }}
            />
            <Stack.Screen
              name="AdminSellers"
              component={AdminSellersScreen}
              options={{ title: 'Sotuvchilar' }}
            />
            <Stack.Screen
              name="AdminSettings"
              component={AdminSettingsScreen}
              options={{ title: 'Sozlamalar' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

