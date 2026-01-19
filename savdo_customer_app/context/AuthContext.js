/**
 * Authentication Context for Customer App
 */
import React, { createContext, useState, useEffect, useContext } from 'react';
import { isLoggedIn, getCurrentUser, logout as authLogout, verifyToken } from '../services/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const loggedIn = await isLoggedIn();
      if (loggedIn) {
        try {
          const tokenResult = await verifyToken();
          if (tokenResult?.success && tokenResult?.user) {
            setUser(tokenResult.user);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          // If 401, token might be expired, but check cached data first
          if (error.response?.status === 401) {
            console.warn('Token verification failed (401), using cached data');
          } else {
            console.warn('Could not verify token, using cached data:', error);
          }
        }
        
        // Fallback to cached data
        try {
          const userData = await getCurrentUser();
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } catch (cacheError) {
          console.warn('Could not get cached user data:', cacheError);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Still try cached data on error
      try {
        const userData = await getCurrentUser();
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (cacheError) {
        setIsAuthenticated(false);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData) => {
    // Ensure user data has required fields
    const normalizedUser = {
      customer_id: userData?.customer_id || userData?.id,
      name: userData?.name || userData?.customer_name,
      phone: userData?.phone,
      ...userData,
    };
    setUser(normalizedUser);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    console.log('[AUTH CONTEXT] Logout called');
    let storageCleared = false;
    let errorOccurred = null;
    
    try {
      console.log('[AUTH CONTEXT] Step 1: Clearing storage...');
      // Clear storage first
      const logoutResult = await authLogout();
      if (logoutResult && logoutResult.success === false) {
        const errorMsg = logoutResult.error || 'Storage tozalashda xatolik';
        console.error('[AUTH CONTEXT] Logout function returned error:', errorMsg);
        errorOccurred = new Error(errorMsg);
      } else {
        storageCleared = true;
        console.log('[AUTH CONTEXT] Step 2: Storage cleared successfully');
      }
    } catch (error) {
      console.error('[AUTH CONTEXT] Error clearing storage:', error);
      console.error('[AUTH CONTEXT] Error message:', error.message);
      console.error('[AUTH CONTEXT] Error stack:', error.stack);
      errorOccurred = error;
    } finally {
      console.log('[AUTH CONTEXT] Step 3: Clearing authentication state...');
      // Always clear state, even if storage clearing fails
      setUser(null);
      setIsAuthenticated(false);
      console.log('[AUTH CONTEXT] Step 4: Authentication state cleared, isAuthenticated is now false');
      
      if (!storageCleared) {
        console.warn('[AUTH CONTEXT] Warning: State cleared but storage clearing may have failed');
      }
    }
    
    // Throw error after state is cleared if there was an error
    if (errorOccurred) {
      throw errorOccurred;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
