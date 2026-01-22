/**
 * Draw.io Webview Preload Script
 *
 * This preload script runs before Draw.io loads in the webview.
 * Provides the `electron.request` API that Draw.io's ElectronApp.js expects,
 * enabling native File > Open, File > Save, and File > Export functionality.
 *
 * Supports:
 * - electron.request API for Draw.io native integration
 * - Ready detection (notifies when Draw.io editor is loaded)
 * - Export to PNG (returns base64-encoded image data)
 *
 * @see https://www.electronjs.org/docs/latest/api/webview-tag#preload
 * @see assets/drawio/src/main/webapp/js/diagramly/ElectronApp.js
 */

import { ipcRenderer, contextBridge } from 'electron';

// Log immediately to verify preload is executing
console.log('[DrawioPreload] Preload script starting...');

// Type declarations for DOM APIs (preload runs in renderer context)
/* eslint-disable @typescript-eslint/no-explicit-any */
interface DomElement {
  appendChild(child: any): void;
  remove(): void;
  textContent: string | null;
}

declare const document: {
  readyState: string;
  body: DomElement | null;
  head: DomElement | null;
  documentElement: DomElement;
  querySelector(selector: string): DomElement | null;
  createElement(tagName: string): any;
  addEventListener(type: string, listener: () => void): void;
};

declare const window: {
  editorUi?: any;
  App?: any;
};

declare class XMLSerializer {
  serializeToString(node: any): string;
}

declare class Blob {
  constructor(parts: any[], options: { type: string });
}

declare const URL: {
  createObjectURL(blob: any): string;
  revokeObjectURL(url: string): void;
};

declare class Image {
  width: number;
  height: number;
  src: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
}

/**
 * IPC channel for messages from Draw.io to the host renderer.
 */
const DRAWIO_CHANNEL = 'drawio:message';

/**
 * Find the Draw.io editor graph.
 * Tries multiple locations since Draw.io stores it differently in various modes.
 */
function findGraph(): any {
  // Try window.editorUi (set by Draw.io after initialization)
  if (window.editorUi?.editor?.graph) {
    console.log('[DrawioPreload] Found graph via window.editorUi');
    return window.editorUi.editor.graph;
  }

  // Try window.mxEditor (some standalone modes)
  const mxEditorRef = (window as any).mxEditor;
  if (mxEditorRef?.prototype?.graph) {
    console.log('[DrawioPreload] Found graph via mxEditor');
    return mxEditorRef.prototype.graph;
  }

  // Try finding the App instance
  const appRef = (window as any).App;
  if (appRef?.prototype?.editor?.graph) {
    console.log('[DrawioPreload] Found graph via App.prototype');
    return appRef.prototype.editor.graph;
  }

  // Try finding via DOM - look for the diagram container's data
  const diagramContainer = document.querySelector('.geDiagramContainer');
  if (diagramContainer) {
    // mxGraph stores a reference to itself on the container element
    const containerGraph = (diagramContainer as any).graph;
    if (containerGraph) {
      console.log('[DrawioPreload] Found graph via container element');
      return containerGraph;
    }
  }

  // Check for global Graph instances
  const graphRef = (window as any).graph;
  if (graphRef?.getSvg) {
    console.log('[DrawioPreload] Found global graph variable');
    return graphRef;
  }

  console.error('[DrawioPreload] Could not find graph in any location');
  return null;
}

/**
 * Export the current diagram as PNG.
 * Uses Draw.io's internal graph to generate the export.
 */
