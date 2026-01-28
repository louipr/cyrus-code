/**
 * Electron Preload Script
 *
 * Exposes a safe API to the renderer process via contextBridge.
 * This is the only way for the React frontend to communicate with
 * the main process (and thus the backend services).
 *
 * Security: contextIsolation is enabled, so renderer has no direct
 * access to Node.js or Electron APIs.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  ComponentSymbolDTO,
  SymbolQuery,
  ApiResponse,
  PaginatedResponse,
  ValidationResultDTO,
  DependencyGraphDTO,
  GraphStatsDTO,
  GenerateRequest,
  GenerateBatchRequest,
  PreviewRequest,
  GenerationOptionsDTO,
  GenerationResultDTO,
  GenerationBatchResultDTO,
  PreviewResultDTO,
  RegisterSymbolRequest,
} from '../src/api/types.js';
import type {
  HelpCategory,
  HelpGroup,
  HelpTopic,
  HelpSearchResult,
  C4Hierarchy,
  DocumentHeading,
} from '../src/domain/help/index.js';
import type {
  Macro,
  PlaybackConfig,
  SessionSnapshot,
  PlaybackEvent,
} from '../src/macro/index.js';
import { IPC_CHANNEL_TEST_RUNNER, POLL_INTERVAL_MS } from '../src/macro/index.js';
import type { MacroIndex, MacroEntry } from '../src/repositories/index.js';


/**
 * Type definitions for the exposed API.
 *
 * SYNC: This interface must match `CyrusAPI` in src/gui/api-client.ts
 * Any changes here must be reflected there, and vice versa.
 */
