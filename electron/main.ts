import type { BrowserWindow as BrowserWindowType } from 'electron';
const { app, BrowserWindow, protocol, session } = require('electron') as typeof import('electron');
const path = require('path') as typeof import('path');
const fs = require('fs') as typeof import('fs');
import { registerIpcHandlers } from './ipc';

let mainWindow: BrowserWindowType | null = null;

// Register custom protocol for local files
function registerLocalFileProtocol(): void {
  protocol.registerFileProtocol('local-file', (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace('local-file://', ''));
    callback({ path: filePath });
  });
}

function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a',
    show: false
  });

  registerIpcHandlers(mainWindow);

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Register the local-file protocol before creating window
  registerLocalFileProtocol();
  
  // Set CSP to allow local-file:// protocol
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
          "media-src 'self' file: blob: local-file:; " +
          "img-src 'self' data: blob: file: local-file:;"
        ]
      }
    });
  });
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
