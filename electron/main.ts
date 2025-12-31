/**
 * Electron Main Process
 *
 * Entry point for the cyrus-code desktop application.
 * Handles window creation, IPC communication, and backend service initialization.
 */

import { app, BrowserWindow, Menu, session, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
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
      webSecurity: false, // Allow cross-origin iframe communication (needed for embedded Draw.io)
      webviewTag: true, // Enable webview tag for embedding Draw.io
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

// Get MIME type for file
const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.xml': 'application/xml',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Get the path to Draw.io webapp files
const getDrawioPath = (): string => {
  // In development, files are in assets/drawio/src/main/webapp
  // In production, they would be bundled with the app
  return path.join(app.getAppPath(), 'assets', 'drawio', 'src', 'main', 'webapp');
};

// Local server port for Draw.io
let drawioServerPort = 0;

// Start local HTTP server for Draw.io files
const startDrawioServer = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://localhost`);

      // Handle /diagram endpoint - serves local .drawio files
      if (url.pathname === '/diagram') {
        const diagramPath = url.searchParams.get('path');
        if (!diagramPath || !fs.existsSync(diagramPath)) {
          res.writeHead(404);
          res.end('Diagram not found');
          return;
        }
        const content = fs.readFileSync(diagramPath);
        res.writeHead(200, {
          'Content-Type': 'application/xml',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(content);
        return;
      }

      let filePath = path.join(getDrawioPath(), url.pathname);

      // Default to index.html
      if (url.pathname === '/' || url.pathname === '') {
        filePath = path.join(getDrawioPath(), 'index.html');
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      // Read and serve file with permissive headers for iframe embedding
      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': getMimeType(filePath),
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors *",
      });
      res.end(content);
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        drawioServerPort = address.port;
        console.log(`[Draw.io] Local server started on port ${drawioServerPort}`);
        resolve(drawioServerPort);
      } else {
        reject(new Error('Failed to get server port'));
      }
    });

    server.on('error', reject);
  });
};

// Get the Draw.io URL (will be set after server starts)
export const getDrawioUrl = (): string => {
  return `http://127.0.0.1:${drawioServerPort}/index.html`;
};

// Initialize the application
app.whenReady().then(async () => {
  // Start local HTTP server for Draw.io
  try {
    await startDrawioServer();
    console.log(`[Draw.io] Server ready at ${getDrawioUrl()}`);
  } catch (err) {
    console.error('[Draw.io] Failed to start server:', err);
  }

  // IPC handler to get Draw.io URL
  ipcMain.handle('drawio:getUrl', () => {
    return getDrawioUrl();
  });

  // IPC handler to get Draw.io webview preload script path
  ipcMain.handle('drawio:getPreloadPath', () => {
    return `file://${path.join(__dirname, 'drawio-preload.js')}`;
  });

  // Configure Content Security Policy to allow local Draw.io server
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://127.0.0.1:*; " +
          "frame-src 'self' http://127.0.0.1:*; " +
          "connect-src 'self' http://127.0.0.1:* data:; " +
          "img-src 'self' data: blob: http://127.0.0.1:*; " +
          "style-src 'self' 'unsafe-inline' http://127.0.0.1:*; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://127.0.0.1:*;"
        ],
      },
    });
  });

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
