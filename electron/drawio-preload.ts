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
  __cyrusEditorUi?: any;
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
  // Try our captured EditorUi instance (set by hookAppMain)
  if ((window as any).__cyrusEditorUi?.editor?.graph) {
    console.log('[DrawioPreload] Found graph via __cyrusEditorUi');
    return (window as any).__cyrusEditorUi.editor.graph;
  }

  // Try window.editorUi (embed mode)
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
 * Inject a script into the page context to hook into App.main.
 * This is necessary because context isolation separates preload and page contexts.
 */
function injectHookScript(): void {
  const script = `
    (function() {
      var hookInterval = setInterval(function() {
        if (window.App && typeof window.App.main === 'function' && !window.__cyrusHooked) {
          window.__cyrusHooked = true;
          clearInterval(hookInterval);
          var originalMain = window.App.main;

          window.App.main = function(callback) {
            var wrappedCallback = function(ui) {
              console.log('[DrawioHook] Captured EditorUi instance');
              window.__cyrusEditorUi = ui;
              if (callback) {
                callback(ui);
              }
            };
            var args = Array.prototype.slice.call(arguments);
            args[0] = wrappedCallback;
            return originalMain.apply(this, args);
          };

          console.log('[DrawioHook] Hooked into App.main');
        }
      }, 20);

      // Stop trying after 30 seconds
      setTimeout(function() { clearInterval(hookInterval); }, 30000);
    })();
  `;

  // Inject the script into the page
  const scriptElement = document.createElement('script');
  scriptElement.textContent = script;
  (document.head || document.documentElement).appendChild(scriptElement);
  scriptElement.remove();
  console.log('[DrawioPreload] Injected hook script into page context');
}

/**
 * Set up communication with the host renderer.
 * In standalone mode, Draw.io loads as a normal app.
 * We watch for the editor to be ready and notify the host.
 */
function setupBridge(): void {
  // Inject hook script into page context to capture EditorUi instance
  injectHookScript();

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