export interface CyrusAPI {
  // Symbol operations
  symbols: {
    list: (query?: SymbolQuery) => Promise<ApiResponse<PaginatedResponse<ComponentSymbolDTO>>>;
    get: (id: string) => Promise<ApiResponse<ComponentSymbolDTO>>;
    search: (query: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    resolve: (namespace: string, name: string, constraint?: string) => Promise<ApiResponse<ComponentSymbolDTO>>;
    getVersions: (namespace: string, name: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    register: (request: RegisterSymbolRequest) => Promise<ApiResponse<ComponentSymbolDTO>>;
    remove: (id: string) => Promise<ApiResponse<void>>;
  };
  // Relationship operations
  relationships: {
    findContains: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    findContainedBy: (id: string) => Promise<ApiResponse<ComponentSymbolDTO | null>>;
    getDependents: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    getDependencies: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
  };
  // Graph operations
  graph: {
    build: (symbolId?: string) => Promise<ApiResponse<DependencyGraphDTO>>;
    detectCycles: () => Promise<ApiResponse<string[][]>>;
    getStats: () => Promise<ApiResponse<GraphStatsDTO>>;
  };
  // Validation operations
  validation: {
    validate: () => Promise<ApiResponse<ValidationResultDTO>>;
    validateSymbol: (id: string) => Promise<ApiResponse<ValidationResultDTO>>;
    checkCircular: () => Promise<ApiResponse<string[][]>>;
  };
  // Status operations
  status: {
    findUnreachable: () => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    findUntested: () => Promise<ApiResponse<ComponentSymbolDTO[]>>;
  };
  // Synthesizer operations (code generation)
  synthesizer: {
    generate: (request: GenerateRequest) => Promise<ApiResponse<GenerationResultDTO>>;
    generateMultiple: (request: GenerateBatchRequest) => Promise<ApiResponse<GenerationBatchResultDTO>>;
    generateAll: (options: GenerationOptionsDTO) => Promise<ApiResponse<GenerationBatchResultDTO>>;
    preview: (request: PreviewRequest) => Promise<ApiResponse<PreviewResultDTO>>;
    listGeneratable: () => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    canGenerate: (symbolId: string) => Promise<ApiResponse<boolean>>;
  };
  // Dialog operations
  dialog: {
    selectDirectory: () => Promise<ApiResponse<string | null>>;
  };
  // Shell operations (file/folder actions)
  shell: {
    openPath: (filePath: string) => Promise<ApiResponse<void>>;
    showItemInFolder: (filePath: string) => Promise<ApiResponse<void>>;
    saveFile: (options: {
      data: string;
      defaultName?: string;
      filters?: { name: string; extensions: string[] }[];
      title?: string;
      source?: 'ui' | 'test' | 'api';
      sourcePath?: string;
    }) => Promise<ApiResponse<{ filePath: string; size: number } | null>>;
    showSaveDialog: (options: {
      defaultPath?: string;
      filters?: { name: string; extensions: string[] }[];
      title?: string;
    }) => Promise<ApiResponse<string | null>>;
    writeFile: (options: {
      path: string;
      data: string;
      encoding?: 'utf-8' | 'base64';
      source?: 'ui' | 'test' | 'api';
      sourcePath?: string;
    }) => Promise<ApiResponse<{ size: number }>>;
    getHomeDir: () => Promise<ApiResponse<string>>;
    getDownloadsDir: () => Promise<ApiResponse<string>>;
  };
  // Help operations
  help: {
    getCategories: () => Promise<ApiResponse<HelpCategory[]>>;
    getGroups: () => Promise<ApiResponse<HelpGroup[]>>;
    getTopics: () => Promise<ApiResponse<HelpTopic[]>>;
    getC4Hierarchy: () => Promise<ApiResponse<C4Hierarchy | null>>;
    getByCategory: (categoryId: string) => Promise<ApiResponse<HelpTopic[]>>;
    getTopic: (topicId: string) => Promise<ApiResponse<HelpTopic | undefined>>;
    search: (query: string) => Promise<ApiResponse<HelpSearchResult[]>>;
    getTopicContent: (topicId: string, format?: 'raw' | 'html') => Promise<ApiResponse<string>>;
    getTopicSubsections: (topicId: string) => Promise<ApiResponse<DocumentHeading[]>>;
    getAppVersion: () => Promise<ApiResponse<string>>;
    onOpen: (callback: () => void) => void;
    onSearch: (callback: () => void) => void;
    onTopic: (callback: (topicId: string) => void) => void;
    onAbout: (callback: () => void) => void;
  };
  // Diagram operations
  diagram: {
    getUrl: () => Promise<string>;
    getPreloadPath: () => Promise<string>;
    open: () => Promise<ApiResponse<{ path: string; xml: string } | null>>;
    save: (path: string, xml: string) => Promise<ApiResponse<string>>;
    saveAs: (xml: string) => Promise<ApiResponse<string | null>>;
    onNew: (callback: () => void) => void;
    onOpen: (callback: (path: string, xml: string) => void) => void;
    onExportPng: (callback: () => void) => void;
  };
  // Macro operations (macro record/playback)
  macros: {
    getIndex: () => Promise<ApiResponse<MacroIndex>>;
    getApps: () => Promise<ApiResponse<string[]>>;
    getByApp: (appId: string) => Promise<ApiResponse<MacroEntry[]>>;
    get: (appId: string, macroId: string) => Promise<ApiResponse<Macro | null>>;
    getByPath: (filePath: string) => Promise<ApiResponse<Macro | null>>;
    save: (appId: string, macroId: string, macro: Macro) => Promise<ApiResponse<void>>;
    // Playback session operations
    playback: {
      create: (config: PlaybackConfig) => Promise<ApiResponse<{ sessionId: string }>>;
      start: (sessionId: string) => Promise<ApiResponse<void>>;
      step: (sessionId: string) => Promise<ApiResponse<void>>;
      pause: (sessionId: string) => Promise<ApiResponse<void>>;
      resume: (sessionId: string) => Promise<ApiResponse<void>>;
      stop: (sessionId: string) => Promise<ApiResponse<void>>;
      snapshot: (sessionId: string) => Promise<ApiResponse<SessionSnapshot>>;
      subscribe: () => Promise<ApiResponse<void>>;
      onEvent: (callback: (data: { sessionId: string; event: PlaybackEvent }) => void) => void;
    };
  };
}

// Expose the API to the renderer
const cyrusAPI: CyrusAPI = {
  symbols: {
    list: (query) => ipcRenderer.invoke('symbols:list', query),
    get: (id) => ipcRenderer.invoke('symbols:get', id),
    search: (query) => ipcRenderer.invoke('symbols:search', query),
    resolve: (namespace, name, constraint) =>
      ipcRenderer.invoke('symbols:resolve', namespace, name, constraint),
    getVersions: (namespace, name) =>
      ipcRenderer.invoke('symbols:getVersions', namespace, name),
    register: (request) => ipcRenderer.invoke('symbols:register', request),
    remove: (id) => ipcRenderer.invoke('symbols:remove', id),
  },
  relationships: {
    findContains: (id) => ipcRenderer.invoke('relationships:findContains', id),
    findContainedBy: (id) => ipcRenderer.invoke('relationships:findContainedBy', id),
    getDependents: (id) => ipcRenderer.invoke('relationships:getDependents', id),
    getDependencies: (id) => ipcRenderer.invoke('relationships:getDependencies', id),
  },
  graph: {
    build: (symbolId) => ipcRenderer.invoke('graph:build', symbolId),
    detectCycles: () => ipcRenderer.invoke('graph:detectCycles'),
    getStats: () => ipcRenderer.invoke('graph:getStats'),
  },
  validation: {
    validate: () => ipcRenderer.invoke('validation:validate'),
    validateSymbol: (id) => ipcRenderer.invoke('validation:validateSymbol', id),
    checkCircular: () => ipcRenderer.invoke('validation:checkCircular'),
  },
  status: {
    findUnreachable: () => ipcRenderer.invoke('status:findUnreachable'),
    findUntested: () => ipcRenderer.invoke('status:findUntested'),
  },
  synthesizer: {
    generate: (request) => ipcRenderer.invoke('synthesizer:generate', request),
    generateMultiple: (request) => ipcRenderer.invoke('synthesizer:generateMultiple', request),
    generateAll: (options) => ipcRenderer.invoke('synthesizer:generateAll', options),
    preview: (request) => ipcRenderer.invoke('synthesizer:preview', request),
    listGeneratable: () => ipcRenderer.invoke('synthesizer:listGeneratable'),
    canGenerate: (symbolId) => ipcRenderer.invoke('synthesizer:canGenerate', symbolId),
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },
  shell: {
    openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
    showItemInFolder: (filePath) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
    saveFile: (options) => ipcRenderer.invoke('shell:saveFile', options),
    showSaveDialog: (options) => ipcRenderer.invoke('shell:showSaveDialog', options),
    writeFile: (options) => ipcRenderer.invoke('shell:writeFile', options),
    getHomeDir: () => ipcRenderer.invoke('shell:getHomeDir'),
    getDownloadsDir: () => ipcRenderer.invoke('shell:getDownloadsDir'),
  },
  help: {
    getCategories: () => ipcRenderer.invoke('help:getCategories'),
    getGroups: () => ipcRenderer.invoke('help:getGroups'),
    getTopics: () => ipcRenderer.invoke('help:getTopics'),
    getC4Hierarchy: () => ipcRenderer.invoke('help:getC4Hierarchy'),
    getByCategory: (categoryId) => ipcRenderer.invoke('help:getByCategory', categoryId),
    getTopic: (topicId) => ipcRenderer.invoke('help:getTopic', topicId),
    search: (query) => ipcRenderer.invoke('help:search', query),
    getTopicContent: (topicId, format = 'raw') =>
      ipcRenderer.invoke('help:getTopicContent', topicId, format),
    getTopicSubsections: (topicId) => ipcRenderer.invoke('help:getTopicSubsections', topicId),
    getAppVersion: () => ipcRenderer.invoke('help:getAppVersion'),
    // Event listeners for menu actions
    onOpen: (callback) => {
      ipcRenderer.on('help:open', callback);
    },
    onSearch: (callback) => {
      ipcRenderer.on('help:search', callback);
    },
    onTopic: (callback) => {
      ipcRenderer.on('help:topic', (_event, topicId: string) => callback(topicId));
    },
    onAbout: (callback) => {
      ipcRenderer.on('help:about', callback);
    },
  },
  diagram: {
    getUrl: () => ipcRenderer.invoke('drawio:getUrl'),
    getPreloadPath: () => ipcRenderer.invoke('drawio:getPreloadPath'),
    open: () => ipcRenderer.invoke('diagram:open'),
    save: (path, xml) => ipcRenderer.invoke('diagram:save', path, xml),
    saveAs: (xml) => ipcRenderer.invoke('diagram:saveAs', xml),
    onNew: (callback) => {
      ipcRenderer.on('diagram:new', callback);
    },
    onOpen: (callback) => {
      ipcRenderer.on('diagram:open-file', (_event, path: string, xml: string) => callback(path, xml));
    },
    onExportPng: (callback) => {
      ipcRenderer.on('diagram:export-png', callback);
    },
  },
  macros: {
    getIndex: () => ipcRenderer.invoke('macros:index'),
    getApps: () => ipcRenderer.invoke('macros:apps'),
    getByApp: (appId) => ipcRenderer.invoke('macros:byApp', appId),
    get: (appId, macroId) => ipcRenderer.invoke('macros:get', appId, macroId),
    getByPath: (filePath) => ipcRenderer.invoke('macros:getByPath', filePath),
    save: (appId, macroId, macro) =>
      ipcRenderer.invoke('macros:save', appId, macroId, macro),
    playback: {
      create: (config) => ipcRenderer.invoke('macros:playback:create', config),
      start: (sessionId) => ipcRenderer.invoke('macros:playback:start', sessionId),
      step: (sessionId) => ipcRenderer.invoke('macros:playback:step', sessionId),
      pause: (sessionId) => ipcRenderer.invoke('macros:playback:pause', sessionId),
      resume: (sessionId) => ipcRenderer.invoke('macros:playback:resume', sessionId),
      stop: (sessionId) => ipcRenderer.invoke('macros:playback:stop', sessionId),
      snapshot: (sessionId) => ipcRenderer.invoke('macros:playback:snapshot', sessionId),
      subscribe: () => ipcRenderer.invoke('macros:playback:subscribe'),
      onEvent: (callback) => {
        ipcRenderer.on('macros:playback:event', (_event, data) => callback(data));
      },
    },
  },
};

contextBridge.exposeInMainWorld('cyrus', cyrusAPI);

// ============================================================================
// Test Runner API - DOM manipulation for test automation
// ============================================================================

/**
 * Wait until an element is found, then execute action.
 */
function waitForElement(
  selector: string,
  timeout: number,
  action: (el: Element) => unknown
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
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    }
    poll();
  });
}

