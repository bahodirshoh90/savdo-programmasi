/**
 * Cart Context for Customer App
 */
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { getProductPrice } from '../utils/pricing';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const { isAuthenticated, user } = useAuth();
  const lastCustomerIdRef = useRef(null);

  useEffect(() => {
    loadCart();
  }, []);

  // Reload cart when authentication state changes
  useEffect(() => {
    const checkCustomerChange = async () => {
      const customerId = await AsyncStorage.getItem('customer_id');
      if (customerId !== lastCustomerIdRef.current) {
        lastCustomerIdRef.current = customerId;
        await loadCart();
      } else if (!isAuthenticated && lastCustomerIdRef.current) {
        // User logged out
        lastCustomerIdRef.current = null;
        setCartItems([]);
      }
    };
    
    checkCustomerChange();
  }, [isAuthenticated]);

  const getCartKey = async () => {
    const customerId = await AsyncStorage.getItem('customer_id');
    return customerId ? `customer_cart_${customerId}` : 'customer_cart';
  };

  const loadCart = async () => {
    try {
      const cartKey = await getCartKey();
      const cartData = await AsyncStorage.getItem(cartKey);
      if (cartData) {
        setCartItems(JSON.parse(cartData));
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      setCartItems([]);
    }
  };

  const saveCart = async (items) => {
    try {
      const cartKey = await getCartKey();
      await AsyncStorage.setItem(cartKey, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = (product, quantity = 1) => {
    const changeAmount = Number(quantity) || 0;
    if (!product || !product.id || changeAmount === 0) {
      return;
    }

    setCartItems((prevItems) => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      
      let newItems;
      if (existingItem) {
        const newQuantity = (Number(existingItem.quantity) || 0) + changeAmount;
        if (newQuantity <= 0) {
          newItems = prevItems.filter(item => item.product.id !== product.id);
        } else {
          newItems = prevItems.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: newQuantity }
              : item
          );
        }
      } else {
        if (changeAmount > 0) {
          newItems = [...prevItems, { product, quantity: changeAmount }];
        } else {
          newItems = prevItems;
        }
      }

      saveCart(newItems);
      return newItems;
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prevItems) => {
      const newItems = prevItems.filter(item => item.product.id !== productId);
      saveCart(newItems);
      return newItems;
    });
  };

  const updateQuantity = (productId, quantity) => {
    const nextQuantity = Number(quantity) || 0;
    if (nextQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prevItems) => {
      const newItems = prevItems.map(item =>
        item.product.id === productId
          ? { ...item, quantity: nextQuantity }
          : item
      );
      saveCart(newItems);
      return newItems;
    });
  };

  const clearCart = async () => {
    setCartItems([]);
    try {
      const cartKey = await getCartKey();
      await AsyncStorage.removeItem(cartKey);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  };

  const getTotalAmount = () => {
    return cartItems.reduce((sum, item) => {
      const price = getProductPrice(item.product, user?.customer_type);
      return sum + (price * item.quantity);
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
