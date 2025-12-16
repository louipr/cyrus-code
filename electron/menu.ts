/**
 * Electron Application Menu
 *
 * Defines the application menu including the Help menu with topic shortcuts.
 */

import { Menu, shell, app, BrowserWindow } from 'electron';

/**
 * Create the application menu.
 * @param mainWindow - The main browser window for sending IPC messages
 */
export function createApplicationMenu(mainWindow: BrowserWindow | null): Menu {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // File menu
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const },
            ]),
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Contents',
          accelerator: 'F1',
          click: () => {
            mainWindow?.webContents.send('help:open');
          },
        },
        {
          label: 'Search...',
          accelerator: isMac ? 'Cmd+Shift+/' : 'Ctrl+Shift+/',
          click: () => {
            mainWindow?.webContents.send('help:search');
          },
        },
        { type: 'separator' },
        {
          label: 'Getting Started',
          click: () => {
            mainWindow?.webContents.send('help:topic', 'getting-started');
          },
        },
        {
          label: 'Terminology',
          click: () => {
            mainWindow?.webContents.send('help:topic', 'terminology');
          },
        },
        {
          label: 'Architecture Diagrams',
          click: () => {
            mainWindow?.webContents.send('help:topic', 'c4-container');
          },
        },
        { type: 'separator' },
        {
          label: 'View on GitHub',
          click: async () => {
            await shell.openExternal(
              'https://github.com/anthropics/cyrus-code'
            );
          },
        },
        { type: 'separator' },
        {
          label: 'About cyrus-code',
          click: () => {
            mainWindow?.webContents.send('help:about');
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
