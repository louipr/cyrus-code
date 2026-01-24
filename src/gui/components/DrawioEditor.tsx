/**
 * Draw.io Editor Component
 *
 * Embeds Draw.io diagram editor via Electron webview in standalone mode.
 * Uses a preload script that detects when Draw.io is ready.
 *
 * Architecture:
 * - Webview loads Draw.io in standalone mode (ui=dark&drafts=0)
 * - drawio-preload.ts polls for .geDiagramContainer to detect readiness
 * - Preload sends 'ready' event via ipcRenderer.sendToHost()
 * - Host receives ready event via webview's 'ipc-message' event
 *
 * @see electron/drawio-preload.ts
 */

import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { apiClient } from '../api-client';

/**
 * IPC channel name - must match drawio-preload.ts
 */
const DRAWIO_CHANNEL = 'drawio:message';

/**
 * IPC channel for electron.request API - must match drawio-preload.ts
 */
const ELECTRON_REQUEST_CHANNEL = 'drawio:electron-request';

interface DrawioEditorProps {
  /** File path to load (served via local HTTP server) */
  filePath?: string;
  /** Callback when diagram is saved (reserved for future use) */
  onSave?: (xml: string) => void;
}

/**
 * Methods exposed via ref for external control
 */
export interface DrawioEditorRef {
  /** Export the current diagram as PNG data URL */
  exportPng: () => Promise<string | null>;
  /** Open Draw.io's native export dialog */
  openExportDialog: () => Promise<void>;
  /** Check if editor is ready */
  isReady: () => boolean;
}

interface DrawioMessage {
  event: string;
  xml?: string;
  format?: string;
  data?: unknown;
  error?: string;
}

/**
 * Webview element interface for TypeScript
 * Subset of Electron.WebviewTag that we actually use
 */
interface WebviewElement extends HTMLElement {
  src: string;
  preload: string;
  send(channel: string, ...args: unknown[]): void;
}

/**
 * IPC message event from webview
 */
interface IpcMessageEvent {
  channel: string;
  args: unknown[];
}

/**
 * Pending IPC request type for promise resolution.
 */
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

