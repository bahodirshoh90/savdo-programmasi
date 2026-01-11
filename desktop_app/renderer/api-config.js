/**
 * API Configuration for Electron Desktop App
 * This file is injected into admin and seller panels to override API_BASE
 */

(function() {
  'use strict';

  // Get API URL from Electron or use default
  let API_BASE = 'https://uztoysavdo.uz/api';
  let SERVER_BASE = 'https://uztoysavdo.uz'; // Base server URL without /api
  
  // Function to extract server base from API URL
  function getServerBase(apiUrl) {
    if (!apiUrl) return 'https://uztoysavdo.uz';
    // Remove /api suffix if present
    if (apiUrl.endsWith('/api')) {
      return apiUrl.slice(0, -4);
    }
    // Check for /api/ in URL
    const apiIndex = apiUrl.indexOf('/api');
    if (apiIndex > 0) {
      return apiUrl.substring(0, apiIndex);
    }
    return apiUrl;
  }
  
  if (window.electronAPI) {
    // Running in Electron - get API URL from main process
    window.electronAPI.getApiUrl().then(url => {
      API_BASE = url;
      SERVER_BASE = getServerBase(url);
      // Override API_BASE in global scope
      if (typeof window !== 'undefined') {
        window.API_BASE = API_BASE;
        window.SERVER_BASE = SERVER_BASE;
        // Also update if already defined
        if (typeof API_BASE !== 'undefined') {
          window.API_BASE = API_BASE;
        }
      }
      console.log('API Base URL set to:', API_BASE);
      console.log('Server Base URL set to:', SERVER_BASE);
    }).catch(err => {
      console.error('Error getting API URL:', err);
      // Fallback to default
      API_BASE = 'https://uztoysavdo.uz/api ';
      SERVER_BASE = 'https://uztoysavdo.uz';
      window.API_BASE = API_BASE;
      window.SERVER_BASE = SERVER_BASE;
    });
  } else {
    // Not in Electron - use default or try to read from config
    try {
      const configPath = require('path').join(__dirname, 'config.json');
      const fs = require('fs');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        API_BASE = config.apiUrl || API_BASE;
        SERVER_BASE = getServerBase(API_BASE);
      }
    } catch (e) {
      // Ignore errors in non-Electron environment
    }
    window.API_BASE = API_BASE;
    window.SERVER_BASE = SERVER_BASE;
  }

  // Override fetch to prepend API_BASE for relative URLs
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    // If URL starts with /api, replace with full API_BASE
    if (typeof url === 'string' && url.startsWith('/api')) {
      // Wait for API_BASE to be set
      const apiBase = window.API_BASE || API_BASE;
      if (apiBase && !apiBase.startsWith('/')) {
        // Full URL - use as is
        url = apiBase + url.substring(4); // Remove '/api' prefix
      }
    }
    return originalFetch.call(this, url, options);
  };

  // Make API_BASE available globally
  Object.defineProperty(window, 'API_BASE', {
    get: function() {
      return API_BASE;
    },
    set: function(value) {
      API_BASE = value;
      SERVER_BASE = getServerBase(value);
    },
    configurable: true
  });
  
  // Make SERVER_BASE available globally (for image URLs)
  Object.defineProperty(window, 'SERVER_BASE', {
    get: function() {
      return SERVER_BASE;
    },
    set: function(value) {
      SERVER_BASE = value;
    },
    configurable: true
  });

  // Helper function to get full image URL
  window.getImageUrl = function(imageUrl) {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const serverBase = window.SERVER_BASE || SERVER_BASE || 'https://uztoysavdo.uz';
    if (imageUrl.startsWith('/')) {
      return serverBase + imageUrl;
    }
    return serverBase + '/' + imageUrl;
  };

})();

