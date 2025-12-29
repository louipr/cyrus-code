/**
 * Draw.io Webview Preload Script
 *
 * This preload script runs before Draw.io loads in the webview.
 * In standalone mode (non-embed), we simply watch for Draw.io's
 * editor to become available and can optionally hook into save events.
 *
 * @see https://www.electronjs.org/docs/latest/api/webview-tag#preload
 */

import { ipcRenderer } from 'electron';

// Type declarations for DOM APIs (preload runs in renderer context)
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const document: {
  readyState: string;
  body: { textContent: string | null } | null;
  querySelector(selector: string): Element | null;
  addEventListener(type: string, listener: () => void): void;
};

/**
 * IPC channel for messages from Draw.io to the host renderer.
 */
const DRAWIO_CHANNEL = 'drawio:message';

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

  console.log('[DrawioPreload] Bridge initialized for standalone mode');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupBridge);
} else {
  setupBridge();
}
