import { app, BrowserWindow, dialog, ipcMain, protocol, session } from 'electron';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveWallet, walletScheme, walletUrl } from './static.mjs';
import { readWallet, writeWallet } from './storage.mjs';
import { checkForDesktopUpdates } from './updates.mjs';

const root = fileURLToPath(new URL('../dist', import.meta.url));
const preload = fileURLToPath(new URL('./preload.cjs', import.meta.url));
const icon = fileURLToPath(new URL('./icon.ico', import.meta.url));

protocol.registerSchemesAsPrivileged([
  { scheme: walletScheme, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function createWindow(walletSession) {
  const window = new BrowserWindow({
    title: 'Castor Wallet',
    width: 1280,
    height: 850,
    minWidth: 375,
    minHeight: 520,
    backgroundColor: '#f6f7f4',
    icon,
    show: false,
    webPreferences: { session: walletSession, preload, nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('will-redirect', event => event.preventDefault());
  window.once('ready-to-show', () => window.show());
  window.loadURL(walletUrl).catch(() => {
    dialog.showErrorBox('Castor Wallet', 'Não foi possível abrir a carteira.');
    app.quit();
  });
}

function isWalletFrame(event) {
  const sender = event.senderFrame;
  return sender && sender === event.sender.mainFrame && sender.url.split('#')[0] === walletUrl;
}

// Finish each write before the corresponding edit is shown as saved.
function walletStorage(channel, operation) {
  ipcMain.on(channel, (event, data) => {
    try {
      if (!isWalletFrame(event)) throw new Error('Solicitação inválida.');
      event.returnValue = { ok: true, value: operation(app.getPath('userData'), data) };
    } catch {
      event.returnValue = { ok: false };
    }
  });
}

walletStorage('wallet:load', readWallet);
walletStorage('wallet:save', writeWallet);

ipcMain.handle('wallet:save-backup', async (event, filename, content) => {
  if (!isWalletFrame(event) ||
      typeof filename !== 'string' || !/^castor-wallet-\d{4}-\d{2}-\d{2}\.json$/.test(filename) ||
      typeof content !== 'string') {
    throw new Error('Exportação inválida.');
  }

  const window = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    title: 'Exportar backup do Castor Wallet',
    defaultPath: join(app.getPath('documents'), filename),
    filters: [{ name: 'Backup JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  await writeFile(filePath, content, 'utf8');
  return true;
});

app.whenReady().then(() => {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows();
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });
  const walletSession = session.fromPartition('wallet');
  walletSession.protocol.handle(walletScheme, request => serveWallet(request, root));
  walletSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  createWindow(walletSession);
  if (app.isPackaged && process.platform === 'win32') {
    import('electron-updater').then(({ default: { autoUpdater } }) => {
      checkForDesktopUpdates(autoUpdater, async version => {
        const window = BrowserWindow.getAllWindows()[0];
        if (!window) return false;
        const { response } = await dialog.showMessageBox(window, {
          type: 'info',
          title: 'Atualização do Castor Wallet',
          message: `A versão ${version} está pronta para instalar.`,
          detail: 'O Castor Wallet será reiniciado e abrirá com a sua carteira salva.',
          buttons: ['Atualizar e reiniciar', 'Agora não'],
          defaultId: 0,
          cancelId: 1,
        });
        return response === 0;
      });
    }).catch(error => console.warn('Não foi possível verificar atualizações.', error));
  }
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow(walletSession);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
