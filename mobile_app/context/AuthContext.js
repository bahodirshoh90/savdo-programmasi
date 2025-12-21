/**
 * Authentication Context
 */
import React, { createContext, useState, useEffect, useContext } from 'react';
import { isLoggedIn, getCurrentUser, logout as authLogout } from '../services/auth';

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
  const [permissions, setPermissions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const loggedIn = await isLoggedIn();
      if (loggedIn) {
        // Try to get fresh user data from /api/auth/me first
        try {
          const { verifyToken } = require('../services/auth');
          const tokenResult = await verifyToken();
          if (tokenResult.success && tokenResult.user) {
            setUser(tokenResult.user);
            setPermissions(tokenResult.user.permissions || []);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.warn('Could not verify token, using cached data:', error);
        }
        
        // Fallback to cached data
        const userData = await getCurrentUser();
        if (userData) {
          setUser(userData);
          setPermissions(userData.permissions || []);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData) => {
    setUser(userData);
    setPermissions(userData.permissions || []);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Logout initiated');
      
      // Stop location tracking
      try {
        const { stopLocationTracking } = require('../services/location');
        const isEnabled = await require('../services/location').isLocationTrackingEnabled();
        if (isEnabled) {
          await stopLocationTracking();
        }
      } catch (error) {
        console.warn('Error stopping location tracking on logout:', error);
      }
      
      // Perform logout API call first (but don't wait if it fails)
      try {
        await authLogout();
        console.log('AuthContext: Logout API call completed');
      } catch (error) {
        console.warn('Logout API error (ignoring):', error);
      }
      
      // Clear state AFTER API call to trigger navigation
      console.log('AuthContext: Clearing user state...');
      setUser(null);
      setPermissions([]);
      setIsAuthenticated(false);
      setIsLoading(false); // Ensure loading state is cleared
      console.log('AuthContext: User state cleared, isAuthenticated = false');
      
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      // Even if logout fails, clear local state
      setUser(null);
      setPermissions([]);
      setIsAuthenticated(false);
      setIsLoading(false);
      console.log('AuthContext: State cleared despite error');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
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

