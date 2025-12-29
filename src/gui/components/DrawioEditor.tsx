/**
 * Draw.io Editor Component
 *
 * Embeds Draw.io diagram editor via Electron webview using the embed mode.
 * Uses a preload script to establish proper IPC communication with Draw.io.
 *
 * Architecture:
 * - Webview loads Draw.io with embed mode parameters
 * - drawio-preload.ts runs before Draw.io, creating a fake window.opener
 * - Draw.io sends messages to window.opener.postMessage() which routes to IPC
 * - Host receives messages via webview's 'ipc-message' event
 * - Host sends messages via webview.send() which routes to window.postMessage()
 *
 * @see https://www.drawio.com/doc/faq/embed-mode
 * @see electron/drawio-preload.ts
 */

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api-client';

/**
 * IPC channel name - must match drawio-preload.ts
 */
const DRAWIO_CHANNEL = 'drawio:message';

interface DrawioEditorProps {
  /** Initial XML content to load */
  initialXml?: string;
  /** Callback when diagram is saved */
  onSave?: (xml: string) => void;
  /** Callback when diagram is exported */
  onExport?: (data: string, format: string) => void;
}

interface DrawioMessage {
  event: string;
  xml?: string;
  data?: string;
  format?: string;
  bounds?: { x: number; y: number; width: number; height: number };
  message?: string;
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
  onExport,
}: DrawioEditorProps): React.ReactElement {
  const [webviewElement, setWebviewElement] = useState<WebviewElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawioUrl, setDrawioUrl] = useState<string | null>(null);
  const [preloadPath, setPreloadPath] = useState<string | null>(null);
  const [pendingXml, setPendingXml] = useState<string | undefined>(initialXml);

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

  // Send message to Draw.io via IPC
  const sendMessage = useCallback(
    (msg: object) => {
      if (webviewElement && isReady) {
        const data = JSON.stringify(msg);
        console.log('[DrawioEditor] Sending message:', msg);
        webviewElement.send(DRAWIO_CHANNEL, data);
      }
    },
    [webviewElement, isReady]
  );

  // Load XML into the editor
  const loadXml = useCallback(
    (xml: string) => {
      sendMessage({
        action: 'load',
        xml,
        autosave: 1,
      });
    },
    [sendMessage]
  );

  // Handle Draw.io message events
  const handleDrawioMessage = useCallback(
    (msg: DrawioMessage, webview: WebviewElement) => {
      console.log('[DrawioEditor] Received message:', msg.event);

      switch (msg.event) {
        case 'ready':
          // Standalone mode: preload detected .geEditor element
          console.log('[DrawioEditor] Draw.io editor ready (standalone mode)');
          setIsReady(true);
          setIsLoading(false);
          break;

        case 'init': {
          // Embed mode: Draw.io sent init event
          console.log('[DrawioEditor] Editor initialized (embed mode)');
          setIsReady(true);
          setIsLoading(false);
          // Send load action directly - can't use sendMessage due to React closure
          // Draw.io requires a load action to finish initializing
          const xml = pendingXml || '';
          const loadMsg = JSON.stringify({ action: 'load', xml, autosave: 1 });
          console.log('[DrawioEditor] Sending load action');
          webview.send(DRAWIO_CHANNEL, loadMsg);
          if (pendingXml) {
            setPendingXml(undefined);
          }
          break;
        }

        case 'save':
          if (msg.xml && onSave) {
            onSave(msg.xml);
          }
          sendMessage({ action: 'status', modified: false });
          break;

        case 'exit':
          // User clicked exit - could trigger close behavior
          break;

        case 'export':
          if (msg.data && msg.format && onExport) {
            onExport(msg.data, msg.format);
          }
          break;

        case 'autosave':
          // Autosave triggered - can be used for draft saving
          break;

        case 'configure':
          console.log('[DrawioEditor] Configure requested');
          sendMessage({ action: 'configure', config: {} });
          break;
      }
    },
    [loadXml, onSave, onExport, sendMessage, pendingXml]
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
            handleDrawioMessage(msg, webviewElement);
          } catch {
            console.error('[DrawioEditor] Failed to parse message:', data);
          }
        }
      }
    };

    const handleDomReady = () => {
      console.log('[DrawioEditor] webview dom-ready');
    };

    const handleDidFinishLoad = () => {
      console.log('[DrawioEditor] webview did-finish-load');
    };

    const handleDidFailLoad = (evt: { errorCode: number; errorDescription: string }) => {
      console.error('[DrawioEditor] webview did-fail-load:', evt.errorCode, evt.errorDescription);
      setLoadError(`Failed to load: ${evt.errorDescription}`);
      setIsLoading(false);
    };

    const handleConsoleMessage = (evt: { message: string }) => {
      // Log webview console messages for debugging
      if (evt.message.includes('DrawioPreload')) {
        console.log('[DrawioEditor webview]', evt.message);
      }
    };

    // Add event listeners with proper type casting for webview-specific events
    webviewElement.addEventListener('ipc-message', handleIpcMessage as unknown as EventListener);
    webviewElement.addEventListener('dom-ready', handleDomReady as unknown as EventListener);
    webviewElement.addEventListener('did-finish-load', handleDidFinishLoad as unknown as EventListener);
    webviewElement.addEventListener('did-fail-load', handleDidFailLoad as unknown as EventListener);
    webviewElement.addEventListener('console-message', handleConsoleMessage as unknown as EventListener);

    return () => {
      webviewElement.removeEventListener('ipc-message', handleIpcMessage as unknown as EventListener);
      webviewElement.removeEventListener('dom-ready', handleDomReady as unknown as EventListener);
      webviewElement.removeEventListener('did-finish-load', handleDidFinishLoad as unknown as EventListener);
      webviewElement.removeEventListener('did-fail-load', handleDidFailLoad as unknown as EventListener);
      webviewElement.removeEventListener('console-message', handleConsoleMessage as unknown as EventListener);
    };
  }, [webviewElement, handleDrawioMessage]);

  // Update content when initialXml changes
  useEffect(() => {
    if (isReady && initialXml) {
      loadXml(initialXml);
    } else if (!isReady && initialXml) {
      setPendingXml(initialXml);
    }
  }, [initialXml, isReady, loadXml]);

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
