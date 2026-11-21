const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('castorDesktop', {
  loadWallet: () => ipcRenderer.sendSync('wallet:load'),
  saveWallet: wallet => ipcRenderer.sendSync('wallet:save', wallet),
  saveBackup: (filename, content) => ipcRenderer.invoke('wallet:save-backup', filename, content),
});
