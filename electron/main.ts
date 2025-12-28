/**
 * Electron Main Process
 *
 * Entry point for the cyrus-code desktop application.
 * Handles window creation, IPC communication, and backend service initialization.
 */

import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';
import { Architecture } from '../src/api/facade.js';
import { registerIpcHandlers } from './ipc-handlers.js';
import { createApplicationMenu } from './menu.js';

// Keep a global reference of the window object to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let facade: Architecture | null = null;

// Database path - use app data directory in production
const getDbPath = (): string => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'registry.db');
};

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for better-sqlite3
    },
    title: 'cyrus-code',
    backgroundColor: '#1e1e1e',
  });

  // Load the app
  if (process.env['VITE_DEV_SERVER_URL']) {
    // Development: load from Vite dev server
    mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL']);
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    mainWindow.loadFile(path.join(__dirname, '../gui/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize the application
app.whenReady().then(() => {
  // Initialize the architecture API
  const dbPath = getDbPath();
  console.log(`Initializing database at: ${dbPath}`);
  facade = Architecture.create(dbPath);

  // Register IPC handlers
  registerIpcHandlers(facade);

  // Create the main window
  createWindow();

  // Set application menu
  const menu = createApplicationMenu(mainWindow);
  Menu.setApplicationMenu(menu);

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up on app quit
app.on('before-quit', () => {
  if (facade) {
    facade.close();
    facade = null;
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
