/**
 * Draw.io Webview Preload Script
 *
 * This preload script runs before Draw.io loads in the webview.
 * In standalone mode (non-embed), we simply watch for Draw.io's
 * editor to become available and can optionally hook into save events.
 *
 * Supports:
 * - Ready detection (notifies when Draw.io editor is loaded)
 * - Export to PNG (returns base64-encoded image data)
 *
 * @see https://www.electronjs.org/docs/latest/api/webview-tag#preload
 */

import { ipcRenderer, contextBridge } from 'electron';

// Type declarations for DOM APIs (preload runs in renderer context)
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const document: {
  readyState: string;
  body: { textContent: string | null } | null;
  querySelector(selector: string): Element | null;
  createElement(tagName: string): any;
  addEventListener(type: string, listener: () => void): void;
};

declare const window: {
  editorUi?: any;
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
 * Export the current diagram as PNG.
 * Uses Draw.io's internal EditorUi to generate the export.
 */
async function exportToPng(): Promise<string | null> {
  try {
    const editorUi = window.editorUi;
    if (!editorUi || !editorUi.editor || !editorUi.editor.graph) {
      console.error('[DrawioPreload] EditorUi not available');
      return null;
    }

    const graph = editorUi.editor.graph;

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
 * Set up communication with the host renderer.
 * In standalone mode, Draw.io loads as a normal app.
 * We watch for the editor to be ready and notify the host.
 */
function setupBridge(): void {
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

  // Listen for export requests from the host
  console.log('[DrawioPreload] Setting up IPC listener on channel:', DRAWIO_CHANNEL);
  ipcRenderer.on(DRAWIO_CHANNEL, async (_event, message) => {
    console.log('[DrawioPreload] Received IPC message:', message);
    try {
      const data = typeof message === 'string' ? JSON.parse(message) : message;
      console.log('[DrawioPreload] Parsed message data:', JSON.stringify(data));
      if (data.action === 'export' && data.format === 'png') {
        console.log('[DrawioPreload] Export request received, calling exportToPng...');
        const pngData = await exportToPng();
        console.log('[DrawioPreload] Export result:', pngData ? 'PNG data received' : 'null');
        ipcRenderer.sendToHost(
          DRAWIO_CHANNEL,
          JSON.stringify({ event: 'export', format: 'png', data: pngData })
        );
        console.log('[DrawioPreload] Sent export response');
      }
    } catch (error) {
      console.error('[DrawioPreload] Error handling message:', error);
    }
  });

  // Expose export function to the webview's window object
  // This allows direct access from executeJavaScript
  try {
    contextBridge.exposeInMainWorld('drawioExport', {
      exportToPng,
    });
    console.log('[DrawioPreload] Export API exposed via contextBridge');
  } catch (e) {
    // contextBridge might not work in webview, fallback to window assignment
    (window as any).drawioExport = { exportToPng };
    console.log('[DrawioPreload] Export API exposed via window object');
  }

  console.log('[DrawioPreload] Bridge initialized for standalone mode');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupBridge);
} else {
  setupBridge();
}