export const DrawioEditor = forwardRef<DrawioEditorRef, DrawioEditorProps>(
  function DrawioEditor({ filePath, onSave }, ref): React.ReactElement {
  const [webviewElement, setWebviewElement] = useState<WebviewElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawioUrl, setDrawioUrl] = useState<string | null>(null);
  const [baseDrawioUrl, setBaseDrawioUrl] = useState<string | null>(null);
  const [preloadPath, setPreloadPath] = useState<string | null>(null);

  // Pending IPC requests waiting for response
  const pendingRequests = React.useRef<Map<string, PendingRequest>>(new Map());

  // Send IPC message and wait for response
  const sendDrawioMessage = useCallback((action: string, data?: Record<string, unknown>): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (!webviewElement) {
        reject(new Error('Webview not available'));
        return;
      }
      pendingRequests.current.set(action, { resolve, reject });
      webviewElement.send(DRAWIO_CHANNEL, JSON.stringify({ action, ...data }));
    });
  }, [webviewElement]);

  // Expose methods via ref for external control
  useImperativeHandle(ref, () => ({
    exportPng: async (): Promise<string | null> => {
      if (!webviewElement || !isReady) {
        console.warn('[DrawioEditor] Cannot export: editor not ready');
        return null;
      }

      try {
        const result = await sendDrawioMessage('export', { format: 'png' }) as { data: string | null };
        return result.data;
      } catch (err) {
        console.error('[DrawioEditor] PNG export failed:', err);
        return null;
      }
    },
    openExportDialog: async (): Promise<void> => {
      if (!webviewElement || !isReady) {
        console.warn('[DrawioEditor] Cannot open export dialog: editor not ready');
        return;
      }

      try {
        await sendDrawioMessage('openExportDialog');
      } catch (err) {
        console.error('[DrawioEditor] Failed to open export dialog:', err);
        throw err;
      }
    },
    isReady: () => isReady,
  }), [webviewElement, isReady, sendDrawioMessage]);

  // Fetch Draw.io URL and preload path from main process
  useEffect(() => {
    Promise.all([
      apiClient.diagram.getUrl(),
      apiClient.diagram.getPreloadPath(),
    ])
      .then(([baseUrl, preload]) => {
        setBaseDrawioUrl(baseUrl);
        setPreloadPath(preload);
        // Build URL with or without file to load
        updateDrawioUrl(baseUrl, filePath);
      })
      .catch((err: Error) => {
        console.error('[DrawioEditor] Failed to get Draw.io config:', err);
        setLoadError('Failed to get Draw.io configuration');
        setIsLoading(false);
      });
  }, []);

  // Update Draw.io URL when file path changes
  const updateDrawioUrl = (baseUrl: string, file?: string) => {
    let url = `${baseUrl}?ui=dark&drafts=0`;
    if (file) {
      // Use the local server's /diagram endpoint to serve the file
      const serverUrl = baseUrl.replace('/index.html', '');
      const diagramUrl = `${serverUrl}/diagram?path=${encodeURIComponent(file)}`;
      url = `${baseUrl}?ui=dark&drafts=0&url=${encodeURIComponent(diagramUrl)}`;
    }
    setDrawioUrl(url);
  };

  // Reload when filePath changes
  useEffect(() => {
    if (baseDrawioUrl && filePath) {
      setIsLoading(true);
      setIsReady(false);
      updateDrawioUrl(baseDrawioUrl, filePath);
    }
  }, [filePath, baseDrawioUrl]);

  // Timeout for initialization
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading && !isReady) {
        console.error('[DrawioEditor] Timeout waiting for Draw.io init event');
        setLoadError('Draw.io editor failed to initialize. Please try again.');
        setIsLoading(false);
      }
    }, 60000);

    return () => clearTimeout(timeoutId);
  }, [isLoading, isReady]);

  // Handle Draw.io message events
  const handleDrawioMessage = useCallback(
    (msg: DrawioMessage) => {
      switch (msg.event) {
        case 'ready':
          setIsReady(true);
          setIsLoading(false);
          break;

        case 'save':
          if (msg.xml && onSave) {
            onSave(msg.xml);
          }
          break;

        case 'export': {
          const pending = pendingRequests.current.get('export');
          if (pending) {
            pendingRequests.current.delete('export');
            pending.resolve({ data: msg.data });
          }
          break;
        }

        case 'exportDialogOpened': {
          const pending = pendingRequests.current.get('openExportDialog');
          if (pending) {
            pendingRequests.current.delete('openExportDialog');
            pending.resolve(undefined);
          }
          break;
        }

        case 'error': {
          // Reject all pending requests on error
          for (const [key, pending] of pendingRequests.current) {
            pending.reject(new Error(msg.error || 'Unknown error'));
            pendingRequests.current.delete(key);
          }
          break;
        }
      }
    },
    [onSave]
  );

  // Handle electron.request calls from Draw.io
  const handleElectronRequest = useCallback(
    async (requestId: number, msg: { action: string; [key: string]: unknown }) => {
      try {
        let responseData: unknown = null;

        switch (msg.action) {
          case 'getDocumentsFolder':
            // Return a reasonable default - Draw.io uses this for default save location
            responseData = '/tmp';
            break;

          case 'dirname': {
            // Extract directory from path
            const pathStr = msg.path as string;
            const lastSlash = pathStr.lastIndexOf('/');
            responseData = lastSlash > 0 ? pathStr.substring(0, lastSlash) : '/';
            break;
          }

          case 'showSaveDialog': {
            // Show save dialog and return the chosen path
            const defaultPath = msg.defaultPath as string || '/tmp/diagram.png';

            const result = await apiClient.shell.showSaveDialog({
              defaultPath: defaultPath,
              filters: msg.filters as { name: string; extensions: string[] }[] | undefined,
              title: 'Export Diagram',
            });

            if (result.success && result.data) {
              responseData = result.data;
            } else {
              responseData = null; // User cancelled
            }
            break;
          }

          case 'showOpenDialog': {
            // Use dialog API for opening files
            const result = await apiClient.diagram.open();
            if (result.success && result.data) {
              responseData = [result.data.path];
            } else {
              responseData = undefined; // User cancelled
            }
            break;
          }

          case 'writeFile': {
            // Write file data to the specified path
            const filePath = msg.path as string;
            const data = msg.data as string;
            const encoding = (msg.enc as string) === 'base64' ? 'base64' : 'utf-8';

            const result = await apiClient.shell.writeFile({
              path: filePath,
              data: data,
              encoding: encoding,
              source: 'ui',
            });

            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to write file');
            }
            responseData = true;
            break;
          }

          case 'readFile': {
            // For now, return error - files should be loaded via URL
            throw new Error('readFile not implemented - use URL loading');
          }

          default:
            console.warn('[DrawioEditor] Unhandled electron.request action:', msg.action);
            throw new Error(`Unknown action: ${msg.action}`);
        }

        // Send success response
        webviewElement?.send('drawio:electron-response', { requestId, data: responseData });
      } catch (error) {
        console.error('[DrawioEditor] electron.request error:', error);
        // Send error response
        webviewElement?.send('drawio:electron-response', {
          requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [webviewElement]
  );

  // Set up webview event handlers
  useEffect(() => {
    if (!webviewElement) return;

    const handleIpcMessage = (evt: IpcMessageEvent) => {
      // Handle drawio:message channel (ready, save events)
      if (evt.channel === DRAWIO_CHANNEL && evt.args.length > 0) {
        const data = evt.args[0];
        if (typeof data === 'string') {
          try {
            const msg: DrawioMessage = JSON.parse(data);
            handleDrawioMessage(msg);
          } catch {
            console.error('[DrawioEditor] Failed to parse message:', data);
          }
        }
      }

      // Handle drawio:electron-request channel (native Draw.io API)
      if (evt.channel === ELECTRON_REQUEST_CHANNEL && evt.args.length > 0) {
        const { requestId, msg } = evt.args[0] as { requestId: number; msg: { action: string } };
        handleElectronRequest(requestId, msg);
      }
    };

    const handleDidFailLoad = (evt: { errorCode: number; errorDescription: string }) => {
      console.error('[DrawioEditor] webview did-fail-load:', evt.errorCode, evt.errorDescription);
      setLoadError(`Failed to load: ${evt.errorDescription}`);
      setIsLoading(false);
    };

    // Add event listeners with proper type casting for webview-specific events
    webviewElement.addEventListener('ipc-message', handleIpcMessage as unknown as EventListener);
    webviewElement.addEventListener('did-fail-load', handleDidFailLoad as unknown as EventListener);

    return () => {
      webviewElement.removeEventListener('ipc-message', handleIpcMessage as unknown as EventListener);
      webviewElement.removeEventListener('did-fail-load', handleDidFailLoad as unknown as EventListener);
    };
  }, [webviewElement, handleDrawioMessage, handleElectronRequest]);

  // Callback ref to capture the webview element
  const webviewRefCallback = useCallback((node: HTMLElement | null) => {
    setWebviewElement(node as WebviewElement | null);
  }, []);

  return (
    <div style={styles.container} data-testid="diagram-editor">
      {isLoading && (
        <div style={styles.loading} data-testid="diagram-loading">
          <div style={styles.spinner} />
          <p>Loading Draw.io editor...</p>
        </div>
      )}
      {loadError && (
        <div style={styles.error}>
          <p>{loadError}</p>
          <button
            style={styles.retryButton}
            onClick={() => {
              setLoadError(null);
              setIsLoading(true);
              setIsReady(false);
              if (webviewElement && drawioUrl) {
                webviewElement.src = drawioUrl;
              }
            }}
          >
            Retry
          </button>
        </div>
      )}
      {drawioUrl && preloadPath && (
        <webview
          ref={webviewRefCallback}
          src={drawioUrl}
          preload={preloadPath}
          style={{
            ...styles.webview,
            opacity: isLoading ? 0 : 1,
          }}
          data-testid="diagram-webview"
        />
      )}
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#1e1e1e',
  },
  webview: {
    width: '100%',
    height: '100%',
    border: 'none',
    transition: 'opacity 0.3s ease-in-out',
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    color: '#808080',
    zIndex: 10,
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #3c3c3c',
    borderTopColor: '#0e639c',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    color: '#f48771',
    textAlign: 'center',
    padding: '20px',
    zIndex: 10,
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#0e639c',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default DrawioEditor;
