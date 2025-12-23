const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getApiUrl: () => ipcRenderer.invoke('get-api-url'),
  openAdmin: () => ipcRenderer.send('open-admin'),
  openSeller: () => ipcRenderer.send('open-seller'),
  openSettings: () => ipcRenderer.send('open-settings')
});

