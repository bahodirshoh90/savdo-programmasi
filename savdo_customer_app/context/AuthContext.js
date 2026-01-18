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
          console.warn('Could not verify token, using cached data:', error);
        }
        
        // Fallback to cached data
        try {
          const userData = await getCurrentUser();
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
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
      setIsAuthenticated(false);
      setUser(null);
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
    try {
      await authLogout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
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
