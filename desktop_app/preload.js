const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object

contextBridge.exposeInMainWorld('electronAPI', {
  getApiUrl: () => ipcRenderer.invoke('get-api-url'),
  saveApiUrl: (url) => ipcRenderer.send('save-api-url', url),
  restartApp: () => ipcRenderer.send('restart-app'),
  openAdmin: () => ipcRenderer.send('open-admin'),
  openSeller: () => ipcRenderer.send('open-seller'),
  openSettings: () => ipcRenderer.send('open-settings'),
  printReceipt: (receiptHtml) => ipcRenderer.invoke('print-receipt', receiptHtml)
});

// Helper function to get image URL - expose it globally
contextBridge.exposeInMainWorld('getImageUrl', async (imageUrl) => {
  if (!imageUrl) return '';
  
  // If already absolute URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Get API URL from Electron
  try {
    const apiUrl = await ipcRenderer.invoke('get-api-url');
    // Extract base URL (remove /api suffix if present)
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    
    // Handle different image URL formats
    if (imageUrl.startsWith('/uploads')) {
      // Already has /uploads prefix
      return baseUrl + imageUrl;
    } else if (imageUrl.startsWith('/')) {
      // Absolute path starting with /
      return baseUrl + imageUrl;
    } else {
      // Just filename - add /uploads/products/ prefix
      return baseUrl + '/uploads/products/' + imageUrl;
    }
  } catch (error) {
    console.error('Error getting image URL:', error);
    // Fallback to default server
    const defaultBase = 'https://uztoysavdo.uz';
    if (imageUrl.startsWith('/uploads')) {
      return defaultBase + imageUrl;
    } else if (imageUrl.startsWith('/')) {
      return defaultBase + imageUrl;
    } else {
      return defaultBase + '/uploads/products/' + imageUrl;
    }
  }
});

// Expose SERVER_BASE for compatibility
contextBridge.exposeInMainWorld('SERVER_BASE', async () => {
  try {
    const apiUrl = await ipcRenderer.invoke('get-api-url');
    return apiUrl.replace(/\/api\/?$/, '');
  } catch (error) {
    return 'https://uztoysavdo.uz';
  }
});
