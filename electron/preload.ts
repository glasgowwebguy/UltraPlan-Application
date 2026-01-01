import { contextBridge } from 'electron';

// Expose minimal APIs to renderer for Electron-specific functionality
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
});