/**
 * Click by text - polls until element with matching text is found.
 */
function clickByText(selector: string, text: string, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    function poll() {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (el.textContent?.includes(text)) {
          (el as HTMLElement).click();
          resolve();
          return;
        }
      }
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Element not found with text "${text}": ${selector}`));
      } else {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    }
    poll();
  });
}

const testRunnerAPI = {
  click: (selector: string, timeout: number, text?: string): Promise<void> => {
    // Parse :has-text() pseudo-selector
    const match = selector.match(/^(.+):has-text\(['"](.+)['"]\)$/);
    if (match?.[1] && match[2]) {
      return clickByText(match[1], match[2], timeout);
    }
    if (text) {
      return clickByText(selector, text, timeout);
    }
    return waitForElement(selector, timeout, (el) => {
      (el as HTMLElement).click();
    }) as Promise<void>;
  },

  type: (selector: string, timeout: number, text: string): Promise<void> =>
    waitForElement(selector, timeout, (el) => {
      const input = el as HTMLInputElement;
      input.focus();
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }) as Promise<void>,

  assert: (selector: string, timeout: number, shouldExist: boolean): Promise<{ exists: boolean }> =>
    new Promise((resolve, reject) => {
      const startTime = Date.now();
      function check() {
        const el = document.querySelector(selector);
        const exists = el !== null;
        if (shouldExist && exists) {
          resolve({ exists: true });
        } else if (!shouldExist && !exists) {
          resolve({ exists: false });
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(
            shouldExist
              ? `Assert failed: element not found: ${selector}`
              : `Assert failed: element should not exist: ${selector}`
          ));
        } else {
          setTimeout(check, POLL_INTERVAL_MS);
        }
      }
      check();
    }),

  // Note: evaluate action is handled directly by step-executor using
  // webContents.executeJavaScript() to bypass contextIsolation restrictions.
};

// ============================================================================
// IPC-based test runner (player invokes via webContents.send)
// ============================================================================

type TestRunnerCommand = {
  id: string;
  action: string;
  args: unknown[];
  context?: string; // undefined = main DOM, string = webview selector
};

type TestRunnerResponse = {
  success: boolean;
  result?: unknown;
  error?: string;
};

ipcRenderer.on(IPC_CHANNEL_TEST_RUNNER, async (_event, command: TestRunnerCommand) => {
  // Route to webview if context is specified
  if (command.context) {
    forwardToWebview(command);
    return;
  }

  // Execute locally in main DOM
  let response: TestRunnerResponse;
  try {
    const method = testRunnerAPI[command.action as keyof typeof testRunnerAPI];
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
  ipcRenderer.send(`${IPC_CHANNEL_TEST_RUNNER}:${command.id}`, response);
});

/**
 * Generate JavaScript code for webview execution.
 * Supports 'evaluate' and Draw.io-specific actions.
 */
function generateWebviewCode(action: string, args: unknown[]): string {
  if (action === 'evaluate') {
    const [code] = args as [string];
    return `(async () => { ${code} })()`;
  }

  if (action === 'drawio:insertVertex') {
    const [x, y, width, height, label, style] = args as [number, number, number, number, string | undefined, string | undefined];
    return `
      (function() {
        if (!window.editorUi || !window.editorUi.editor || !window.editorUi.editor.graph) {
          throw new Error('Draw.io graph not available');
        }

        const graph = window.editorUi.editor.graph;
        const parent = graph.getDefaultParent();

        graph.getModel().beginUpdate();
        try {
          const vertex = graph.insertVertex(
            parent,
            null,
            ${JSON.stringify(label || '')},
            ${x},
            ${y},
            ${width},
            ${height},
            ${JSON.stringify(style || '')}
          );
          return vertex.id;
        } finally {
          graph.getModel().endUpdate();
        }
      })()
    `;
  }

  throw new Error(`Unsupported webview action: ${action}`);
}

/**
 * Forward command to webview using executeJavaScript.
 * Eliminates need for IPC forwarding and test runner API in webview preload.
 */
function forwardToWebview(command: TestRunnerCommand): void {
  // Convert webview ID to data-testid selector if not already a selector
  let selector = command.context!;
  if (!selector.startsWith('[') && !selector.startsWith('#') && !selector.startsWith('.')) {
    selector = `[data-testid="${selector}"]`;
  }

  const webview = document.querySelector(selector) as HTMLElement & {
    executeJavaScript: (code: string) => Promise<unknown>;
  };

  if (!webview) {
    ipcRenderer.send(`${IPC_CHANNEL_TEST_RUNNER}:${command.id}`, {
      success: false,
      error: `Webview not found: ${selector} (original: ${command.context})`,
    });
    return;
  }

  const code = generateWebviewCode(command.action, command.args);

  webview
    .executeJavaScript(code)
    .then((result) => {
      ipcRenderer.send(`${IPC_CHANNEL_TEST_RUNNER}:${command.id}`, {
        success: true,
        result,
      });
    })
    .catch((error) => {
      ipcRenderer.send(`${IPC_CHANNEL_TEST_RUNNER}:${command.id}`, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });
}

// Type augmentation for window.cyrus
declare global {
  interface Window {
    cyrus: CyrusAPI;
  }
}
