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

// Type declarations for DOM APIs (preload runs in renderer context)
/* eslint-disable @typescript-eslint/no-explicit-any */
interface DomElement {
  appendChild(child: any): void;
  remove(): void;
  textContent: string | null;
  click(): void;
  focus(): void;
  value?: string;
  dispatchEvent(event: Event): boolean;
  getBoundingClientRect(): { x: number; y: number; width: number; height: number };
}

declare const document: {
  readyState: string;
  body: DomElement | null;
  head: DomElement | null;
  documentElement: DomElement;
  activeElement: DomElement | null;
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): DomElement[];
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
 * Send an electron.request to the main process.
 * This is called from the injected script via postMessage.
 */
function handleElectronRequest(msg: any, requestId: number): void {
  ipcRenderer.sendToHost('drawio:electron-request', { requestId, msg });
}

/**
 * Inject a script into the page context that provides window.electron.
 * This is necessary because context isolation separates preload and page contexts.
 * Draw.io's ElectronApp.js expects window.electron.request to be available.
 */
function injectElectronBridge(): void {
  // Set up message listener for requests from the injected script
  (window as any).addEventListener('message', (event: any) => {
    if (event.data?.type === 'cyrus-electron-request') {
      handleElectronRequest(event.data.msg, event.data.requestId);
    }
  });

  // Listen for responses from the host (via ipc-message)
  // The host will send these back via webview.send
  ipcRenderer.on('drawio:electron-response', (_event, { requestId, data, error }) => {
    // Forward to the page context via postMessage
    (window as any).postMessage({ type: 'cyrus-electron-response', requestId, data, error }, '*');
  });

  const script = `
    (function() {
      // Request ID counter and pending requests map
      var requestIdCounter = 0;
      var pendingRequests = {};

      // Listen for responses from preload script
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'cyrus-electron-response') {
          var pending = pendingRequests[event.data.requestId];
          if (pending) {
            delete pendingRequests[event.data.requestId];
            if (event.data.error) {
              if (pending.error) pending.error(event.data.error);
            } else {
              if (pending.success) pending.success(event.data.data);
            }
          }
        }
      });

      // Create the electron object that Draw.io expects
      window.electron = {
        request: function(msg, success, error) {
          var requestId = ++requestIdCounter;
          pendingRequests[requestId] = { success: success, error: error };
          window.postMessage({ type: 'cyrus-electron-request', requestId: requestId, msg: msg }, '*');
        }
      };

      console.log('[DrawioBridge] Exposed window.electron.request API');

      // Also hook into App.main to capture EditorUi instance
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
  console.log('[DrawioPreload] Injected electron bridge and hook script');
}

/**
 * Set up communication with the host renderer.
 * In standalone mode, Draw.io loads as a normal app.
 * We watch for the editor to be ready and notify the host.
 */
function setupBridge(): void {
  // Inject electron bridge and hook script into page context
  injectElectronBridge();

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

// ============================================================================
// Test Runner API (same pattern as main preload)
// ============================================================================

const POLL_INTERVAL = 100;

function waitForElement(
  selector: string,
  timeout: number,
  action: (el: any) => unknown
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    function poll() {
      const el = document.querySelector(selector);
      if (el) {
        resolve(action(el));
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Element not found: ${selector}`));
      } else {
        setTimeout(poll, POLL_INTERVAL);
      }
    }
    poll();
  });
}

/**
 * Click by text - polls until element with matching text is found.
 */
function clickByText(selector: string, text: string, timeout: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    function poll() {
      const elements = document.querySelectorAll(selector) as any;
      for (const el of elements) {
        if (el.textContent?.includes(text)) {
          el.click();
          resolve({ clicked: true, text: el.textContent });
          return;
        }
      }
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Element not found with text "${text}": ${selector}`));
      } else {
        setTimeout(poll, POLL_INTERVAL);
      }
    }
    poll();
  });
}

const webviewTestRunnerAPI = {
  click: (selector: string, timeout: number, text?: string) => {
    // Parse :has-text() pseudo-selector
    const match = selector.match(/^(.+):has-text\(['"](.+)['"]\)$/);
    if (match?.[1] && match[2]) {
      return clickByText(match[1], match[2], timeout);
    }
    if (text) {
      return clickByText(selector, text, timeout);
    }
    return waitForElement(selector, timeout, (el) => {
      el.click();
      return { clicked: true };
    });
  },

  type: (selector: string, timeout: number, text: string) =>
    waitForElement(selector, timeout, (el) => {
      const input = el as HTMLInputElement;
      input.focus();
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return { typed: true };
    }),

  hover: (selector: string, timeout: number) =>
    waitForElement(selector, timeout, (el) => {
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      return { hovered: true };
    }),

  assert: (selector: string, timeout: number, shouldExist: boolean) =>
    new Promise((resolve, reject) => {
      const startTime = Date.now();
      function check() {
        const el = document.querySelector(selector);
        const exists = el !== null;
        if (shouldExist && exists) {
          resolve({ asserted: true, exists: true });
        } else if (!shouldExist && !exists) {
          resolve({ asserted: true, exists: false });
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(
            shouldExist
              ? `Assert failed: element not found: ${selector}`
              : `Assert failed: element should not exist: ${selector}`
          ));
        } else {
          setTimeout(check, POLL_INTERVAL);
        }
      }
      check();
    }),

  getBounds: (selector: string) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  },

  keyboard: (key: string) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    });
    document.activeElement?.dispatchEvent(event);
    return { key };
  },

  evaluate: (code: string) => {
    const fn = new Function(`return (async () => { ${code} })();`);
    return fn();
  },
};

type WebviewTestCommand = {
  id: string;
  action: keyof typeof webviewTestRunnerAPI;
  args: unknown[];
};

type WebviewTestResponse = {
  success: boolean;
  result?: unknown;
  error?: string;
};

// Listen for test runner commands from host (main renderer)
ipcRenderer.on('__webviewTestRunner', async (_event, command: WebviewTestCommand) => {
  let response: WebviewTestResponse;
  try {
    const method = webviewTestRunnerAPI[command.action];
    if (!method) {
      throw new Error(`Unknown action: ${command.action}`);
    }
    const result = await (method as (...args: unknown[]) => unknown)(...command.args);
    response = { success: true, result };
  } catch (error) {
    response = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  ipcRenderer.sendToHost(`__webviewTestRunner:${command.id}`, response);
});

console.log('[DrawioPreload] Test runner API initialized');

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupBridge);
} else {
  setupBridge();
}
