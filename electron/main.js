"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { app, BrowserWindow, protocol, session } = require('electron');
const path = require('path');
const fs = require('fs');
const ipc_1 = require("./ipc");
let mainWindow = null;
// Register custom protocol for local files
function registerLocalFileProtocol() {
    protocol.registerFileProtocol('local-file', (request, callback) => {
        const filePath = decodeURIComponent(request.url.replace('local-file://', ''));
        callback({ path: filePath });
    });
}
function isDev() {
    return process.env.NODE_ENV === 'development' || !app.isPackaged;
}
function createWindow() {
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
    (0, ipc_1.registerIpcHandlers)(mainWindow);
    if (isDev()) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
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