async function exportToPng(): Promise<string | null> {
  try {
    const graph = findGraph();
    if (!graph) {
      console.error('[DrawioPreload] Graph not available for export');
      return null;
    }

    // Get the SVG of the diagram
    const svgRoot = graph.getSvg(
      null, // background
      1, // scale
      0, // border
      false, // nocrop
      null, // crisp
      true, // ignoreSelection
      true, // showText
      null, // imgExport
      null, // linkTarget
      false // hasShadow
    );

    if (!svgRoot) {
      console.error('[DrawioPreload] Failed to get SVG');
      return null;
    }

    // Convert SVG to PNG using canvas
    const svgString = new XMLSerializer().serializeToString(svgRoot);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill with dark background to match theme
          ctx.fillStyle = '#1e1e1e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const pngData = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          resolve(pngData);
        } else {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch (error) {
    console.error('[DrawioPreload] Export error:', error);
    return null;
  }
}

/**
 * Open Draw.io's native export dialog.
 * Triggers the exportPng action in Draw.io's actions system.
 */
function openExportDialog(): void {
  if (!window.editorUi) {
    console.error('[DrawioPreload] EditorUi not available');
    return;
  }

  const ui = window.editorUi as any;
  if (ui.actions?.get('exportPng')) {
    ui.actions.get('exportPng').funct();
  } else {
    console.error('[DrawioPreload] exportPng action not available');
  }
}

/**
 * Send an electron.request to the host renderer via IPC.
 */
function handleElectronRequest(msg: any, requestId: number): void {
  ipcRenderer.sendToHost('drawio:electron-request', { requestId, msg });
}

/**
 * Pending request callbacks for electron.request API.
 */
interface PendingRequest {
  success: ((data: unknown) => void) | undefined;
  error: ((err: string) => void) | undefined;
}

let requestIdCounter = 0;
const pendingRequests = new Map<number, PendingRequest>();

/**
 * Set up the electron bridge using contextBridge (secure approach).
 * Exposes window.electron.request to the page context safely.
 */
function setupElectronBridge(): void {
  console.log('[DrawioPreload] Setting up electron bridge via contextBridge...');

  // Listen for responses from the host renderer
  ipcRenderer.on('drawio:electron-response', (_event, { requestId, data, error }) => {
    const pending = pendingRequests.get(requestId);
    if (pending) {
      pendingRequests.delete(requestId);
      if (error) {
        pending.error?.(error);
      } else {
        pending.success?.(data);
      }
    }
  });

  // Expose electron.request API via contextBridge (Electron's recommended approach)
  // Draw.io's ElectronApp.js expects window.electron.request to exist
  contextBridge.exposeInMainWorld('electron', {
    request: (msg: any, success?: (data: unknown) => void, error?: (err: string) => void) => {
      const requestId = ++requestIdCounter;
      pendingRequests.set(requestId, { success, error });
      handleElectronRequest(msg, requestId);
    },
  });

  console.log('[DrawioPreload] window.electron.request API ready (via contextBridge)');
}

/**
 * Set up ready detection polling.
 * Called after DOM is ready to start polling for Draw.io editor.
 */
function setupReadyDetection(): void {
  // Poll for Draw.io editor to be ready
  const checkReady = setInterval(() => {
    // Check for .geDiagramContainer which is the actual canvas container
    // This appears after Draw.io finishes loading, not during the landing page
    const canvas = document.querySelector('.geDiagramContainer');
    // Also verify the loading screen is gone
    const loadingText = document.body?.textContent?.includes('Loading...');

    if (canvas && !loadingText) {
      clearInterval(checkReady);
      console.log('[DrawioPreload] Draw.io editor is ready');
      ipcRenderer.sendToHost(DRAWIO_CHANNEL, JSON.stringify({ event: 'ready' }));
    }
  }, 200);

  // Timeout after 60 seconds
  setTimeout(() => {
    clearInterval(checkReady);
  }, 60000);
}

/**
 * Set up IPC message handlers.
 * Called immediately to be ready for messages.
 */
function setupIpcHandlers(): void {
  console.log('[DrawioPreload] Setting up IPC listener on channel:', DRAWIO_CHANNEL);
  ipcRenderer.on(DRAWIO_CHANNEL, async (_event, message) => {
    try {
      const data = typeof message === 'string' ? JSON.parse(message) : message;

      switch (data.action) {
        case 'export':
          if (data.format === 'png') {
            const pngData = await exportToPng();
            ipcRenderer.sendToHost(
              DRAWIO_CHANNEL,
              JSON.stringify({ event: 'export', format: 'png', data: pngData })
            );
          }
          break;

        case 'openExportDialog':
          openExportDialog();
          ipcRenderer.sendToHost(
            DRAWIO_CHANNEL,
            JSON.stringify({ event: 'exportDialogOpened' })
          );
          break;
      }
    } catch (error) {
      console.error('[DrawioPreload] Error handling message:', error);
      ipcRenderer.sendToHost(
        DRAWIO_CHANNEL,
        JSON.stringify({ event: 'error', error: String(error) })
      );
    }
  });
}

// Initialize IMMEDIATELY - bridge must be ready BEFORE Draw.io scripts run
// Preload scripts execute before page scripts, so this will be ready in time
setupElectronBridge();
setupIpcHandlers();
console.log('[DrawioPreload] Bridge initialized for standalone mode');

// Start ready detection after DOM is loaded (for polling .geDiagramContainer)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupReadyDetection);
} else {
  setupReadyDetection();
}
