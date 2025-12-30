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

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api-client';

/**
 * IPC channel name - must match drawio-preload.ts
 */
const DRAWIO_CHANNEL = 'drawio:message';

interface DrawioEditorProps {
  /** Initial XML content to load (reserved for future use) */
  initialXml?: string;
  /** Callback when diagram is saved (reserved for future use) */
  onSave?: (xml: string) => void;
}

interface DrawioMessage {
  event: string;
  xml?: string;
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

export function DrawioEditor({
  initialXml,
  onSave,
}: DrawioEditorProps): React.ReactElement {
  const [webviewElement, setWebviewElement] = useState<WebviewElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawioUrl, setDrawioUrl] = useState<string | null>(null);
  const [preloadPath, setPreloadPath] = useState<string | null>(null);

  // Note: initialXml reserved for future embed mode integration
  void initialXml;

  // Fetch Draw.io URL and preload path from main process
  useEffect(() => {
    Promise.all([
      apiClient.diagram.getUrl(),
      apiClient.diagram.getPreloadPath(),
    ])
      .then(([baseUrl, preload]) => {
        // Load Draw.io in standalone mode (no embed) for simpler integration
        // The preload script notifies when Draw.io is ready via 'ready' event
        const url = `${baseUrl}?ui=dark&drafts=0`;
        console.log('[DrawioEditor] Using Draw.io URL:', url);
        console.log('[DrawioEditor] Using preload:', preload);
        setDrawioUrl(url);
        setPreloadPath(preload);
        // Note: isLoading remains true until we receive 'ready' event from preload
      })
      .catch((err: Error) => {
        console.error('[DrawioEditor] Failed to get Draw.io config:', err);
        setLoadError('Failed to get Draw.io configuration');
        setIsLoading(false);
      });
  }, []);

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

  // Handle Draw.io message events (standalone mode only sends 'ready')
  const handleDrawioMessage = useCallback(
    (msg: DrawioMessage) => {
      console.log('[DrawioEditor] Received message:', msg.event);

      switch (msg.event) {
        case 'ready':
          // Standalone mode: preload detected .geDiagramContainer element
          console.log('[DrawioEditor] Draw.io editor ready');
          setIsReady(true);
          setIsLoading(false);
          break;

        case 'save':
          // Reserved for future embed mode integration
          if (msg.xml && onSave) {
            onSave(msg.xml);
          }
          break;
      }
    },
    [onSave]
  );

  // Set up webview event handlers
  useEffect(() => {
    if (!webviewElement) return;

    const handleIpcMessage = (evt: IpcMessageEvent) => {
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
  }, [webviewElement, handleDrawioMessage]);

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
}

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

// Add keyframes for spinner animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default DrawioEditor;
